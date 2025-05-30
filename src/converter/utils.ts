import { QuestionnaireItem as FHIRQuestionnaireItem, Meta } from 'fhir/r4b';
import cloneDeep from 'lodash/cloneDeep';

function sortExtensionsRecursive(object: any) {
    if (typeof object !== 'object' || object === null) {
        return object;
    }
    for (const [key, property] of Object.entries(object)) {
        if (Array.isArray(property)) {
            if (key === 'extension') {
                property.sort((a, b) => (a.url === b.url ? 0 : a.url < b.url ? -1 : 1));
            }
            for (const nestedProperty of property) {
                sortExtensionsRecursive(nestedProperty);
            }
        } else {
            sortExtensionsRecursive(property);
        }
    }
    return object;
}

export function sortExtensionsList(object: any) {
    return sortExtensionsRecursive(cloneDeep(object));
}

export function filterQuestionnaireItemExtensions(item: FHIRQuestionnaireItem, url: string) {
    return item.extension?.filter((ext) => ext.url === url);
}

export function extractCreatedAtFromMeta(meta: Meta | undefined) {
    return meta?.extension?.find((e) => e.url === 'ex:createdAt')?.valueInstant;
}
