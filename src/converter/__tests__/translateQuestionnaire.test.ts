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

        expect(result).toMatchInlineSnapshot(`
          {
            "_title": {
              "extension": [
                {
                  "extension": [
                    {
                      "url": "lang",
                      "valueCode": "de",
                    },
                    {
                      "url": "content",
                      "valueString": "Formular für Hauptbeschwerde",
                    },
                  ],
                  "url": "http://hl7.org/fhir/StructureDefinition/translation",
                },
                {
                  "extension": [
                    {
                      "url": "lang",
                      "valueCode": "fr",
                    },
                    {
                      "url": "content",
                      "valueString": "Formulaire de motif de consultation",
                    },
                  ],
                  "url": "http://hl7.org/fhir/StructureDefinition/translation",
                },
                {
                  "extension": [
                    {
                      "url": "lang",
                      "valueCode": "en",
                    },
                    {
                      "url": "content",
                      "valueString": "Chief complaint form",
                    },
                  ],
                  "url": "http://hl7.org/fhir/StructureDefinition/translation",
                },
              ],
            },
            "item": [
              {
                "_text": {
                  "extension": [
                    {
                      "extension": [
                        {
                          "url": "lang",
                          "valueCode": "de",
                        },
                        {
                          "url": "content",
                          "valueString": "Hauptbeschwerde",
                        },
                      ],
                      "url": "http://hl7.org/fhir/StructureDefinition/translation",
                    },
                    {
                      "extension": [
                        {
                          "url": "lang",
                          "valueCode": "fr",
                        },
                        {
                          "url": "content",
                          "valueString": "Motif de consultation",
                        },
                      ],
                      "url": "http://hl7.org/fhir/StructureDefinition/translation",
                    },
                    {
                      "extension": [
                        {
                          "url": "lang",
                          "valueCode": "en",
                        },
                        {
                          "url": "content",
                          "valueString": "Chief complaint",
                        },
                      ],
                      "url": "http://hl7.org/fhir/StructureDefinition/translation",
                    },
                  ],
                },
                "item": [
                  {
                    "_text": {
                      "extension": [
                        {
                          "extension": [
                            {
                              "url": "lang",
                              "valueCode": "fr",
                            },
                            {
                              "url": "content",
                              "valueString": "Détails",
                            },
                          ],
                          "url": "http://hl7.org/fhir/StructureDefinition/translation",
                        },
                        {
                          "extension": [
                            {
                              "url": "lang",
                              "valueCode": "en",
                            },
                            {
                              "url": "content",
                              "valueString": "Details",
                            },
                          ],
                          "url": "http://hl7.org/fhir/StructureDefinition/translation",
                        },
                      ],
                    },
                    "linkId": "details",
                    "text": "Détails",
                    "type": "string",
                  },
                ],
                "linkId": "chief-complaint",
                "text": "Motif de consultation",
                "type": "string",
              },
            ],
            "language": "fr",
            "resourceType": "Questionnaire",
            "status": "active",
            "title": "Formulaire de motif de consultation",
          }
        `);
    });

    test('translates Questionnaire.title', () => {
        const result = translateQuestionnaire(translationQuestionnaire, 'de');

        expect(result).toMatchInlineSnapshot(`
          {
            "_title": {
              "extension": [
                {
                  "extension": [
                    {
                      "url": "lang",
                      "valueCode": "de",
                    },
                    {
                      "url": "content",
                      "valueString": "Formular für Hauptbeschwerde",
                    },
                  ],
                  "url": "http://hl7.org/fhir/StructureDefinition/translation",
                },
                {
                  "extension": [
                    {
                      "url": "lang",
                      "valueCode": "fr",
                    },
                    {
                      "url": "content",
                      "valueString": "Formulaire de motif de consultation",
                    },
                  ],
                  "url": "http://hl7.org/fhir/StructureDefinition/translation",
                },
                {
                  "extension": [
                    {
                      "url": "lang",
                      "valueCode": "en",
                    },
                    {
                      "url": "content",
                      "valueString": "Chief complaint form",
                    },
                  ],
                  "url": "http://hl7.org/fhir/StructureDefinition/translation",
                },
              ],
            },
            "item": [
              {
                "_text": {
                  "extension": [
                    {
                      "extension": [
                        {
                          "url": "lang",
                          "valueCode": "de",
                        },
                        {
                          "url": "content",
                          "valueString": "Hauptbeschwerde",
                        },
                      ],
                      "url": "http://hl7.org/fhir/StructureDefinition/translation",
                    },
                    {
                      "extension": [
                        {
                          "url": "lang",
                          "valueCode": "fr",
                        },
                        {
                          "url": "content",
                          "valueString": "Motif de consultation",
                        },
                      ],
                      "url": "http://hl7.org/fhir/StructureDefinition/translation",
                    },
                    {
                      "extension": [
                        {
                          "url": "lang",
                          "valueCode": "en",
                        },
                        {
                          "url": "content",
                          "valueString": "Chief complaint",
                        },
                      ],
                      "url": "http://hl7.org/fhir/StructureDefinition/translation",
                    },
                  ],
                },
                "item": [
                  {
                    "_text": {
                      "extension": [
                        {
                          "extension": [
                            {
                              "url": "lang",
                              "valueCode": "fr",
                            },
                            {
                              "url": "content",
                              "valueString": "Détails",
                            },
                          ],
                          "url": "http://hl7.org/fhir/StructureDefinition/translation",
                        },
                      ],
                    },
                    "linkId": "details",
                    "text": "Details",
                    "type": "string",
                  },
                ],
                "linkId": "chief-complaint",
                "text": "Hauptbeschwerde",
                "type": "string",
              },
            ],
            "language": "de",
            "resourceType": "Questionnaire",
            "status": "active",
            "title": "Formular für Hauptbeschwerde",
          }
        `);
    });

    test('keeps original value and translation extensions when language is missing', () => {
        const result = translateQuestionnaire(translationQuestionnaire, 'es');

        expect(result).toMatchInlineSnapshot(`
          {
            "_title": {
              "extension": [
                {
                  "extension": [
                    {
                      "url": "lang",
                      "valueCode": "de",
                    },
                    {
                      "url": "content",
                      "valueString": "Formular für Hauptbeschwerde",
                    },
                  ],
                  "url": "http://hl7.org/fhir/StructureDefinition/translation",
                },
                {
                  "extension": [
                    {
                      "url": "lang",
                      "valueCode": "fr",
                    },
                    {
                      "url": "content",
                      "valueString": "Formulaire de motif de consultation",
                    },
                  ],
                  "url": "http://hl7.org/fhir/StructureDefinition/translation",
                },
              ],
            },
            "item": [
              {
                "_text": {
                  "extension": [
                    {
                      "extension": [
                        {
                          "url": "lang",
                          "valueCode": "de",
                        },
                        {
                          "url": "content",
                          "valueString": "Hauptbeschwerde",
                        },
                      ],
                      "url": "http://hl7.org/fhir/StructureDefinition/translation",
                    },
                    {
                      "extension": [
                        {
                          "url": "lang",
                          "valueCode": "fr",
                        },
                        {
                          "url": "content",
                          "valueString": "Motif de consultation",
                        },
                      ],
                      "url": "http://hl7.org/fhir/StructureDefinition/translation",
                    },
                  ],
                },
                "item": [
                  {
                    "_text": {
                      "extension": [
                        {
                          "extension": [
                            {
                              "url": "lang",
                              "valueCode": "fr",
                            },
                            {
                              "url": "content",
                              "valueString": "Détails",
                            },
                          ],
                          "url": "http://hl7.org/fhir/StructureDefinition/translation",
                        },
                      ],
                    },
                    "linkId": "details",
                    "text": "Details",
                    "type": "string",
                  },
                ],
                "linkId": "chief-complaint",
                "text": "Chief complaint",
                "type": "string",
              },
            ],
            "resourceType": "Questionnaire",
            "status": "active",
            "title": "Chief complaint form",
          }
        `);
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

        expect(result).toMatchInlineSnapshot(`
          {
            "item": [
              {
                "_text": {
                  "extension": [
                    {
                      "url": "http://hl7.org/fhir/StructureDefinition/cqf-expression",
                      "valueExpression": {
                        "expression": "'Computed'",
                        "language": "text/fhirpath",
                      },
                    },
                    {
                      "extension": [
                        {
                          "url": "lang",
                          "valueCode": "fr",
                        },
                        {
                          "url": "content",
                          "valueString": "Libellé",
                        },
                      ],
                      "url": "http://hl7.org/fhir/StructureDefinition/translation",
                    },
                    {
                      "extension": [
                        {
                          "url": "lang",
                          "valueCode": "en",
                        },
                        {
                          "url": "content",
                          "valueString": "Default label",
                        },
                      ],
                      "url": "http://hl7.org/fhir/StructureDefinition/translation",
                    },
                  ],
                },
                "linkId": "input-1",
                "text": "Libellé",
                "type": "string",
              },
            ],
            "language": "fr",
            "resourceType": "Questionnaire",
            "status": "active",
          }
        `);
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
