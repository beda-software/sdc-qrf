import { describe, expect, test } from 'vitest';
import { Reference } from 'fhir/r4';
import { InternalReference } from '@beda.software/aidbox-types';
import { toFHIRReference } from '../index';

describe('toFHIRReference', () => {
    test('should convert Aidbox reference to FHIR reference', () => {
        const sourceReference: InternalReference = {
            id: '123',
            resourceType: 'Patient',
            display: 'John Doe',
        };
        const actualReference = toFHIRReference(sourceReference);
        expect(actualReference).toEqual({
            reference: 'Patient/123',
            display: 'John Doe',
        });
    });

    test('should convert FHIR reference to FHIR reference', () => {
        const sourceReference: Reference = {
            reference: 'Patient/123',
            display: 'John Doe',
        };
        const actualReference = toFHIRReference(sourceReference);
        expect(actualReference).toEqual({
            reference: 'Patient/123',
            display: 'John Doe',
        });
    });
});
