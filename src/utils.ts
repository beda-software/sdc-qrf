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

export function getBranchItems(
    fieldPath: string[],
    questionnaire: Questionnaire,
    questionnaireResponse: QuestionnaireResponse,
): { qItem: QuestionnaireItem; qrItems: QuestionnaireResponseItem[] } {
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
    } as {
        qItem: QuestionnaireItem;
        qrItems: QuestionnaireResponseItem[];
    };
}

export function calcContext(
    initialContext: ItemContext,
    variables: FCEQuestionnaireItem['variable'],
    qItem: QuestionnaireItem,
    qrItem: QuestionnaireResponseItem,
): ItemContext {
    // TODO: add root variable support
    try {
        return {
            ...(variables || []).reduce(
                (acc, curVariable) => ({
                    ...acc,
                    [curVariable.name!]: fhirpath.evaluate(qrItem, curVariable.expression!, acc, fhirpathR4BModel, {
                        async: false,
                    }),
                }),
                { ...initialContext, context: qrItem, qitem: qItem },
            ),
        };
    } catch (err: unknown) {
        throw Error(`FHIRPath expression evaluation failure for "variable" in ${qItem.linkId}: ${err}`);
    }
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

function findAnswersForQuestionsRecursive(linkId: string, values?: FormItems): any | null {
    // TODO: specify types for returning value
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
        if (part === 'items' || !isNaN(part as any)) {
            const parentGroup = _.get(values, [...p, part]);

            if (typeof parentGroup === 'object' && linkId in parentGroup) {
                // TODO: specify type
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

    if (enableWhen && enableWhenExpression) {
        console.warn(`
        linkId: ${args.qItem.linkId}
        Both enableWhen and enableWhenExpression are used in the
        same QuestionItem.
        enableWhenExpression is used as more prioritized
        `);
    }

    if (!enableWhen && !enableWhenExpression) {
        return true;
    }

    if (enableWhenExpression && enableWhenExpression.language === 'text/fhirpath') {
        try {
            const expressionResult = fhirpath.evaluate(
                args.context.resource,
                enableWhenExpression.expression!,
                args.context ?? {},
                fhirpathR4BModel,
                { async: false },
            )[0];

            if (typeof expressionResult !== 'boolean') {
                throw Error(
                    `The result of enableWhenExpression is not a boolean value. Expression result: ${expressionResult}`,
                );
            }

            return expressionResult;
        } catch (err: unknown) {
            throw Error(`FHIRPath expression evaluation failure for ${args.qItem.linkId}.enableWhenExpression: ${err}`);
        }
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
    return removeDisabledAnswersRecursive({
        questionnaireItems: questionnaire.item ?? [],
        parentPath: [],
        answersItems: values,
        initialValues: {},
        context,
    });
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

function resolveTemplateExpr(str: string, context: ItemContext) {
    const matches = str.match(/{{[^}]+}}/g);

    if (matches) {
        return matches.reduce((result, match) => {
            const expr = match.replace(/[{}]/g, '');

            const resolvedVar = fhirpath.evaluate(context.context || {}, expr, context, fhirpathR4BModel, {
                async: false,
            });

            if (resolvedVar?.length) {
                return result.replace(match, resolvedVar.join(','));
            } else {
                return result.replace(match, '');
            }
        }, str);
    }

    return str;
}

export function parseFhirQueryExpression(expression: string, context: ItemContext) {
    const [resourceType, paramsQS] = expression.split('?', 2);
    const searchParams = Object.fromEntries(
        Object.entries(queryString.parse(paramsQS ?? '')).map(([key, value]) => {
            if (!value) {
                return [key, value];
            }

            return [
                key,
                isArray(value)
                    ? value.map((arrValue) => resolveTemplateExpr(arrValue!, context))
                    : resolveTemplateExpr(value, context),
            ];
        }),
    );

    return [resourceType, searchParams];
}

export function evaluateQuestionItemExpression(
    linkId: string,
    path: string,
    context: ItemContext,
    expression?: Expression,
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
        throw Error(`FHIRPath expression evaluation failure for ${linkId}.${path}: ${err}`);
    }
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
    return (answerItems ?? []).filter((answer) => !!answer).filter((answer) => !isAnswerValueEmpty(answer.value));
}

export function isValueEmpty(value: any) {
    if (_.isNaN(value)) {
        console.warn(
            'Please be aware that a NaN value has been detected. In the context of an "exist" operator, a NaN value is interpreted as a non-existent value. This may lead to unexpected behavior in your code. Ensure to handle or correct this to maintain the integrity of your application.',
        );
    }

    return _.isFinite(value) || _.isBoolean(value) ? false : _.isEmpty(value);
}
