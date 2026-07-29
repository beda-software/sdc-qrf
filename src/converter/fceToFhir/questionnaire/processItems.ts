import { QuestionnaireItem as FHIRQuestionnaireItem } from 'fhir/r4b';
import _ from 'lodash';

import { convertFromFHIRExtension, convertToFHIRExtension } from '../..';
import { processPrimitiveExtensions } from '../utils';
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

        const { item: nestedItems, ...rest } = item;
        const fhirItem = processPrimitiveExtensions(rest) as FHIRQuestionnaireItem;

        if (nestedItems) {
            fhirItem.item = processItems(nestedItems);
        }

        return fhirItem;
    });
}
