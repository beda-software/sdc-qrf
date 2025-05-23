import { describe, expect, test } from 'vitest';

import { allergiesQuestionnaire } from './resources/questionnaire';
import {
    getChoiceTypeValue,
    getEnabledQuestions,
    isValueEmpty,
    mapFormToResponse,
    mapResponseToForm,
    removeDisabledAnswers,
    toAnswerValue,
    toFHIRAnswerValue,
} from '../src/utils';
import { QuestionnaireResponse, QuestionnaireResponseItem } from 'fhir/r4b';
import { FCEQuestionnaire, FCEQuestionnaireItem } from '../src/fce.types';

test('Transform nested repeatable-groups from new resource to new resource', () => {
    const questionnaire: FCEQuestionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        item: [
            {
                linkId: 'root-group',
                type: 'group',
                text: 'Root group',
                item: [
                    {
                        linkId: 'repeatable-group',
                        type: 'group',
                        repeats: true,
                        text: 'Repeatable group',
                        item: [
                            { linkId: 'answer', text: 'Answer', type: 'text', repeats: true },
                            {
                                linkId: 'nested-repeatable-group',
                                text: 'Nested repeatable group',
                                repeats: true,
                                type: 'group',
                                item: [
                                    {
                                        linkId: 'nested-answer',
                                        text: 'Nested answer',
                                        type: 'text',
                                        repeats: true,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    };

    const qr: QuestionnaireResponse = {
        resourceType: 'QuestionnaireResponse',
        status: 'completed',
        item: [
            {
                linkId: 'root-group',
                item: [
                    {
                        linkId: 'repeatable-group',
                        item: [
                            {
                                linkId: 'answer',
                                answer: [
                                    { valueString: 'answer for the first group 1' },
                                    { valueString: 'answer for the first group 2' },
                                ],
                            },
                            {
                                linkId: 'nested-repeatable-group',
                                item: [
                                    {
                                        linkId: 'nested-answer',

                                        answer: [
                                            {
                                                valueString: 'nested answer for the first group 1',
                                            },
                                            {
                                                valueString: 'nested answer for the first group 2',
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        linkId: 'repeatable-group',
                        item: [
                            {
                                linkId: 'answer',
                                answer: [
                                    { valueString: 'answer for the second group 1' },
                                    { valueString: 'answer for the second group 2' },
                                ],
                            },
                            {
                                linkId: 'nested-repeatable-group',
                                item: [
                                    {
                                        linkId: 'nested-answer',

                                        answer: [
                                            {
                                                valueString: 'nested answer for the second group 1',
                                            },
                                            {
                                                valueString: 'nested answer for the second group 2',
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    };
    const formItems = mapResponseToForm(qr, questionnaire);
    const actualQR = { ...qr, ...mapFormToResponse(formItems, questionnaire) };

    expect(actualQR).toEqual(qr);
});

test('Transform with initial values', () => {
    const questionnaire: FCEQuestionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        item: [
            {
                linkId: 'root-group',
                type: 'group',
                text: 'Root group',
                item: [
                    {
                        linkId: 'answer-without-initial',
                        type: 'text',
                    },
                    {
                        linkId: 'answer-with-initial',
                        type: 'text',
                        initial: [{ valueString: 'initial' }],
                    },
                ],
            },
        ],
    };

    const initialQR: QuestionnaireResponse = {
        resourceType: 'QuestionnaireResponse',
        status: 'completed',
        item: [
            {
                linkId: 'root-group',
            },
        ],
    };
    const expectedQR: QuestionnaireResponse = {
        resourceType: 'QuestionnaireResponse',
        status: 'completed',
        item: [
            {
                linkId: 'root-group',
                item: [{ linkId: 'answer-with-initial', answer: [{ valueString: 'initial' }] }],
            },
        ],
    };
    const formItems = mapResponseToForm(initialQR, questionnaire);
    const actualQR = { ...initialQR, ...mapFormToResponse(formItems, questionnaire) };

    expect(actualQR).toEqual(expectedQR);
});

test('enableWhen logic for non-repeatable groups', () => {
    const questionnaire: FCEQuestionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        item: [
            {
                linkId: 'root-group',
                type: 'group',
                text: 'Root group',
                item: [
                    {
                        linkId: 'non-repeatable-group',
                        type: 'group',
                        text: 'Non Repeatable group',
                        item: [
                            { linkId: 'condition', text: 'Condition', type: 'boolean' },
                            {
                                linkId: 'question-for-yes',
                                text: 'Question for yes',
                                type: 'text',
                                enableWhen: [
                                    {
                                        question: 'condition',
                                        operator: '=',
                                        answerBoolean: true,
                                    },
                                ],
                            },
                            {
                                linkId: 'question-for-no',
                                text: 'Question for no',
                                type: 'text',
                                enableWhen: [
                                    {
                                        question: 'condition',
                                        operator: '=',
                                        answerBoolean: false,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    };

    const qr: QuestionnaireResponse = {
        resourceType: 'QuestionnaireResponse',
        status: 'completed',
        item: [
            {
                linkId: 'root-group',
                item: [
                    {
                        linkId: 'non-repeatable-group',
                        item: [
                            {
                                linkId: 'condition',
                                answer: [{ valueBoolean: true }],
                            },
                            {
                                linkId: 'question-for-yes',
                                answer: [{ valueString: 'yes' }],
                            },
                            {
                                linkId: 'question-for-no',
                                answer: [{ valueString: 'no' }],
                            },
                        ],
                    },
                ],
            },
        ],
    };
    const expectedQR: QuestionnaireResponse = {
        resourceType: 'QuestionnaireResponse',
        status: 'completed',
        item: [
            {
                linkId: 'root-group',
                item: [
                    {
                        linkId: 'non-repeatable-group',
                        item: [
                            {
                                linkId: 'condition',
                                answer: [{ valueBoolean: true }],
                            },
                            {
                                linkId: 'question-for-yes',
                                answer: [{ valueString: 'yes' }],
                            },
                        ],
                    },
                ],
            },
        ],
    };
    const formItems = mapResponseToForm(qr, questionnaire);
    const enabledFormItems = removeDisabledAnswers(questionnaire, formItems, {
        questionnaire,
        resource: qr,
        context: qr,
    });
    const actualQR = { ...qr, ...mapFormToResponse(enabledFormItems, questionnaire) };

    expect(actualQR).toEqual(expectedQR);
});

test('enableWhen logic for repeatable groups', () => {
    const questionnaire: FCEQuestionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        item: [
            {
                linkId: 'root-group',
                type: 'group',
                text: 'Root group',
                item: [
                    {
                        linkId: 'repeatable-group',
                        type: 'group',
                        repeats: true,
                        text: 'Repeatable group',
                        item: [
                            { linkId: 'condition', text: 'Condition', type: 'boolean' },
                            {
                                linkId: 'question-for-yes',
                                text: 'Question for yes',
                                type: 'text',
                                enableWhen: [
                                    {
                                        question: 'condition',
                                        operator: '=',
                                        answerBoolean: true,
                                    },
                                ],
                            },
                            {
                                linkId: 'question-for-no',
                                text: 'Question for no',
                                type: 'text',
                                enableWhen: [
                                    {
                                        question: 'condition',
                                        operator: '=',
                                        answerBoolean: false,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    };

    const qr: QuestionnaireResponse = {
        resourceType: 'QuestionnaireResponse',
        status: 'completed',
        item: [
            {
                linkId: 'root-group',
                item: [
                    {
                        linkId: 'repeatable-group',
                        item: [
                            {
                                linkId: 'condition',
                                answer: [{ valueBoolean: true }],
                            },
                            {
                                linkId: 'question-for-yes',
                                answer: [{ valueString: 'yes' }],
                            },
                            {
                                linkId: 'question-for-no',
                                answer: [{ valueString: 'no' }],
                            },
                        ],
                    },
                    {
                        linkId: 'repeatable-group',
                        item: [
                            {
                                linkId: 'condition',
                                answer: [{ valueBoolean: false }],
                            },
                            {
                                linkId: 'question-for-yes',
                                answer: [{ valueString: 'yes' }],
                            },
                            {
                                linkId: 'question-for-no',
                                answer: [{ valueString: 'no' }],
                            },
                        ],
                    },
                ],
            },
        ],
    };
    const expectedQR: QuestionnaireResponse = {
        resourceType: 'QuestionnaireResponse',
        status: 'completed',
        item: [
            {
                linkId: 'root-group',
                item: [
                    {
                        linkId: 'repeatable-group',
                        item: [
                            {
                                linkId: 'condition',
                                answer: [{ valueBoolean: true }],
                            },
                            {
                                linkId: 'question-for-yes',
                                answer: [{ valueString: 'yes' }],
                            },
                        ],
                    },
                    {
                        linkId: 'repeatable-group',
                        item: [
                            {
                                linkId: 'condition',
                                answer: [{ valueBoolean: false }],
                            },
                            {
                                linkId: 'question-for-no',
                                answer: [{ valueString: 'no' }],
                            },
                        ],
                    },
                ],
            },
        ],
    };
    const formItems = mapResponseToForm(qr, questionnaire);
    const enabledFormItems = removeDisabledAnswers(questionnaire, formItems, {
        questionnaire,
        resource: qr,
        context: qr,
    });
    const actualQR = { ...qr, ...mapFormToResponse(enabledFormItems, questionnaire) };

    expect(actualQR).toEqual(expectedQR);
});

test('enableWhenExpression logic', () => {
    const questionnaire: FCEQuestionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        item: [
            {
                linkId: 'root-group',
                type: 'group',
                text: 'Root group',
                item: [
                    {
                        linkId: 'non-repeatable-group',
                        type: 'group',
                        text: 'Non Repeatable group',
                        item: [
                            { linkId: 'condition', text: 'Condition', type: 'boolean' },
                            {
                                linkId: 'question-for-yes',
                                text: 'Question for yes',
                                type: 'text',
                                enableWhenExpression: {
                                    language: 'text/fhirpath',
                                    expression:
                                        "%resource.repeat(item).where(linkId = 'condition').answer.valueBoolean = true",
                                },
                            },
                            {
                                linkId: 'question-for-no',
                                text: 'Question for no',
                                type: 'text',
                                enableWhenExpression: {
                                    language: 'text/fhirpath',
                                    expression:
                                        "%resource.repeat(item).where(linkId = 'condition').answer.valueBoolean = false",
                                },
                            },
                        ],
                    },
                ],
            },
        ],
    };

    const qr: QuestionnaireResponse = {
        resourceType: 'QuestionnaireResponse',
        status: 'completed',
        item: [
            {
                linkId: 'root-group',
                item: [
                    {
                        linkId: 'non-repeatable-group',
                        item: [
                            {
                                linkId: 'condition',
                                answer: [{ valueBoolean: true }],
                            },
                            {
                                linkId: 'question-for-yes',
                                answer: [{ valueString: 'yes' }],
                            },
                            {
                                linkId: 'question-for-no',
                                answer: [{ valueString: 'no' }],
                            },
                        ],
                    },
                ],
            },
        ],
    };
    const expectedQR: QuestionnaireResponse = {
        resourceType: 'QuestionnaireResponse',
        status: 'completed',
        item: [
            {
                linkId: 'root-group',
                item: [
                    {
                        linkId: 'non-repeatable-group',
                        item: [
                            {
                                linkId: 'condition',
                                answer: [{ valueBoolean: true }],
                            },
                            {
                                linkId: 'question-for-yes',
                                answer: [{ valueString: 'yes' }],
                            },
                        ],
                    },
                ],
            },
        ],
    };
    const formItems = mapResponseToForm(qr, questionnaire);
    const enabledQuestionsLinkIds = getEnabledQuestions(
        questionnaire.item?.[0]?.item?.[0]?.item ?? [],
        ['items', 'root-group', 'items'],
        formItems,
        {
            questionnaire,
            resource: qr,
            context: qr,
        },
    ).map((questionnaireItem) => questionnaireItem.linkId);

    expect(enabledQuestionsLinkIds).toStrictEqual(['condition', 'question-for-yes']);

    const enabledFormItems = removeDisabledAnswers(questionnaire, formItems, {
        questionnaire,
        resource: qr,
        context: qr,
    });
    const actualQR = { ...qr, ...mapFormToResponse(enabledFormItems, questionnaire) };

    expect(actualQR).toEqual(expectedQR);
});

test('mapFormToResponse cut empty answers', () => {
    const formValues = {
        type: [
            {
                value: {
                    Coding: {
                        code: '418634005',
                        system: 'http://snomed.ct',
                        display: 'Drug',
                    },
                },
            },
        ],
        reaction: undefined,
        notes: [
            {
                value: {},
            },
        ],
    };

    const result = mapFormToResponse(formValues, allergiesQuestionnaire);
    const answersLinkIds = result.item?.map((answerItem) => answerItem.linkId) ?? [];
    expect(answersLinkIds.includes('reaction')).not.toBe(true);
    expect(answersLinkIds).toEqual(expect.arrayContaining(['type', 'notes']));
});

describe('enableWhen exists logic for non-repeatable groups primitives', () => {
    const testConfigs: Array<{ name: string; q: FCEQuestionnaireItem; qr: QuestionnaireResponseItem[] }> = [
        {
            name: 'boolean exist',
            q: { linkId: 'condition', text: 'Condition', type: 'boolean' },
            qr: [
                {
                    linkId: 'condition',
                    answer: [{ valueBoolean: true }],
                },
                {
                    linkId: 'question-for-yes',
                    answer: [{ valueString: 'yes' }],
                },
            ],
        },
        {
            name: 'boolean not exist',
            q: { linkId: 'condition', text: 'Condition', type: 'boolean' },
            qr: [
                {
                    linkId: 'question-for-no',
                    answer: [{ valueString: 'no' }],
                },
            ],
        },
        {
            name: 'integer exist',
            q: { linkId: 'condition', text: 'Condition', type: 'integer' },
            qr: [
                {
                    linkId: 'condition',
                    answer: [{ valueInteger: 1 }],
                },
                {
                    linkId: 'question-for-yes',
                    answer: [{ valueString: 'yes' }],
                },
            ],
        },
        {
            name: 'integer not exist',
            q: { linkId: 'condition', text: 'Condition', type: 'integer' },
            qr: [
                {
                    linkId: 'question-for-no',
                    answer: [{ valueString: 'no' }],
                },
            ],
        },
        {
            name: 'decimal exist',
            q: { linkId: 'condition', text: 'Condition', type: 'decimal' },
            qr: [
                {
                    linkId: 'condition',
                    answer: [{ valueDecimal: 1 }],
                },
                {
                    linkId: 'question-for-yes',
                    answer: [{ valueString: 'yes' }],
                },
            ],
        },
        {
            name: 'decimal not exist',
            q: { linkId: 'condition', text: 'Condition', type: 'decimal' },
            qr: [
                {
                    linkId: 'question-for-no',
                    answer: [{ valueString: 'no' }],
                },
            ],
        },
    ];

    test.each(testConfigs)('enableWhen works correctly', async (testConfig) => {
        const questionnaire: FCEQuestionnaire = {
            resourceType: 'Questionnaire',
            status: 'active',
            item: [
                {
                    linkId: 'root-group',
                    type: 'group',
                    text: 'Root group',
                    item: [
                        {
                            linkId: 'non-repeatable-group',
                            type: 'group',
                            text: 'Non Repeatable group',
                            item: [
                                testConfig.q,
                                {
                                    linkId: 'question-for-yes',
                                    text: 'Question for yes',
                                    type: 'text',
                                    enableWhen: [
                                        {
                                            question: 'condition',
                                            operator: 'exists',
                                            answerBoolean: true,
                                        },
                                    ],
                                },
                                {
                                    linkId: 'question-for-no',
                                    text: 'Question for no',
                                    type: 'text',
                                    enableWhen: [
                                        {
                                            question: 'condition',
                                            operator: 'exists',
                                            answerBoolean: false,
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        };

        const qr: QuestionnaireResponse = {
            resourceType: 'QuestionnaireResponse',
            status: 'completed',
            item: [
                {
                    linkId: 'root-group',
                    item: [
                        {
                            linkId: 'non-repeatable-group',
                            item: testConfig.qr,
                        },
                    ],
                },
            ],
        };
        const expectedQR: QuestionnaireResponse = {
            resourceType: 'QuestionnaireResponse',
            status: 'completed',
            item: [
                {
                    linkId: 'root-group',
                    item: [
                        {
                            linkId: 'non-repeatable-group',
                            item: testConfig.qr,
                        },
                    ],
                },
            ],
        };
        const formItems = mapResponseToForm(qr, questionnaire);
        const enabledFormItems = removeDisabledAnswers(questionnaire, formItems, {
            questionnaire,
            resource: qr,
            context: qr,
        });
        const actualQR = { ...qr, ...mapFormToResponse(enabledFormItems, questionnaire) };

        expect(actualQR).toEqual(expectedQR);
    });
});

describe('isValueEmpty', () => {
    const valueTypeList = [
        { value: 1, expect: false },
        { value: 0, expect: false },
        { value: 1.1, expect: false },
        { value: 'a', expect: false },
        { value: true, expect: false },
        { value: false, expect: false },
        { value: { a: 1 }, expect: false },
        { value: ['a'], expect: false },
        { value: '', expect: true },
        { value: [], expect: true },
        { value: {}, expect: true },
        { value: undefined, expect: true },
        { value: null, expect: true },
        { value: NaN, expect: true },
    ];

    test.each(valueTypeList)('works correctly for type %s', async (valueType) => {
        expect(isValueEmpty(valueType.value)).toEqual(valueType.expect);
    });
});

describe('toAnswerValue', () => {
    const valueTypeList: { input: [any, string]; expect: any }[] = [
        { input: [{ valueString: 'test' }, 'value'], expect: { string: 'test' } },
        { input: [{ valueCoding: { code: 'code' } }, 'value'], expect: { Coding: { code: 'code' } } },
        { input: [{ answerString: 'test' }, 'answer'], expect: { string: 'test' } },
        { input: [{ answerCoding: { code: 'code' } }, 'answer'], expect: { Coding: { code: 'code' } } },
    ];

    test.each(valueTypeList)('works correctly for %s', async (valueType) => {
        expect(toAnswerValue(...valueType.input)).toEqual(valueType.expect);
    });
});

describe('toFHIRAnswerValue', () => {
    const valueTypeList: { input: [any, string]; expect: any }[] = [
        { input: [{ string: 'test' }, 'value'], expect: { valueString: 'test' } },
        { input: [{ Coding: { code: 'code' } }, 'value'], expect: { valueCoding: { code: 'code' } } },
        { input: [{ string: 'test' }, 'answer'], expect: { answerString: 'test' } },
        { input: [{ Coding: { code: 'code' } }, 'answer'], expect: { answerCoding: { code: 'code' } } },
    ];

    test.each(valueTypeList)('works correctly for %s', async (valueType) => {
        expect(toFHIRAnswerValue(...valueType.input)).toEqual(valueType.expect);
    });
});

describe('getChoiceTypeValue', () => {
    const valueTypeList: { input: [any, string]; expect: any }[] = [
        { input: [{ valueString: 'test' }, 'value'], expect: 'test' },
        { input: [{ valueCoding: { code: 'code' } }, 'value'], expect: { code: 'code' } },
        { input: [{ answerString: 'test' }, 'answer'], expect: 'test' },
        { input: [{ answerCoding: { code: 'code' } }, 'answer'], expect: { code: 'code' } },
    ];
    test.each(valueTypeList)('works correctly for %s', async (valueType) => {
        expect(getChoiceTypeValue(...valueType.input)).toEqual(valueType.expect);
    });
});
