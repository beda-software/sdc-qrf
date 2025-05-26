import { QuestionnaireItem as FHIRQuestionnaireItem } from 'fhir/r4b';
import _ from 'lodash';

import { convertFromFHIRExtension, convertToFHIRExtension } from '../..';
import { FCEQuestionnaireItem } from '../../../fce.types';

export function processItems(items: FCEQuestionnaireItem[]): FHIRQuestionnaireItem[] {
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
            type: type,
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
            fhirItem.answerOption = answerOption;
        }

        if (enableBehavior !== undefined) {
            fhirItem.enableBehavior = enableBehavior;
        }

        if (enableWhen !== undefined) {
            fhirItem.enableWhen = enableWhen;
        }

        if (initial) {
            fhirItem.initial = initial;
        }

        if (nestedItems) {
            fhirItem.item = processItems(nestedItems);
        }

        return fhirItem;
    });
}
