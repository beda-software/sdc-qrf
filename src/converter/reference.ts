import { InternalReference } from '@beda.software/aidbox-types';

import { Reference } from 'fhir/r4b';

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
