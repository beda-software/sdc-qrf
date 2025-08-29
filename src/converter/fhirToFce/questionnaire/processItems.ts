import {
    Questionnaire as FHIRQuestionnaire,
    QuestionnaireItem as FHIRQuestionnaireItem,
    Element as FHIRElement,
} from 'fhir/r4b';

import { convertFromFHIRExtension, filterQuestionnaireItemExtensions } from '../..';
import { ExtensionIdentifier } from '../../extensions';
import { FCEQuestionnaireItem } from '../../../fce.types';

export function processItems(fhirQuestionnaire: FHIRQuestionnaire) {
    return fhirQuestionnaire.item?.map((item) => convertItemProperties(item));
}

function convertItemProperties(item: FHIRQuestionnaireItem): FCEQuestionnaireItem {
    const { updatedProperties, processedExtensionUrls } = getUpdatedPropertiesFromItem(item);
    const newItem = { ...item, ...updatedProperties };

    newItem.item = item.item?.map((nestedItem) => convertItemProperties(nestedItem));

    if (newItem.extension) {
        newItem.extension = newItem.extension.filter((ext) => !processedExtensionUrls.includes(ext.url));
        if (!newItem.extension.length) {
            delete newItem.extension;
        }
    }

    return newItem;
}

function getUpdatedPropertiesFromItem(item: FHIRQuestionnaireItem) {
    const processedExtensionUrls: string[] = [];
    let updatedProperties: FCEQuestionnaireItem = { linkId: item.linkId, type: item.type };

    for (const identifier of Object.values(ExtensionIdentifier)) {
        for (const property of Object.keys(item)) {
            const element = item[property as keyof FHIRQuestionnaireItem];
            if (property.startsWith('_') && element instanceof Object) {
                const primitiveExtensions = (element as FHIRElement)?.extension ?? [];
                for (const extension of primitiveExtensions) {
                    if (extension.url === identifier) {
                        if (!processedExtensionUrls.includes(identifier)) {
                            processedExtensionUrls.push(identifier);
                        }
                        updatedProperties = {
                            ...updatedProperties,
                            ...{ [property]: convertFromFHIRExtension([extension]) },
                        };
                    }
                }
            }
        }

        const extensions = filterQuestionnaireItemExtensions(item, identifier);
        if (extensions?.length) {
            if (!processedExtensionUrls.includes(identifier)) {
                processedExtensionUrls.push(identifier);
            }
            updatedProperties = {
                ...updatedProperties,
                ...convertFromFHIRExtension(extensions),
            };
        }
    }

    return { updatedProperties, processedExtensionUrls };
}
