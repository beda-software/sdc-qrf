import { Questionnaire as FHIRQuestionnaire, QuestionnaireItem as FHIRQuestionnaireItem, Extension } from 'fhir/r4b';

import { convertFromFHIRExtension } from '../..';
import { ExtensionIdentifier } from '../../extensions';
import { FCEQuestionnaireItem } from '../../../fce.types';

export function processItems(fhirQuestionnaire: FHIRQuestionnaire) {
    return fhirQuestionnaire.item?.map((item) => convertItemProperties(item));
}

function convertItemProperties(item: FHIRQuestionnaireItem): FCEQuestionnaireItem {
    const newItem = getUpdatedPropertiesFromItem(item);

    if (item.item) {
        newItem.item = item.item.map((nestedItem) => convertItemProperties(nestedItem));
    }
    return newItem;
}

function getUpdatedPropertiesFromItem(item: FHIRQuestionnaireItem) {
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

    return processExtensibleElement(newItem);
}

function processExtensibleElement<T extends { extension?: Extension[] }>(element: T): T {
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
