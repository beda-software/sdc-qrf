import { Element, Extension, Questionnaire as FHIRQuestionnaire } from 'fhir/r4b';
import cloneDeep from 'lodash/cloneDeep';

import { ExtensionIdentifier } from '../extensions';

export function translateQuestionnaire(questionnaire: FHIRQuestionnaire, language: string): FHIRQuestionnaire {
    const result = cloneDeep(questionnaire);
    const originLang = result.language ?? 'en';
    const applied = { value: false };

    translateNode(result, language, originLang, applied);

    if (applied.value) {
        result.language = language;
    }

    return result;
}

function translateNode(node: unknown, language: string, originLang: string, applied: { value: boolean }): void {
    if (node === null || typeof node !== 'object') {
        return;
    }

    if (Array.isArray(node)) {
        for (const item of node) {
            translateNode(item, language, originLang, applied);
        }
        return;
    }

    const object = node as Record<string, unknown>;

    for (const property of Object.keys(object)) {
        if (property.startsWith('_')) {
            const element = object[property];
            if (element instanceof Object && !Array.isArray(element)) {
                applyTranslation(object, property, element as Element, language, originLang, applied);
            }
        }
    }

    for (const value of Object.values(object)) {
        translateNode(value, language, originLang, applied);
    }
}

function applyTranslation(
    parent: Record<string, unknown>,
    underscoreProperty: string,
    element: Element,
    language: string,
    originLang: string,
    applied: { value: boolean },
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

    if (!matchedTranslation) {
        return;
    }

    const contentExtension = matchedTranslation.extension?.find((sub) => sub.url === 'content');
    if (!contentExtension) {
        return;
    }

    const valueKey = Object.keys(contentExtension).find((key) => key.startsWith('value')) as
        | keyof Extension
        | undefined;
    if (!valueKey) {
        return;
    }

    const primitiveProperty = underscoreProperty.slice(1);
    const originalValue = parent[primitiveProperty];

    if (originalValue !== undefined && originalValue !== null) {
        upsertOriginalTranslation(extensions, originLang, originalValue);
    }

    parent[primitiveProperty] = contentExtension[valueKey];
    applied.value = true;
}

function upsertOriginalTranslation(extensions: Extension[], originLang: string, originalValue: unknown): void {
    const existing = extensions.find((ext) => {
        if (ext.url !== ExtensionIdentifier.Translation) {
            return false;
        }
        const lang = ext.extension?.find((sub) => sub.url === 'lang')?.valueCode;
        return lang === originLang;
    });

    if (existing) {
        const contentExtension = existing.extension?.find((sub) => sub.url === 'content');
        if (contentExtension) {
            const valueKey = Object.keys(contentExtension).find((key) => key.startsWith('value')) as
                | keyof Extension
                | undefined;
            if (valueKey) {
                (contentExtension as Extension)[valueKey] = originalValue as never;
                return;
            }
        }
        existing.extension = [
            { url: 'lang', valueCode: originLang },
            { url: 'content', valueString: String(originalValue) },
        ];
        return;
    }

    extensions.push({
        url: ExtensionIdentifier.Translation,
        extension: [
            { url: 'lang', valueCode: originLang },
            { url: 'content', valueString: String(originalValue) },
        ],
    });
}
