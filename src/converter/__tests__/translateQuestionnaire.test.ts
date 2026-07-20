import { Questionnaire as FHIRQuestionnaire } from 'fhir/r4b';
import { describe, expect, test } from 'vitest';
import cloneDeep from 'lodash/cloneDeep';

import { translateQuestionnaire } from '../fhirToFce/translateQuestionnaire';

const translationQuestionnaire: FHIRQuestionnaire = {
    resourceType: 'Questionnaire',
    status: 'active',
    title: 'Chief complaint form',
    _title: {
        extension: [
            {
                url: 'http://hl7.org/fhir/StructureDefinition/translation',
                extension: [
                    { url: 'lang', valueCode: 'de' },
                    { url: 'content', valueString: 'Formular für Hauptbeschwerde' },
                ],
            },
            {
                url: 'http://hl7.org/fhir/StructureDefinition/translation',
                extension: [
                    { url: 'lang', valueCode: 'fr' },
                    { url: 'content', valueString: 'Formulaire de motif de consultation' },
                ],
            },
        ],
    },
    item: [
        {
            linkId: 'chief-complaint',
            type: 'string',
            text: 'Chief complaint',
            _text: {
                extension: [
                    {
                        url: 'http://hl7.org/fhir/StructureDefinition/translation',
                        extension: [
                            { url: 'lang', valueCode: 'de' },
                            { url: 'content', valueString: 'Hauptbeschwerde' },
                        ],
                    },
                    {
                        url: 'http://hl7.org/fhir/StructureDefinition/translation',
                        extension: [
                            { url: 'lang', valueCode: 'fr' },
                            { url: 'content', valueString: 'Motif de consultation' },
                        ],
                    },
                ],
            },
            item: [
                {
                    linkId: 'details',
                    type: 'string',
                    text: 'Details',
                    _text: {
                        extension: [
                            {
                                url: 'http://hl7.org/fhir/StructureDefinition/translation',
                                extension: [
                                    { url: 'lang', valueCode: 'fr' },
                                    { url: 'content', valueString: 'Détails' },
                                ],
                            },
                        ],
                    },
                },
            ],
        },
    ],
};

describe('translateQuestionnaire', () => {
    test('translates item.text for the requested language', () => {
        const result = translateQuestionnaire(translationQuestionnaire, 'fr');

        expect(result.item?.[0]?.text).toBe('Motif de consultation');
        expect(result.item?.[0]?._text).toBeUndefined();
    });

    test('translates nested item.text', () => {
        const result = translateQuestionnaire(translationQuestionnaire, 'fr');

        expect(result.item?.[0]?.item?.[0]?.text).toBe('Détails');
        expect(result.item?.[0]?.item?.[0]?._text).toBeUndefined();
    });

    test('translates Questionnaire.title', () => {
        const result = translateQuestionnaire(translationQuestionnaire, 'de');

        expect(result.title).toBe('Formular für Hauptbeschwerde');
        expect(result._title).toBeUndefined();
        expect(result.item?.[0]?.text).toBe('Hauptbeschwerde');
    });

    test('keeps original value when language is missing and strips translation extensions', () => {
        const result = translateQuestionnaire(translationQuestionnaire, 'es');

        expect(result.title).toBe('Chief complaint form');
        expect(result._title).toBeUndefined();
        expect(result.item?.[0]?.text).toBe('Chief complaint');
        expect(result.item?.[0]?._text).toBeUndefined();
    });

    test('preserves unrelated extensions on the same primitive element', () => {
        const questionnaire: FHIRQuestionnaire = {
            resourceType: 'Questionnaire',
            status: 'active',
            item: [
                {
                    linkId: 'input-1',
                    type: 'string',
                    text: 'Default label',
                    _text: {
                        extension: [
                            {
                                url: 'http://hl7.org/fhir/StructureDefinition/cqf-expression',
                                valueExpression: {
                                    language: 'text/fhirpath',
                                    expression: "'Computed'",
                                },
                            },
                            {
                                url: 'http://hl7.org/fhir/StructureDefinition/translation',
                                extension: [
                                    { url: 'lang', valueCode: 'fr' },
                                    { url: 'content', valueString: 'Libellé' },
                                ],
                            },
                        ],
                    },
                },
            ],
        };

        const result = translateQuestionnaire(questionnaire, 'fr');

        expect(result.item?.[0]?.text).toBe('Libellé');
        expect(result.item?.[0]?._text).toEqual({
            extension: [
                {
                    url: 'http://hl7.org/fhir/StructureDefinition/cqf-expression',
                    valueExpression: {
                        language: 'text/fhirpath',
                        expression: "'Computed'",
                    },
                },
            ],
        });
    });

    test('does not mutate the input questionnaire', () => {
        const original = cloneDeep(translationQuestionnaire);
        translateQuestionnaire(translationQuestionnaire, 'fr');

        expect(translationQuestionnaire).toStrictEqual(original);
    });
});
