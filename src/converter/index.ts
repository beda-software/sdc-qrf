import { Extension as FHIRExtension } from 'fhir/r4b';

import { ExtensionIdentifier, extensionTransformers } from './extensions';
import { fromFirstClassExtension } from './fceToFhir';
import { toFirstClassExtension } from './fhirToFce';
import { processLaunchContext as processLaunchContextToFce } from './fhirToFce/questionnaire/processExtensions';
import { FCEQuestionnaireItem } from '../fce.types';
export * from './utils';

export function convertFromFHIRExtension(extensions: FHIRExtension[]): Partial<FCEQuestionnaireItem> | undefined {
    const identifier = extensions[0]!.url;
    const transformer = extensionTransformers[identifier as ExtensionIdentifier];
    if (transformer !== undefined) {
        if ('transform' in transformer) {
            return transformer.transform.fromExtensions(extensions);
        } else {
            return {
                [transformer.path.questionnaire]: transformer.path.isCollection
                    ? extensions.map((extension) => extension[transformer.path.extension])
                    : extensions[0]![transformer.path.extension],
            };
        }
    }
}

export function convertToFHIRExtension(item: FCEQuestionnaireItem): FHIRExtension[] {
    const extensions: FHIRExtension[] = [];
    Object.values(ExtensionIdentifier).forEach((identifier) => {
        const transformer = extensionTransformers[identifier];
        if ('transform' in transformer) {
            extensions.push(...transformer.transform.toExtensions(item));
        } else {
            const value = item[transformer.path.questionnaire];
            if (value !== undefined) {
                const valueArray = Array.isArray(value) ? value : [value];

                extensions.push(
                    ...valueArray.map((extensionValue) => ({
                        [transformer.path.extension]: extensionValue,
                        url: identifier,
                    })),
                );
            }
        }
    });
    return extensions;
}

export { toFirstClassExtension, fromFirstClassExtension, processLaunchContextToFce };
