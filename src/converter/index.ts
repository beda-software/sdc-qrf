import { Extension as FHIRExtension } from 'fhir/r4b';

import { ExtensionIdentifier, extensionTransformers } from './extensions';
import { fromFirstClassExtension } from './fceToFhir';
import { toFirstClassExtension, translateQuestionnaire } from './fhirToFce';
import { processLaunchContext as processLaunchContextToFce } from './fhirToFce/questionnaire/processExtensions';
import { FCEQuestionnaireItem } from '../fce.types';
export * from './utils';
export * from './reference';

export function convertFromFHIRExtension(extensions: FHIRExtension[]): Partial<FCEQuestionnaireItem> | undefined {
    const identifier = extensions[0]!.url;
    const transformer = extensionTransformers[identifier as ExtensionIdentifier];
    if (transformer !== undefined) {
        if ('transform' in transformer) {
            return transformer.transform.fromExtensions(extensions);
        } else {
            const extensionKey = transformer.path.extension;
            const questionnaireKey = transformer.path.questionnaire;
            if (transformer.path.isCollection) {
                return {
                    [questionnaireKey]: extensions.map((extension) => extension[extensionKey]),
                };
            }

            const result: Record<string, unknown> = {
                [questionnaireKey]: extensions[0]![extensionKey],
            };
            const underscoreElement = extensions[0]![`_${extensionKey}` as keyof FHIRExtension];
            if (underscoreElement !== undefined) {
                result[`_${questionnaireKey}`] = underscoreElement;
            }
            return result as Partial<FCEQuestionnaireItem>;
        }
    }
}

export function convertToFHIRExtension(item: FCEQuestionnaireItem): FHIRExtension[] {
    const extensions: FHIRExtension[] = [...(item.extension ?? [])];

    Object.values(ExtensionIdentifier).forEach((identifier) => {
        const transformer = extensionTransformers[identifier];
        if ('transform' in transformer) {
            extensions.push(...transformer.transform.toExtensions(item));
        } else {
            const value = item[transformer.path.questionnaire];
            if (value !== undefined) {
                const valueArray = Array.isArray(value) ? value : [value];
                const underscoreKey = `_${transformer.path.questionnaire}` as keyof FCEQuestionnaireItem;
                const underscoreElement = !transformer.path.isCollection ? item[underscoreKey] : undefined;

                extensions.push(
                    ...valueArray.map((extensionValue) => {
                        const extension: FHIRExtension = {
                            [transformer.path.extension]: extensionValue,
                            url: identifier,
                        };
                        if (underscoreElement !== undefined) {
                            (extension as Record<string, unknown>)[`_${transformer.path.extension}`] =
                                underscoreElement;
                        }
                        return extension;
                    }),
                );
            }
        }
    });

    return extensions;
}

export { toFirstClassExtension, fromFirstClassExtension, translateQuestionnaire, processLaunchContextToFce };
