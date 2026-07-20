import { Element, Extension, Questionnaire as FHIRQuestionnaire } from 'fhir/r4b';
import cloneDeep from 'lodash/cloneDeep';

import { ExtensionIdentifier } from '../extensions';

export function translateQuestionnaire(questionnaire: FHIRQuestionnaire, language: string): FHIRQuestionnaire {
    const result = cloneDeep(questionnaire);
    translateNode(result, language);
    return result;
}

function translateNode(node: unknown, language: string): void {
    if (node === null || typeof node !== 'object') {
        return;
    }

    if (Array.isArray(node)) {
        for (const item of node) {
            translateNode(item, language);
        }
        return;
    }

    const object = node as Record<string, unknown>;

    for (const property of Object.keys(object)) {
        if (property.startsWith('_')) {
            const element = object[property];
            if (element instanceof Object && !Array.isArray(element)) {
                applyTranslation(object, property, element as Element, language);
            }
        }
    }

    for (const value of Object.values(object)) {
        translateNode(value, language);
    }
}

function applyTranslation(
    parent: Record<string, unknown>,
    underscoreProperty: string,
    element: Element,
    language: string,
): void {
    const extensions = element.extension;
    if (!extensions?.length) {
        return;
    }

    const translationExtensions = extensions.filter((ext) => ext.url === ExtensionIdentifier.Translation);
    if (!translationExtensions.length) {
        return;
    }

    const matchedTranslation = translationExtensions.find((ext) => {
        const lang = ext.extension?.find((sub) => sub.url === 'lang')?.valueCode;
        return lang === language;
    });

    if (matchedTranslation) {
        const contentExtension = matchedTranslation.extension?.find((sub) => sub.url === 'content');
        if (contentExtension) {
            const valueKey = Object.keys(contentExtension).find((key) => key.startsWith('value')) as
                | keyof Extension
                | undefined;
            if (valueKey) {
                const primitiveProperty = underscoreProperty.slice(1);
                parent[primitiveProperty] = contentExtension[valueKey];
            }
        }
    }

    const remainingExtensions = extensions.filter((ext) => ext.url !== ExtensionIdentifier.Translation);
    if (remainingExtensions.length) {
        element.extension = remainingExtensions;
    } else {
        delete element.extension;
    }

    if (Object.keys(element).length === 0) {
        delete parent[underscoreProperty];
    }
}
