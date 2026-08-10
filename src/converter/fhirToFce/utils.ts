import { Extension, Questionnaire as FHIRQuestionnaire } from 'fhir/r4b';

import { convertFromFHIRExtension } from '..';
import { ExtensionIdentifier } from '../extensions';

export function checkFhirQuestionnaireProfile(fhirQuestionnaire: FHIRQuestionnaire): void {
    if (
        !(
            (fhirQuestionnaire.meta?.profile?.length ?? 0) === 1 &&
            fhirQuestionnaire.meta?.profile?.[0] ===
                'https://emr-core.beda.software/StructureDefinition/fhir-emr-questionnaire'
        )
    ) {
        throw new Error('Only beda emr questionanire supported');
    }
}

export function trimUndefined(e: any) {
    for (const prop in e) {
        if (Object.prototype.hasOwnProperty.call(e, prop)) {
            const val = e[prop];
            if (val === undefined) {
                delete e[prop];
            } else if (typeof val === 'object') {
                if (Array.isArray(val)) {
                    for (let i = 0; i < val.length; i++) {
                        if (typeof val[i] === 'object') {
                            trimUndefined(val[i]);
                        }
                    }
                } else {
                    trimUndefined(val);
                }
            }
        }
    }

    return e;
}

export function processExtensibleElement<T extends { extension?: Extension[] }>(
    element: T,
    withTranslations = false,
): T {
    let newElement = { ...element };
    const knownExtensionUrls = (Object.values(ExtensionIdentifier) as string[]).filter(
        (url) => withTranslations || url !== ExtensionIdentifier.Translation,
    );

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

export function processPrimitiveExtensions<T>(resource: T, withTranslations = false): T {
    walk(resource, withTranslations);
    return resource;
}

function walk(node: unknown, withTranslations = false): void {
    if (node === null || typeof node !== 'object') {
        return;
    }

    if (Array.isArray(node)) {
        for (const item of node) {
            walk(item, withTranslations);
        }
        return;
    }

    const object = node as Record<string, unknown>;

    for (const property of Object.keys(object)) {
        const value = object[property];

        if (property.startsWith('_') && value instanceof Object && !Array.isArray(value)) {
            object[property] = processExtensibleElement(value as { extension?: Extension[] }, withTranslations);
        } else {
            walk(value, withTranslations);
        }
    }
}
