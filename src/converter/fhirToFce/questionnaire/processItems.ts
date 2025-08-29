import {
    QuestionnaireItemEnableWhen as FHIRQuestionnaireItemEnableWhen,
    Questionnaire as FHIRQuestionnaire,
    QuestionnaireItem as FHIRQuestionnaireItem,
    QuestionnaireItemAnswerOption as FHIRQuestionnaireItemAnswerOption,
    QuestionnaireItemInitial as FHIRQuestionnaireItemInitial,
    Extension as FHIRExtension,
} from 'fhir/r4b';
import _ from 'lodash';

import {
    QuestionnaireItem as FCEQuestionnaireItem,
    QuestionnaireItemEnableWhen as FCEQuestionnaireItemEnableWhen,
    QuestionnaireItemEnableWhenAnswer as FCEQuestionnaireItemEnableWhenAnswer,
    QuestionnaireItemAnswerOption as FCEQuestionnaireItemAnswerOption,
    QuestionnaireItemInitial as FCEQuestionnaireItemInitial,
} from '@beda.software/aidbox-types';

import { convertFromFHIRExtension, fromFHIRReference } from '../../../converter';
import { ExtensionIdentifier } from '../../extensions';

export function processItems(fhirQuestionnaire: FHIRQuestionnaire, extensionsOnly: boolean) {
    return fhirQuestionnaire.item?.map((item) => convertItemProperties(item, extensionsOnly));
}

function convertItemProperties(item: FHIRQuestionnaireItem, extensionsOnly: boolean): FCEQuestionnaireItem {
    const newItem = getUpdatedPropertiesFromItem(item, extensionsOnly);

    if (item.item) {
        newItem.item = item.item.map((nestedItem) => convertItemProperties(nestedItem, extensionsOnly));
    }
    return newItem;
}

function getUpdatedPropertiesFromItem(item: FHIRQuestionnaireItem, extensionsOnly: boolean) {
    let newItem: FCEQuestionnaireItem = { ...item };

    // Primitive extensions
    for (const property of Object.keys(item)) {
        const element = item[property as keyof FHIRQuestionnaireItem];
        if (property.startsWith('_') && element instanceof Object && !Array.isArray(element)) {
            newItem = {
                ...newItem,
                ...{
                    [property]: processExtensibleElement(element),
                },
            };
        }
    }

    if (!extensionsOnly) {
        newItem.answerOption = item.answerOption?.map(processItemOption);
        newItem.initial = item.initial?.map(processItemOption);
        newItem.enableWhen = item.enableWhen?.map(processEnableWhenItem);
    }

    return processExtensibleElement(newItem);
}

function processExtensibleElement<T extends { extension?: FHIRExtension[] }>(element: T): T {
    let newElement = { ...element };
    const knownExtensionUrls = Object.values(ExtensionIdentifier) as string[];

    const allExtensions = element.extension ?? [];
    const knownExtensions = allExtensions.filter((ext) => knownExtensionUrls.includes(ext.url));
    const unknownExtensions = allExtensions.filter((ext) => !knownExtensionUrls.includes(ext.url));

    if (knownExtensions.length) {
        const uniqueExtensionUrls = new Set(knownExtensions.map((ext) => ext.url));
        for (const extensionUrl of uniqueExtensionUrls) {
            const extensions = knownExtensions.filter((ext) => ext.url === extensionUrl);

            newElement = {
                ...newElement,
                ...convertFromFHIRExtension(extensions),
            };
        }
    }

    if (unknownExtensions.length) {
        newElement.extension = unknownExtensions;
    } else {
        delete newElement.extension;
    }

    return newElement;
}

function processEnableWhenItem(item: FHIRQuestionnaireItemEnableWhen): FCEQuestionnaireItemEnableWhen {
    return {
        question: item.question,
        operator: item.operator,
        answer: processEnableWhenAnswerOption(item),
    };
}

function processEnableWhenAnswerOption(item: FHIRQuestionnaireItemEnableWhen) {
    const answer: FCEQuestionnaireItemEnableWhenAnswer = {};

    switch (true) {
        case 'answerBoolean' in item:
            answer['boolean'] = item.answerBoolean;
            break;
        case 'answerDecimal' in item:
            answer['decimal'] = item.answerDecimal;
            break;
        case 'answerInteger' in item:
            answer['integer'] = item.answerInteger;
            break;
        case 'answerDate' in item:
            answer['date'] = item.answerDate;
            break;
        case 'answerDateTime' in item:
            answer['dateTime'] = item.answerDateTime;
            break;
        case 'answerTime' in item:
            answer['time'] = item.answerTime;
            break;
        case 'answerString' in item:
            answer['string'] = item.answerString;
            break;
        case 'answerCoding' in item:
            answer['Coding'] = item.answerCoding;
            break;
        case 'answerQuantity' in item:
            answer['Quantity'] = item.answerQuantity;
            break;
        case 'answerReference' in item:
            if (item.answerReference) {
                answer['Reference'] = fromFHIRReference(item.answerReference);
            } else {
                throw Error("Can not process 'answerReference' with no reference inside");
            }
            break;
        default:
            break;
    }

    return answer;
}

function processItemOption(
    option: FHIRQuestionnaireItemAnswerOption | FHIRQuestionnaireItemInitial,
): FCEQuestionnaireItemAnswerOption | FCEQuestionnaireItemInitial {
    if (option.valueString) {
        return {
            value: {
                string: option.valueString,
            },
        };
    }
    if (option.valueCoding) {
        return {
            value: {
                Coding: option.valueCoding,
            },
        };
    }
    if (option.valueReference) {
        return {
            value: {
                Reference: fromFHIRReference(option.valueReference),
            },
        };
    }
    if (option.valueDate) {
        return {
            value: {
                date: option.valueDate,
            },
        };
    }
    if (_.isNumber(option.valueInteger)) {
        return {
            value: {
                integer: option.valueInteger,
            },
        };
    }
    if ('valueBoolean' in option) {
        return {
            value: {
                boolean: option.valueBoolean,
            },
        };
    }
    return option;
}
