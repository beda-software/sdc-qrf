import { Questionnaire as FHIRQuestionnaire } from 'fhir/r4b';
import { describe, expect, test } from 'vitest';
import cloneDeep from 'lodash/cloneDeep';

import { translateQuestionnaire } from '../fhirToFce/translateQuestionnaire';
import fhir_gad_7 from './resources/questionnaire_fhir/gad_7.json';

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
    test('translates item.text and nested item.text for the requested language', () => {
        const result = translateQuestionnaire(translationQuestionnaire, 'fr');

        const expected: FHIRQuestionnaire = {
            resourceType: 'Questionnaire',
            status: 'active',
            language: 'fr',
            title: 'Formulaire de motif de consultation',
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
                    {
                        url: 'http://hl7.org/fhir/StructureDefinition/translation',
                        extension: [
                            { url: 'lang', valueCode: 'en' },
                            { url: 'content', valueString: 'Chief complaint form' },
                        ],
                    },
                ],
            },
            item: [
                {
                    linkId: 'chief-complaint',
                    type: 'string',
                    text: 'Motif de consultation',
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
                            {
                                url: 'http://hl7.org/fhir/StructureDefinition/translation',
                                extension: [
                                    { url: 'lang', valueCode: 'en' },
                                    { url: 'content', valueString: 'Chief complaint' },
                                ],
                            },
                        ],
                    },
                    item: [
                        {
                            linkId: 'details',
                            type: 'string',
                            text: 'Détails',
                            _text: {
                                extension: [
                                    {
                                        url: 'http://hl7.org/fhir/StructureDefinition/translation',
                                        extension: [
                                            { url: 'lang', valueCode: 'fr' },
                                            { url: 'content', valueString: 'Détails' },
                                        ],
                                    },
                                    {
                                        url: 'http://hl7.org/fhir/StructureDefinition/translation',
                                        extension: [
                                            { url: 'lang', valueCode: 'en' },
                                            { url: 'content', valueString: 'Details' },
                                        ],
                                    },
                                ],
                            },
                        },
                    ],
                },
            ],
        };

        expect(result).toEqual(expected);
    });

    test('translates Questionnaire.title', () => {
        const result = translateQuestionnaire(translationQuestionnaire, 'de');

        const expected: FHIRQuestionnaire = {
            resourceType: 'Questionnaire',
            status: 'active',
            language: 'de',
            title: 'Formular für Hauptbeschwerde',
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
                    {
                        url: 'http://hl7.org/fhir/StructureDefinition/translation',
                        extension: [
                            { url: 'lang', valueCode: 'en' },
                            { url: 'content', valueString: 'Chief complaint form' },
                        ],
                    },
                ],
            },
            item: [
                {
                    linkId: 'chief-complaint',
                    type: 'string',
                    text: 'Hauptbeschwerde',
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
                            {
                                url: 'http://hl7.org/fhir/StructureDefinition/translation',
                                extension: [
                                    { url: 'lang', valueCode: 'en' },
                                    { url: 'content', valueString: 'Chief complaint' },
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

        expect(result).toEqual(expected);
    });

    test('keeps original value and translation extensions when language is missing', () => {
        const result = translateQuestionnaire(translationQuestionnaire, 'es');

        expect(result).toEqual(translationQuestionnaire);
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

        const expected: FHIRQuestionnaire = {
            resourceType: 'Questionnaire',
            status: 'active',
            language: 'fr',
            item: [
                {
                    linkId: 'input-1',
                    type: 'string',
                    text: 'Libellé',
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
                            {
                                url: 'http://hl7.org/fhir/StructureDefinition/translation',
                                extension: [
                                    { url: 'lang', valueCode: 'en' },
                                    { url: 'content', valueString: 'Default label' },
                                ],
                            },
                        ],
                    },
                },
            ],
        };

        expect(result).toEqual(expected);
    });

    test('stashes original under Questionnaire.language when present', () => {
        const questionnaire: FHIRQuestionnaire = {
            ...cloneDeep(translationQuestionnaire),
            language: 'en-US',
        };

        const result = translateQuestionnaire(questionnaire, 'fr');

        expect(result.language).toBe('fr');
        expect(result._title?.extension).toEqual(
            expect.arrayContaining([
                {
                    url: 'http://hl7.org/fhir/StructureDefinition/translation',
                    extension: [
                        { url: 'lang', valueCode: 'en-US' },
                        { url: 'content', valueString: 'Chief complaint form' },
                    ],
                },
            ]),
        );
        expect(result.item?.[0]._text?.extension).toEqual(
            expect.arrayContaining([
                {
                    url: 'http://hl7.org/fhir/StructureDefinition/translation',
                    extension: [
                        { url: 'lang', valueCode: 'en-US' },
                        { url: 'content', valueString: 'Chief complaint' },
                    ],
                },
            ]),
        );
    });

    test('leaves questionnaires without translations unchanged', () => {
        const result = translateQuestionnaire(fhir_gad_7 as FHIRQuestionnaire, 'fr');

        expect(result).toStrictEqual(fhir_gad_7);
    });

    test('does not mutate the input questionnaire', () => {
        const original = cloneDeep(translationQuestionnaire);
        translateQuestionnaire(translationQuestionnaire, 'fr');

        expect(translationQuestionnaire).toStrictEqual(original);
    });
});
