import fhirpath from 'fhirpath';
import _, { lowerFirst, upperFirst } from 'lodash';
import isArray from 'lodash/isArray';
import isPlainObject from 'lodash/isPlainObject';
import queryString from 'query-string';
import { v4 as uuidv4 } from 'uuid';
import fhirpathR4BModel from 'fhirpath/fhir-context/r4';

import {
    Expression,
    Questionnaire,
    QuestionnaireItem,
    QuestionnaireItemAnswerOption,
    QuestionnaireItemEnableWhen,
    QuestionnaireItemInitial,
    QuestionnaireResponse,
    QuestionnaireResponseItem,
    QuestionnaireResponseItemAnswer,
} from 'fhir/r4b';

import {
    AnswerValue,
    FHIRAnswerValue,
    FormAnswerItems,
    FormGroupItems,
    FormItems,
    ItemContext,
    QuestionnaireResponseFormData,
    RepeatableFormGroupItems,
} from './types';
import { FCEQuestionnaire, FCEQuestionnaireItem } from './fce.types';

const FHIRPrimitiveTypes = [
    'base64Binary',
    'boolean',
    'canonical',
    'code',
    'date',
    'dateTime',
    'decimal',
    'id',
    'instant',
    'integer',
    'integer64',
    'markdown',
    'oid',
    'positiveInt',
    'string',
    'time',
    'unsignedInt',
    'uri',
    'url',
    'uuid',
];

export function wrapAnswerValue(type: QuestionnaireItem['type'], value: any): AnswerValue {
    // The returned value in internal answer format
    if (type === 'choice') {
        if (isPlainObject(value)) {
            return { Coding: value };
        } else {
            return { string: value };
        }
    }

    if (type === 'open-choice') {
        if (isPlainObject(value)) {
            return { Coding: value };
        } else {
            return { string: value };
        }
    }

    if (type === 'text') {
        return { string: value };
    }

    if (type === 'attachment') {
        return { Attachment: value };
    }

    if (type === 'reference') {
        return { Reference: value };
    }

    if (type === 'quantity') {
        return { Quantity: value };
    }

    return { [type]: value };
}

function buildEmptyQuestionnaireResponseItem(qItem: QuestionnaireItem): QuestionnaireResponseItem {
    return { linkId: qItem.linkId, ...(qItem.text ? { text: qItem.text } : {}) };
}

export type BranchItems = { qItem: QuestionnaireItem; qrItems: QuestionnaireResponseItem[] };

export function getBranchItems(
    fieldPath: string[],
    questionnaire: Questionnaire,
    questionnaireResponse: QuestionnaireResponse,
): BranchItems {
    // The purpose of this function is to extract qItem and qrItem
    // from original questionnaire and questionnaire response
    // that are located for fieldPath in FormItems internal structure
    // NOTE: fieldPath is always not empty because it's called on item level, not root
    let qrItem: QuestionnaireResponseItem | QuestionnaireResponse | undefined = questionnaireResponse;
    let qItem: QuestionnaireItem | Questionnaire = questionnaire;

    let i = 0;
    // TODO: check for question with sub items
    while (i < fieldPath.length) {
        const linkId = fieldPath[i];
        qItem = qItem.item!.find((curItem) => curItem.linkId === linkId)!;
        if (qrItem) {
            const qrItems: QuestionnaireResponseItem[] =
                qrItem.item?.filter((curItem) => curItem.linkId === linkId) ?? [];

            if (qItem.repeats) {
                // Index is located after 'items' in path
                // e.g. [firstLinkId, items, 1]
                // +2 from firstLinkId
                const index = i + 2 < fieldPath.length ? parseInt(fieldPath[i + 2]!, 10) : NaN;
                if (isNaN(index)) {
                    // Leaf, return all items for repeatable item

                    return {
                        qItem,
                        qrItems: qrItems.length
                            ? qrItems
                            : // Repeatable required group always have at least one visible group
                              // And any other repeatable item is visible
                              qItem.required || qItem.type !== 'group'
                              ? [buildEmptyQuestionnaireResponseItem(qItem)]
                              : [],
                    };
                }

                // Not leaf, move next moving down from the specified repeatable item
                qrItem = qrItems[index];
            } else {
                // For non-repeatable items, there's a single QR item
                qrItem = qrItems[0];
            }
        }

        if (qItem.repeats || qItem.type !== 'group') {
            // In repeating items we have index
            // e.g. [firstLinkId, items, 0, secondLinkId]
            // here we jump by 3 from firstLinkId to secondLinkId
            i += 3;
        } else {
            // In non-repeating groups we don't have index
            // e.g. [firstLinkId, items, secondLinkId]
            // here we jump by 2 from firstLinkId to secondLinkId
            i += 2;
        }
    }

    return {
        qItem,
        qrItems: qrItem ? [qrItem] : [buildEmptyQuestionnaireResponseItem(qItem as QuestionnaireItem)],
    } as BranchItems;
}

function isGroup(question: QuestionnaireItem) {
    return question.type === 'group';
}

function isFormGroupItems(
    question: QuestionnaireItem,
    answers: FormGroupItems | (FormAnswerItems | undefined)[],
): answers is FormGroupItems {
    return isGroup(question) && _.isPlainObject(answers);
}

function isRepeatableFormGroupItems(
    question: QuestionnaireItem,
    answers: FormGroupItems,
): answers is RepeatableFormGroupItems {
    return !!question.repeats && _.isArray(answers.items);
}

function hasSubAnswerItems(items?: FormItems): items is FormItems {
    return !!items && _.some(removeItemKey(items), (x) => !_.some(x, _.isEmpty));
}

function mapFormToResponseRecursive(
    answersItems: FormItems,
    questionnaireItems: QuestionnaireItem[],
): QuestionnaireResponseItem[] {
    return Object.entries(answersItems).reduce((acc, [linkId, answers]) => {
        if (!linkId) {
            /* c8 ignore next 3 */
            console.warn('The answer item has no linkId');
            return acc;
        }

        if (!answers) {
            return acc;
        }

        const question = questionnaireItems.filter((qItem) => qItem.linkId === linkId)[0];

        if (!question) {
            return acc;
        }

        if (isFormGroupItems(question, answers)) {
            const groups = isRepeatableFormGroupItems(question, answers)
                ? answers.items || []
                : answers.items
                  ? [answers.items]
                  : [];
            return groups.reduce((newAcc, group) => {
                const items = mapFormToResponseRecursive(group, question.item ?? []);

                return [
                    ...newAcc,
                    {
                        linkId,
                        ...(items.length ? { item: items } : {}),
                    },
                ];
            }, acc);
        }

        const qrItemAnswers = cleanFormAnswerItems(answers).reduce((answersAcc, answer) => {
            const items = hasSubAnswerItems(answer.items)
                ? mapFormToResponseRecursive(answer.items, question.item ?? [])
                : [];

            return [
                ...answersAcc,
                {
                    ...toFHIRAnswerValue(answer.value!, 'value'),
                    ...(items.length ? { item: items } : {}),
                },
            ];
        }, [] as QuestionnaireResponseItemAnswer[]);

        if (!qrItemAnswers.length) {
            return acc;
        }

        return [
            ...acc,
            {
                linkId,
                answer: qrItemAnswers,
            },
        ];
    }, [] as QuestionnaireResponseItem[]);
}

export function mapFormToResponse(
    values: FormItems,
    questionnaire: Questionnaire,
): Pick<QuestionnaireResponse, 'item'> {
    return {
        item: mapFormToResponseRecursive(values, questionnaire.item ?? []),
    };
}

export const ITEM_KEY = '_itemKey';
export function getItemKey(items: FormGroupItems | FormAnswerItems) {
    return (items as any)[ITEM_KEY];
}

export function removeItemKey<T extends FormGroupItems | FormAnswerItems>(items: T): T {
    const newItems = _.cloneDeep(items);
    delete (newItems as any)[ITEM_KEY];

    return newItems;
}

export function populateItemKey(items: FormGroupItems | FormAnswerItems) {
    if ((items as any)[ITEM_KEY]) {
        return items;
    }

    return {
        ...(items as any),
        [ITEM_KEY]: uuidv4(),
    };
}

function mapResponseToFormRecursive(
    questionnaireResponseItems: QuestionnaireResponseItem[],
    questionnaireItems: QuestionnaireItem[],
): FormItems {
    return questionnaireItems.reduce((acc, question) => {
        const { linkId, initial, repeats, text, required } = question;

        if (!linkId) {
            /* c8 ignore next 3 */
            console.warn('The question has no linkId');
            return acc;
        }

        const qrItems = questionnaireResponseItems.filter((qrItem) => qrItem.linkId === linkId) ?? [];

        if (isGroup(question)) {
            if (qrItems.length) {
                if (repeats) {
                    return {
                        ...acc,
                        [linkId]: {
                            question: text,
                            items: qrItems.map((qrItem) => {
                                return mapResponseToFormRecursive(qrItem.item ?? [], question.item ?? []);
                            }),
                        },
                    };
                } else {
                    return {
                        ...acc,
                        [linkId]: {
                            question: text,
                            items: mapResponseToFormRecursive(qrItems[0]?.item ?? [], question.item ?? []),
                        },
                    };
                }
            } else {
                if (repeats && required) {
                    return {
                        ...acc,
                        [linkId]: {
                            question: text,
                            items: [populateItemKey({})],
                        },
                    };
                }
            }
        }
        const answers: Array<{ value: AnswerValue | undefined; subItems: QuestionnaireResponseItem[] }> = qrItems?.[0]
            ?.answer?.length
            ? qrItems[0].answer.map(({ item, ...answer }) => ({
                  subItems: item ?? [],
                  value: toAnswerValue(answer, 'value'),
              }))
            : (initial ?? []).map((answer) => ({ value: toAnswerValue(answer, 'value'), subItems: [] }));

        if (!answers.length) {
            return acc;
        }

        return {
            ...acc,
            [linkId]: answers.map(({ value, subItems }) => ({
                question: text,
                value,
                ...(question.item?.length ? { items: mapResponseToFormRecursive(subItems, question.item ?? []) } : {}),
            })),
        };
    }, populateItemKey({}));
}

export function mapResponseToForm(resource: QuestionnaireResponse, questionnaire: Questionnaire) {
    return mapResponseToFormRecursive(resource.item ?? [], questionnaire.item ?? []);
}

export const ENABLE_WHEN_EXPRESSION_SUFFIX = '-enable-when-expression';

/** True when linkId is a virtual enableWhenExpression helper (from expandEnableWhenExpressions). */
export function isEnableWhenExpressionHelperLinkId(linkId: string): boolean {
    return linkId.endsWith(ENABLE_WHEN_EXPRESSION_SUFFIX);
}

/**
 * Expands each enableWhenExpression into a separate boolean calculated item and classic enableWhen.
 * For each item that has enableWhenExpression:
 * - Inserts right before it a new item (helper) with linkId `${originalLinkId}${ENABLE_WHEN_EXPRESSION_SUFFIX}`,
 *   type 'boolean', and calculatedExpression set to the same expression.
 * - If the original has `variable`: for a group the helper gets a copy (original keeps variable);
 *   for a non-group the variable is moved to the helper (removed from original) so the helper
 *   can evaluate expressions like %MyVar (issue #47).
 * - Removes enableWhenExpression from the original and adds enableWhen referencing the helper.
 * Recurses into nested items. Returns a new questionnaire; does not mutate the input.
 */
export function expandEnableWhenExpressions(questionnaire: FCEQuestionnaire): FCEQuestionnaire {
    return {
        ...questionnaire,
        item: (questionnaire.item ?? []).flatMap(expandEnableWhenExpressionItem),
    };
}

function expandEnableWhenExpressionItem(item: FCEQuestionnaireItem): FCEQuestionnaireItem[] {
    const withExpandedChildren: FCEQuestionnaireItem = {
        ...item,
        item: item.item?.flatMap((child) => expandEnableWhenExpressionItem(child as FCEQuestionnaireItem)),
    };

    if (!withExpandedChildren.enableWhenExpression) {
        return [withExpandedChildren];
    }

    const linkId = withExpandedChildren.linkId!;
    const helperLinkId = `${linkId}${ENABLE_WHEN_EXPRESSION_SUFFIX}`;
    const expression = withExpandedChildren.enableWhenExpression;
    const isGroup = withExpandedChildren.type === 'group';

    const helperItem: FCEQuestionnaireItem = {
        linkId: helperLinkId,
        type: 'boolean',
        calculatedExpression: expression,
        ...(withExpandedChildren.variable?.length ? { variable: [...withExpandedChildren.variable] } : {}),
    };

    // Omit enableWhenExpression (moved to helper); variable omitted for non-groups (moved to helper)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- intentionally omitted
    const { enableWhenExpression, variable, ...rest } = withExpandedChildren;
    const originalWithEnableWhen: FCEQuestionnaireItem = {
        ...rest,
        ...(isGroup && variable?.length ? { variable } : {}),
        enableWhen: [
            {
                question: helperLinkId,
                operator: '=' as QuestionnaireItemEnableWhen['operator'],
                answerBoolean: true,
            },
        ],
    };

    return [helperItem, originalWithEnableWhen];
}

function findAnswersForQuestionsRecursive(linkId: string, values?: FormItems): any | null {
    // TODO: specify types for returning value
    // TODO: pass Questionnaire structure to make code robust
    if (values && _.has(values, linkId)) {
        return values[linkId];
    }

    return _.reduce(
        values,
        (acc, v) => {
            if (acc) {
                return acc;
            }

            if (!v) {
                return acc;
            }

            if (_.isArray(v)) {
                return _.reduce(
                    v,
                    (acc2, v2) => {
                        if (acc2) {
                            return acc2;
                        }

                        return findAnswersForQuestionsRecursive(linkId, v2?.items);
                    },
                    null,
                );
            } else if (_.isArray(v.items)) {
                return _.reduce(
                    v.items,
                    (acc2, v2) => {
                        if (acc2) {
                            return acc2;
                        }

                        return findAnswersForQuestionsRecursive(linkId, v2);
                    },
                    null,
                );
            } else {
                return findAnswersForQuestionsRecursive(linkId, v.items);
            }
        },
        null,
    );
}

// TODO: deprecate usage of this function because it relies on internals
// TODO: pass Questionnaire structure to make code robust, currently it uses isNaN that might work falsy when linkId is number
export function findAnswersForQuestion(linkId: string, parentPath: string[], values: FormItems): FormAnswerItems[] {
    if (linkId === ITEM_KEY) {
        return [];
    }

    const p = _.cloneDeep(parentPath);

    // Go up
    while (p.length) {
        const part = p.pop()!;

        // Find answers in parent groups (including repeatable)
        // They might have either 'items' of the group or number of the repeatable group in path
        // TODO: using isNaN might return invalid value for linkId like '0'
        if (part === 'items' || !isNaN(part as any)) {
            // TODO: specify type FormItems, and handle group's linkId
            const parentGroup = _.get(values, [...p, part]);

            if (typeof parentGroup === 'object' && linkId in parentGroup) {
                return cleanFormAnswerItems(parentGroup[linkId]);
            }
        }
    }

    // Go down
    const answers = findAnswersForQuestionsRecursive(linkId, values);

    return answers ? cleanFormAnswerItems(answers) : [];
}

export function compareValue(firstAnswerValue: AnswerValue, secondAnswerValue: AnswerValue) {
    const firstValueType = getAnswerValueType(firstAnswerValue);
    const secondValueType = getAnswerValueType(secondAnswerValue);

    if (firstValueType !== secondValueType) {
        throw new Error(
            `Enable when must be used for the same type, first type is ${firstValueType}, second type is ${secondValueType}`,
        );
    }
    if (!_.includes(FHIRPrimitiveTypes, firstValueType)) {
        throw new Error('Impossible to compare non-primitive type');
    }

    const firstValue = firstAnswerValue[firstValueType];
    const secondValue = secondAnswerValue[secondValueType];

    if (firstValue! < secondValue!) {
        return -1;
    }

    if (firstValue! > secondValue!) {
        return 1;
    }

    return 0;
}

export function isValueEqual(firstValue: AnswerValue, secondValue: AnswerValue) {
    const firstValueType = getAnswerValueType(firstValue);
    const secondValueType = getAnswerValueType(secondValue);

    if (firstValueType !== secondValueType) {
        console.error(
            `Enable when must be used for the same type, first type is ${firstValueType}, second type is ${secondValueType}`,
        );

        return false;
    }

    if (firstValueType === 'Coding') {
        // NOTE: what if undefined === undefined
        // TODO: here should be system comparison, but it will be a big breaking change
        return firstValue.Coding?.code === secondValue.Coding?.code;
    }

    return _.isEqual(firstValue, secondValue);
}

export function getChecker(
    operator: QuestionnaireItemEnableWhen['operator'],
): (values: AnswerValue[], answerValue: AnswerValue) => boolean {
    if (operator === '=') {
        return (values, answerValue) => _.findIndex(values, (value) => isValueEqual(value, answerValue)) !== -1;
    }

    if (operator === '!=') {
        return (values, answerValue) => _.findIndex(values, (value) => isValueEqual(value, answerValue)) === -1;
    }

    if (operator === 'exists') {
        return (values, answerValue) => {
            const answer = answerValue.boolean;
            return values.length > 0 === answer;
        };
    }

    if (operator === '>=') {
        return (values, answerValue) => _.findIndex(values, (value) => compareValue(value, answerValue) >= 0) !== -1;
    }

    if (operator === '>') {
        return (values, answerValue) => _.findIndex(values, (value) => compareValue(value, answerValue) > 0) !== -1;
    }

    if (operator === '<=') {
        return (values, answerValue) => _.findIndex(values, (value) => compareValue(value, answerValue) <= 0) !== -1;
    }

    if (operator === '<') {
        return (values, answerValue) => _.findIndex(values, (value) => compareValue(value, answerValue) < 0) !== -1;
    }

    /* c8 ignore next 2 */
    console.error(`Unsupported enableWhen.operator ${operator}`);
    return _.constant(true);
}

interface IsQuestionEnabledArgs {
    qItem: FCEQuestionnaireItem;
    parentPath: string[];
    values: FormItems;
    context: ItemContext;
}
function isQuestionEnabled(args: IsQuestionEnabledArgs) {
    const { enableWhen, enableBehavior, enableWhenExpression } = args.qItem;

    if (enableWhenExpression) {
        throw Error(`enableWhenExpression is not supported, use expandEnableWhenExpressions on FCEQuestionnaire`);
    }

    if (!enableWhen) {
        return true;
    }

    const iterFn = enableBehavior === 'any' ? _.some : _.every;

    return iterFn(enableWhen, ({ question, operator, ...enableWhenItem }) => {
        // answer is required field in enableWhen
        const answer = toAnswerValue(enableWhenItem, 'answer')!;
        const check = getChecker(operator);

        if (_.includes(args.parentPath, question)) {
            // This block is about sub questions inside questions (answers that have nested items)
            // It's currently not used in any of our questionnaires
            // TODO: handle double-nested values
            const parentAnswerPath = _.slice(args.parentPath, 0, args.parentPath.length - 1);
            const parentAnswer = _.get(args.values, parentAnswerPath);
            const answerValues = getAnswerValues(parentAnswer ? [parentAnswer] : []);

            return check(answerValues, answer);
        }
        const answers = findAnswersForQuestion(question, args.parentPath, args.values);
        const answerValues = getAnswerValues(answers);

        return check(answerValues, answer);
    });
}

export function removeDisabledAnswers(
    questionnaire: FCEQuestionnaire,
    values: FormItems,
    context: ItemContext,
): FormItems {
    const afterRecursive = removeDisabledAnswersRecursive({
        questionnaireItems: questionnaire.item ?? [],
        parentPath: [],
        answersItems: values,
        initialValues: {},
        context,
    });
    return removeEnableWhenExpressionHelperItems(questionnaire, afterRecursive);
}

/**
 * Removes virtual enableWhenExpression helper items (linkId ending with ENABLE_WHEN_EXPRESSION_SUFFIX)
 * from form values so they do not appear in the QR. Recurses into nested items.
 */
export function removeEnableWhenExpressionHelperItems(
    questionnaire: FCEQuestionnaire,
    formItems: FormItems,
): FormItems {
    return removeEnableWhenExpressionHelperItemsRecursive(questionnaire.item ?? [], formItems);
}

function removeEnableWhenExpressionHelperItemsRecursive(
    questionnaireItems: FCEQuestionnaireItem[],
    formItems: FormItems,
): FormItems {
    return Object.fromEntries(
        Object.entries(formItems)
            .filter(([linkId]) => !isEnableWhenExpressionHelperLinkId(linkId))
            .map(([linkId, value]) => {
                if (value == null) {
                    return [linkId, value];
                }
                const questionnaireItem = questionnaireItems.find((i) => i.linkId === linkId);
                if (Array.isArray(value)) {
                    return [
                        linkId,
                        value.map((answer) =>
                            answer?.items && questionnaireItem
                                ? {
                                      ...answer,
                                      items: removeEnableWhenExpressionHelperItemsRecursive(
                                          questionnaireItem.item ?? [],
                                          answer.items,
                                      ),
                                  }
                                : answer,
                        ),
                    ];
                }
                if (!questionnaireItem || !isFormGroupItems(questionnaireItem, value)) {
                    return [linkId, value];
                }
                if (!value.items) {
                    return [linkId, value];
                }
                if (isRepeatableFormGroupItems(questionnaireItem, value)) {
                    return [
                        linkId,
                        {
                            ...value,
                            items: value.items.map((group) =>
                                removeEnableWhenExpressionHelperItemsRecursive(questionnaireItem.item ?? [], group),
                            ),
                        },
                    ];
                }
                return [
                    linkId,
                    {
                        ...value,
                        items: removeEnableWhenExpressionHelperItemsRecursive(
                            questionnaireItem.item ?? [],
                            value.items,
                        ),
                    },
                ];
            }),
    ) as FormItems;
}

interface RemoveDisabledAnswersRecursiveArgs {
    questionnaireItems: FCEQuestionnaireItem[];
    parentPath: string[];
    answersItems: FormItems;
    initialValues: FormItems;
    context: ItemContext;
}
function removeDisabledAnswersRecursive(args: RemoveDisabledAnswersRecursiveArgs): FormItems {
    return args.questionnaireItems.reduce((acc, questionnaireItem) => {
        const values = args.parentPath.length ? _.set(_.cloneDeep(args.initialValues), args.parentPath, acc) : acc;

        const { linkId } = questionnaireItem;
        const answers = args.answersItems[linkId!];

        if (!answers) {
            return acc;
        }

        if (
            !isQuestionEnabled({
                qItem: questionnaireItem,
                parentPath: args.parentPath,
                values,
                context: args.context,
            })
        ) {
            return acc;
        }

        if (isFormGroupItems(questionnaireItem, answers)) {
            if (!answers.items) {
                return acc;
            }

            if (isRepeatableFormGroupItems(questionnaireItem, answers)) {
                return {
                    ...acc,
                    [linkId!]: {
                        ...answers,
                        items: answers.items.map((group, index) =>
                            removeDisabledAnswersRecursive({
                                questionnaireItems: questionnaireItem.item ?? [],
                                parentPath: [...args.parentPath, linkId!, 'items', index.toString()],
                                answersItems: group,
                                initialValues: values,
                                context: args.context,
                            }),
                        ),
                    },
                };
            } else {
                return {
                    ...acc,
                    [linkId!]: {
                        ...answers,
                        items: removeDisabledAnswersRecursive({
                            questionnaireItems: questionnaireItem.item ?? [],
                            parentPath: [...args.parentPath, linkId!, 'items'],
                            answersItems: answers.items,
                            initialValues: values,
                            context: args.context,
                        }),
                    },
                };
            }
        }

        return {
            ...acc,
            [linkId!]: cleanFormAnswerItems(answers).reduce((answersAcc, answer, index) => {
                const items = hasSubAnswerItems(answer.items)
                    ? removeDisabledAnswersRecursive({
                          questionnaireItems: questionnaireItem.item ?? [],
                          parentPath: [...args.parentPath, linkId!, index.toString(), 'items'],
                          answersItems: answer.items,
                          initialValues: { ...values, [linkId!]: [...answersAcc, { ...answer, items: [] }] },
                          context: args.context,
                      })
                    : {};

                return [...answersAcc, { ...answer, items }];
            }, [] as any),
        };
    }, {} as any);
}

export function getEnabledQuestions(
    questionnaireItems: FCEQuestionnaireItem[],
    parentPath: string[],
    values: FormItems,
    context: ItemContext,
) {
    return _.filter(questionnaireItems, (qItem) => {
        const { linkId } = qItem;

        if (!linkId) {
            /* c8 ignore next 2 */
            return false;
        }

        return isQuestionEnabled({ qItem, parentPath, values, context });
    });
}

export function calcInitialContext(
    qrfDataContext: QuestionnaireResponseFormData['context'],
    values: FormItems,
): ItemContext {
    const questionnaireResponse = {
        ...qrfDataContext.questionnaireResponse,
        ...mapFormToResponse(values, qrfDataContext.questionnaire),
    };

    return {
        ...qrfDataContext.launchContextParameters.reduce((acc, { name, resource, ...param }) => {
            const value = getChoiceTypeValue(param, 'value');

            return {
                ...acc,
                [name]: value ? (value as keyof AnswerValue) : resource,
            };
        }, {}),

        // Vars defined in IG
        questionnaire: qrfDataContext.questionnaire,
        resource: questionnaireResponse,
        context: questionnaireResponse,

        // Vars we use for backward compatibility
        Questionnaire: qrfDataContext.questionnaire,
        QuestionnaireResponse: questionnaireResponse,
    };
}

export function resolveTemplateExpr(
    str: string,
    context: ItemContext,
    path: string,
    returnNullIfUnresolved?: false,
): string;
export function resolveTemplateExpr(
    str: string,
    context: ItemContext,
    path: string,
    returnNullIfUnresolved: true,
): string | null;
export function resolveTemplateExpr(
    str: string,
    context: ItemContext,
    path: string,
    returnNullIfUnresolved: boolean = false,
): string | null {
    const matches = str.match(/{{[^}]+}}/g);

    if (!matches) {
        return str;
    }

    return matches.reduce<string | null>((acc, match) => {
        if (acc === null) {
            return null;
        }

        const expr = match.replace(/[{}]/g, '');

        const resolvedVar = evaluateFHIRPathExpression(
            {
                language: 'text/fhirpath',
                expression: expr,
            },
            context,
            path,
        );

        if (resolvedVar?.length) {
            return acc.replace(match, resolvedVar.join(','));
        }

        if (returnNullIfUnresolved) {
            return null;
        }

        return acc.replace(match, '');
    }, str);
}

export function parseFhirQueryExpression(
    expression: string,
    context: ItemContext,
    path: string = 'unknown',
): [string | undefined, Record<string, any>] {
    const [resourceType, paramsQS] = expression.split('?', 2);
    const searchParams = Object.fromEntries(
        Object.entries(queryString.parse(paramsQS ?? '')).map(([key, value]) => {
            if (!value) {
                return [key, value];
            }

            return [
                key,
                isArray(value)
                    ? value.map((arrValue) => resolveTemplateExpr(arrValue!, context, path))
                    : resolveTemplateExpr(value, context, path),
            ];
        }),
    );

    return [resourceType, searchParams];
}

export function evaluateFHIRPathExpression(
    expression: Expression | undefined,
    context: ItemContext,
    path: string = 'unknown',
) {
    if (!expression) {
        return [];
    }

    if (expression.language !== 'text/fhirpath') {
        console.error('Only fhirpath expression is supported');
        return [];
    }

    try {
        return fhirpath.evaluate(context.context ?? {}, expression.expression!, context, fhirpathR4BModel, {
            async: false,
        });
    } catch (err: unknown) {
        throw Error(`FHIRPath expression evaluation failure for ${path}: ${err}`);
    }
}

export function stripNonEnumerable<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return [...obj] as unknown as T;
    }

    return { ...obj };
}

export function getChoiceTypeValue(obj: Record<any, any>, prefix: string): any | undefined {
    const prefixKey = Object.keys(obj).filter((key: string) => key.startsWith(prefix))[0];

    return prefixKey ? obj[prefixKey] : undefined;
}

type ExtractAnswerProps<T> = {
    [K in keyof T as K extends `answer${string}` ? K : never]: T[K];
};
type ExtractValueProps<T> = {
    [K in keyof T as K extends `value${string}` ? K : never]: T[K];
};
type GenericValue = ExtractValueProps<
    QuestionnaireResponseItemAnswer | QuestionnaireItemInitial | QuestionnaireItemAnswerOption
>;
type GenericAnswer = ExtractAnswerProps<QuestionnaireItemEnableWhen>;
export function toAnswerValue(obj: GenericValue, prefix: 'value'): AnswerValue | undefined;

export function toAnswerValue(obj: GenericAnswer, prefix: 'answer'): AnswerValue | undefined;
export function toAnswerValue(obj: GenericAnswer | GenericValue, prefix: 'value' | 'answer'): AnswerValue | undefined {
    const prefixKey = Object.keys(obj).filter((key: string) => key.startsWith(prefix))[0];
    if (!prefixKey) {
        return undefined;
    }
    const key = lowerFirst(prefixKey.slice(prefix.length));
    const answerKey = FHIRPrimitiveTypes.includes(key) ? key : upperFirst(key);

    return {
        [answerKey]: (obj as any)[prefixKey],
    };
}

export function toFHIRAnswerValue(answerValue: AnswerValue, prefix: string): FHIRAnswerValue {
    const key = Object.keys(answerValue)[0]! as keyof AnswerValue;

    return {
        [`${prefix}${upperFirst(key)}`]: answerValue[key],
    } as FHIRAnswerValue;
}

export function getAnswerValueType(v: AnswerValue): keyof AnswerValue {
    const keys = _.keys(v);

    return keys[0] as keyof AnswerValue;
}

export function getAnswerValues(answers: FormAnswerItems[]) {
    return _.reject(answers, ({ value }) => isAnswerValueEmpty(value)).map(({ value }) => value!);
}

export function isAnswerValueEmpty(value: AnswerValue | undefined | null) {
    return isValueEmpty(value) || _.every(_.mapValues(value, isValueEmpty));
}

export function cleanFormAnswerItems(answerItems: (FormAnswerItems | undefined)[] | undefined): FormAnswerItems[] {
    // TODO: answerItems might be any here, we use _.filter because it handles object and nulls.
    // TODO: get rid of it, once we have right types for all other functions
    return _.filter(answerItems, (answer) => !!answer).filter((answer) => !isAnswerValueEmpty(answer.value));
}

export function isValueEmpty(value: any) {
    if (_.isNaN(value)) {
        console.warn(
            'Please be aware that a NaN value has been detected. In the context of an "exist" operator, a NaN value is interpreted as a non-existent value. This may lead to unexpected behavior in your code. Ensure to handle or correct this to maintain the integrity of your application.',
        );
    }

    return _.isFinite(value) || _.isBoolean(value) ? false : _.isEmpty(value);
}
