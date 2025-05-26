import { QuestionnaireItem as FHIRQuestionnaireItem, Meta, Reference } from 'fhir/r4b';
import { InternalReference } from '@beda.software/aidbox-types';
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

// These two functions fromFHIRReference,toFHIRReference are very useful
// EMR-based projects uses it
export function fromFHIRReference(r?: Reference): InternalReference | undefined {
    if (!r || !r.reference) {
        return undefined;
    }

    // We remove original reference from r in this "strange" way
    // TODO: re-write omitting
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { reference: literalReference, ...commonReferenceProperties } = r;
    const isHistoryVersionLink = r.reference.split('/').slice(-2, -1)[0] === '_history';

    if (isHistoryVersionLink) {
        const [, , id, resourceType] = r.reference.split('/').reverse();

        return {
            ...commonReferenceProperties,
            id: id!,
            resourceType,
        };
    } else {
        const [id, resourceType] = r.reference.split('/').reverse();

        return {
            ...commonReferenceProperties,
            id: id!,
            resourceType,
        };
    }
}

export function toFHIRReference(r?: InternalReference): Reference | undefined {
    if (!r) {
        return undefined;
    }

    const { id, resourceType, ...commonReferenceProperties } = r;

    delete commonReferenceProperties.resource;

    return {
        ...commonReferenceProperties,
        reference: `${resourceType}/${id}`,
    };
}
