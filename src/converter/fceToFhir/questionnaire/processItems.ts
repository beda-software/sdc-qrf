import {
    Quantity as QuantityFHIR,
    QuestionnaireItemEnableWhen as FHIRQuestionnaireItemEnableWhen,
    QuestionnaireItem as FHIRQuestionnaireItem,
    QuestionnaireItemAnswerOption as FHIRQuestionnaireItemAnswerOption,
    QuestionnaireItemInitial as FHIRQuestionnaireItemInitial,
} from 'fhir/r4b';
import _ from 'lodash';

import {
    QuestionnaireItem as FCEQuestionnaireItem,
    QuestionnaireItemEnableWhen as FCEQuestionnaireItemEnableWhen,
    QuestionnaireItemEnableWhenAnswer as FCEQuestionnaireItemEnableWhenAnswer,
    QuestionnaireItemAnswerOption as FCEQuestionnaireItemAnswerOption,
    QuestionnaireItemInitial as FCEQuestionnaireItemInitial,
} from '@beda.software/aidbox-types';

import { convertFromFHIRExtension, convertToFHIRExtension, toFHIRReference } from '../..';

export function processItems(items: FCEQuestionnaireItem[], onlyExtensions = false): FHIRQuestionnaireItem[] {
    return items.map((item) => {
        const extensions = convertToFHIRExtension(item);
        if (extensions.length > 0) {
            const fieldsToOmit = Object.values(_.groupBy(extensions, (extension) => extension.url))
                .map(convertFromFHIRExtension)
                .filter((ext): ext is Partial<FCEQuestionnaireItem> => ext !== undefined)
                .flatMap(Object.keys);
            for (const field of fieldsToOmit) {
                //@ts-expect-error: Element implicitly has an 'any' type
                delete item[field];
            }
            item.extension = extensions.sort();
        }

        const { enableBehavior, enableWhen, answerOption, initial, item: nestedItems, type, ...commonOptions } = item;

        const fhirItem: FHIRQuestionnaireItem = {
            ...commonOptions,
            type: type as FHIRQuestionnaireItem['type'],
        };

        for (const property of Object.keys(item)) {
            const element = item[property as keyof FCEQuestionnaireItem];

            if (property.startsWith('_') && element instanceof Object) {
                //@ts-expect-error: Element implicitly has an 'any' type
                fhirItem[property] = {
                    // TODO: update convertToFHIRExtension to accept element type to convert
                    //@ts-expect-error: Argument of type is not assignable to parameter of type 'QuestionnaireItem'
                    extension: convertToFHIRExtension(element),
                };
            }
        }

        if (answerOption !== undefined) {
            fhirItem.answerOption = onlyExtensions ? answerOption : processAnswerOption(answerOption);
        }

        if (enableBehavior !== undefined) {
            fhirItem.enableBehavior = enableBehavior as FHIRQuestionnaireItem['enableBehavior'];
        }

        if (enableWhen !== undefined) {
            fhirItem.enableWhen = onlyExtensions
                ? (enableWhen as FHIRQuestionnaireItemEnableWhen[])
                : processEnableWhen(enableWhen);
        }

        if (initial) {
            fhirItem.initial = onlyExtensions ? initial : processInitial(initial);
        }

        if (nestedItems) {
            fhirItem.item = processItems(nestedItems, onlyExtensions);
        }

        return fhirItem;
    });
}

const convertEnableWhen = (
    answer: FCEQuestionnaireItemEnableWhenAnswer,
    answerType: string,
    result: FHIRQuestionnaireItemEnableWhen,
) => {
    //@ts-expect-error: Element implicitly has an 'any' type
    if (answer[answerType] !== undefined) {
        switch (answerType) {
            case 'boolean':
                result.answerBoolean = answer[answerType];
                break;
            case 'decimal':
                result.answerDecimal = answer[answerType];
                break;
            case 'integer':
                result.answerInteger = answer[answerType];
                break;
            case 'date':
                result.answerDate = answer[answerType];
                break;
            case 'dateTime':
                result.answerDateTime = answer[answerType];
                break;
            case 'time':
                result.answerTime = answer[answerType];
                break;
            case 'string':
                result.answerString = answer[answerType];
                break;
            case 'Coding':
                result.answerCoding = answer[answerType];
                break;
            case 'Quantity':
                result.answerQuantity = answer[answerType] as QuantityFHIR;
                break;
            case 'Reference':
                result.answerReference = toFHIRReference(answer[answerType]);
                break;
            default:
                break;
        }
    }
};

function processAnswerOption(options: FCEQuestionnaireItemAnswerOption[]): FHIRQuestionnaireItemAnswerOption[] {
    return options.map((option) => {
        const { value, ...commonOptions } = option;

        const fhirOption: FHIRQuestionnaireItemAnswerOption = { ...commonOptions };

        if (!value) {
            return fhirOption;
        }

        if (value.Coding) {
            fhirOption.valueCoding = value.Coding;
        }
        if (value.string) {
            fhirOption.valueString = value.string;
        }
        if (value.Reference) {
            fhirOption.valueReference = toFHIRReference(value.Reference);
        }
        if (value.date) {
            fhirOption.valueDate = value.date;
        }
        if (_.isNumber(value.integer)) {
            fhirOption.valueInteger = value.integer;
        }
        if (value.time) {
            fhirOption.valueTime = value.time;
        }

        return fhirOption;
    });
}

function processEnableWhen(options: FCEQuestionnaireItemEnableWhen[]) {
    return options.map((item: FCEQuestionnaireItemEnableWhen) => {
        const { question, operator, answer } = item;
        const result: FHIRQuestionnaireItemEnableWhen = {
            question,
            operator: operator as 'exists' | '=' | '!=' | '>' | '<' | '>=' | '<=',
        };

        if (!answer) {
            return result;
        }

        const answerTypes = [
            'boolean',
            'decimal',
            'integer',
            'date',
            'dateTime',
            'time',
            'string',
            'Coding',
            'Quantity',
            'Reference',
        ];

        answerTypes.forEach((answerType) => {
            convertEnableWhen(answer, answerType, result);
        });

        return result;
    });
}

function processInitial(options: FCEQuestionnaireItemInitial[]): FHIRQuestionnaireItemInitial[] {
    return options.map((entry) => {
        const result: FHIRQuestionnaireItemInitial = {};
        if (entry.value?.boolean !== undefined) {
            result.valueBoolean = entry.value.boolean;
        }
        if (entry.value?.Coding !== undefined) {
            result.valueCoding = entry.value.Coding;
        }
        return result;
    });
}
