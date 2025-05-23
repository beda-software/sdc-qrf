import { FCEQuestionnaire } from '../../src/fce.types';

export const allergiesQuestionnaire: FCEQuestionnaire = {
    id: 'allergies',
    resourceType: 'Questionnaire',
    name: 'Allergies',
    status: 'active',
    item: [
        {
            linkId: 'type',
            text: 'Type',
            required: true,
            type: 'choice',
            itemControl: {
                coding: [
                    {
                        code: 'inline-choice',
                    },
                ],
            },
            answerOption: [
                {
                    valueCoding: {
                        system: 'http://snomed.ct',
                        code: '418634005',
                        display: 'Drug',
                    },
                },
                {
                    valueCoding: {
                        system: 'http://snomed.ct',
                        code: '414285001',
                        display: 'Food',
                    },
                },
                {
                    valueCoding: {
                        system: 'http://snomed.ct',
                        code: '426232007',
                        display: 'Environmental',
                    },
                },
            ],
        },
        {
            linkId: 'reaction',
            text: 'Reaction',
            type: 'choice',
            repeats: true,
            itemControl: {
                coding: [
                    {
                        code: 'inline-choice',
                    },
                ],
            },
            answerOption: [
                {
                    valueCoding: {
                        system: 'http://snomed.ct',
                        code: '39579001',
                        display: 'Anaphylaxis',
                    },
                },
                {
                    valueCoding: {
                        system: 'http://snomed.ct',
                        code: '25064002',
                        display: 'Headache',
                    },
                },
                {
                    valueCoding: {
                        system: 'http://snomed.ct',
                        code: '247472004',
                        display: 'Hives (Wheal)',
                    },
                },
                {
                    valueCoding: {
                        system: 'http://snomed.ct',
                        code: '422587007',
                        display: 'Nausea',
                    },
                },
                {
                    valueCoding: {
                        system: 'http://snomed.ct',
                        code: '422400008',
                        display: 'Vomiting',
                    },
                },
                {
                    valueCoding: {
                        system: 'http://snomed.ct',
                        code: '782197009',
                        display: 'Other',
                    },
                },
            ],
        },
        {
            linkId: 'substance-drug',
            text: 'Substance',
            type: 'choice',
            itemControl: {
                coding: [
                    {
                        code: 'inline-choice',
                    },
                ],
            },
            enableWhen: [
                {
                    question: 'type',
                    operator: '=',
                    answerCoding: {
                        system: 'http://snomed.ct',
                        code: '418634005',
                    },
                },
            ],
            answerOption: [
                {
                    valueCoding: {
                        system: 'http://loinc.org',
                        code: 'LA26702-3',
                        display: 'Aspirin',
                    },
                },
                {
                    valueCoding: {
                        system: 'http://loinc.org',
                        code: '\tLA30119-4',
                        display: 'Iodine',
                    },
                },
                {
                    valueCoding: {
                        system: 'http://loinc.org',
                        code: 'LA14348-9',
                        display: 'Naproxen, ketoprofen or other non-steroidal',
                    },
                },
                {
                    valueCoding: {
                        system: 'http://loinc.org',
                        code: 'LA28487-9',
                        display: 'Penicillin',
                    },
                },
                {
                    valueCoding: {
                        system: 'http://loinc.org',
                        code: 'LA30118-6',
                        display: 'Sulfa drugs',
                    },
                },
            ],
        },
        {
            linkId: 'substance-food',
            text: 'Substance',
            type: 'choice',
            itemControl: {
                coding: [
                    {
                        code: 'inline-choice',
                    },
                ],
            },
            enableWhen: [
                {
                    question: 'type',
                    operator: '=',
                    answerCoding: {
                        system: 'http://snomed.ct',
                        code: '414285001',
                    },
                },
            ],
            answerOption: [
                {
                    valueCoding: {
                        system: 'http://snomed.ct',
                        code: '102259006',
                        display: 'Citrus fruit',
                    },
                },
                {
                    valueCoding: {
                        system: 'http://snomed.ct',
                        code: '102260001',
                        display: 'Peanut butter',
                    },
                },
                {
                    valueCoding: {
                        system: 'http://snomed.ct',
                        code: '102261002',
                        display: 'Strawberry',
                    },
                },
                {
                    valueCoding: {
                        system: 'http://snomed.ct',
                        code: '102262009',
                        display: 'Chocolate',
                    },
                },
                {
                    valueCoding: {
                        system: 'http://snomed.ct',
                        code: '102263004',
                        display: 'Eggs',
                    },
                },
                {
                    valueCoding: {
                        system: 'http://snomed.ct',
                        code: '102264005',
                        display: 'Cheese',
                    },
                },
            ],
        },
        {
            linkId: 'substance-environmental',
            text: 'Substance',
            type: 'choice',
            itemControl: {
                coding: [
                    {
                        code: 'inline-choice',
                    },
                ],
            },
            enableWhen: [
                {
                    question: 'type',
                    operator: '=',
                    answerCoding: {
                        system: 'http://snomed.ct',
                        code: '426232007',
                    },
                },
            ],
            answerOption: [
                {
                    valueCoding: {
                        system: 'http://snomed.ct',
                        code: '111088007',
                        display: 'Latex',
                    },
                },
                {
                    valueCoding: {
                        system: 'http://snomed.ct',
                        code: '256259004',
                        display: 'Pollen',
                    },
                },
                {
                    valueCoding: {
                        system: 'http://snomed.ct',
                        code: '256277009',
                        display: 'Grass pollen',
                    },
                },
                {
                    valueCoding: {
                        system: 'http://snomed.ct',
                        code: '256417003',
                        display: 'Horse dander',
                    },
                },
            ],
        },
        {
            linkId: 'notes',
            text: 'Notes',
            type: 'string',
        },
    ],
};
