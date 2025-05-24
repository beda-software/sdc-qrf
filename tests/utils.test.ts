import { describe, expect, test } from 'vitest';

import { allergiesQuestionnaire } from './resources/questionnaire';
import {
    calcContext,
    calcInitialContext,
    compareValue,
    getAnswerValues,
    getBranchItems,
    getChoiceTypeValue,
    getEnabledQuestions,
    isAnswerValueEmpty,
    isValueEmpty,
    isValueEqual,
    mapFormToResponse,
    mapResponseToForm,
    removeDisabledAnswers,
    parseFhirQueryExpression,
    toAnswerValue,
    toFHIRAnswerValue,
    wrapAnswerValue,
    evaluateQuestionItemExpression,
} from '../src/utils';
import {
    ParametersParameter,
    Patient,
    Questionnaire,
    QuestionnaireItem,
    QuestionnaireItemEnableWhen,
    QuestionnaireResponse,
    QuestionnaireResponseItem,
} from 'fhir/r4b';
import { FCEQuestionnaire, FCEQuestionnaireItem } from '../src/fce.types';
import { AnswerValue, FormAnswerItems, FormItems, ItemContext, QuestionnaireResponseFormData } from '../src/types';

test('Transform required repeatable groups with/without answers', () => {
    const questionnaire: FCEQuestionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        item: [
            {
                linkId: 'required-repeatable-group-with-qr-item',
                type: 'group',
                repeats: true,
                required: true,
                item: [
                    {
                        linkId: 'question-1',
                        type: 'text',
                    },
                ],
            },
            {
                linkId: 'required-repeatable-group-without-qr-item',
                type: 'group',
                repeats: true,
                required: true,
                item: [
                    {
                        linkId: 'question-2',
                        type: 'text',
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
                linkId: 'required-repeatable-group-with-qr-item',
            },
        ],
    };
    const expectedQR: QuestionnaireResponse = {
        resourceType: 'QuestionnaireResponse',
        status: 'completed',
        item: [
            {
                linkId: 'required-repeatable-group-with-qr-item',
            },
            {
                linkId: 'required-repeatable-group-without-qr-item',
            },
        ],
    };
    const formItems = mapResponseToForm(initialQR, questionnaire);
    const actualQR = { ...initialQR, ...mapFormToResponse(formItems, questionnaire) };

    expect(actualQR).toEqual(expectedQR);
});

test('Transform non-required repeatable groups with/without answers', () => {
    const questionnaire: FCEQuestionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        item: [
            {
                linkId: 'non-required-repeatable-group-with-qr-item',
                type: 'group',
                repeats: true,
                item: [
                    {
                        linkId: 'question-1',
                        type: 'text',
                    },
                ],
            },
            {
                linkId: 'non-required-repeatable-group-without-qr-item',
                type: 'group',
                repeats: true,
                item: [
                    {
                        linkId: 'question-2',
                        type: 'text',
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
                linkId: 'non-required-repeatable-group-with-qr-item',
            },
        ],
    };
    const expectedQR: QuestionnaireResponse = {
        resourceType: 'QuestionnaireResponse',
        status: 'completed',
        item: [
            {
                linkId: 'non-required-repeatable-group-with-qr-item',
            },
        ],
    };
    const formItems = mapResponseToForm(initialQR, questionnaire);
    const actualQR = { ...initialQR, ...mapFormToResponse(formItems, questionnaire) };

    expect(actualQR).toEqual(expectedQR);
});

test('Transform nested repeatable-groups', () => {
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

test('Transform preserves initial values', () => {
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

test('Transform removes missing answers', () => {
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
                        linkId: 'question-1',
                        type: 'text',
                    },
                    {
                        linkId: 'question-2',
                        type: 'text',
                    },
                    {
                        linkId: 'question-3',
                        type: 'text',
                    },
                    {
                        linkId: 'question-4',
                        type: 'text',
                    },
                    {
                        linkId: 'question-5',
                        type: 'text',
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
                item: [
                    {
                        linkId: 'question-1',
                        answer: [{ valueString: 'ok' }],
                    },
                    {
                        linkId: 'question-2',
                        answer: [{ valueString: 'ok' }],
                    },
                    {
                        linkId: 'question-3',
                        answer: [{ valueString: 'ok' }],
                    },
                    {
                        linkId: 'question-4',
                        answer: [{ valueString: 'ok' }],
                    },
                    {
                        linkId: 'question-5',
                        answer: [{ valueString: 'ok' }],
                    },
                ],
            },
        ],
    };
    const formItems = mapResponseToForm(initialQR, questionnaire);
    expect(formItems).toMatchObject({
        'root-group': {
            items: {
                'question-1': [
                    {
                        items: {},
                        value: {
                            string: 'ok',
                        },
                    },
                ],
                'question-2': [
                    {
                        items: {},
                        value: {
                            string: 'ok',
                        },
                    },
                ],
                'question-3': [
                    {
                        items: {},
                        value: {
                            string: 'ok',
                        },
                    },
                ],
                'question-4': [
                    {
                        items: {},
                        value: {
                            string: 'ok',
                        },
                    },
                ],
                'question-5': [
                    {
                        items: {},
                        value: {
                            string: 'ok',
                        },
                    },
                ],
            },
            question: 'Root group',
        },
    });
    const updatedFormItems: FormItems = {
        'root-group': {
            items: {
                'question-1': [
                    {
                        items: {},
                        value: {
                            string: undefined,
                        },
                    },
                ],
                'question-2': [
                    {
                        items: {},
                        value: undefined,
                    },
                ],
                'question-3': [
                    {
                        items: {},
                    },
                ],
                'question-4': [],
                'question-5': [
                    {
                        items: {},
                        value: {
                            string: 'ok',
                        },
                    },
                ],
            },
            question: 'Root group',
        },
    };

    const expectedQR: QuestionnaireResponse = {
        resourceType: 'QuestionnaireResponse',
        status: 'completed',
        item: [
            {
                linkId: 'root-group',
                item: [
                    {
                        answer: [],
                        linkId: 'question-1',
                    },
                    {
                        answer: [],
                        linkId: 'question-2',
                    },
                    {
                        answer: [],
                        linkId: 'question-3',
                    },
                    {
                        answer: [],
                        linkId: 'question-4',
                    },
                    {
                        answer: [
                            {
                                valueString: 'ok',
                            },
                        ],
                        linkId: 'question-5',
                    },
                ],
            },
        ],
    };
    const actualQR = { ...initialQR, ...mapFormToResponse(updatedFormItems, questionnaire) };

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

describe('enableWhen in answer sub questions', () => {
    test('works correctly ', async () => {
        const questionnaire: FCEQuestionnaire = {
            resourceType: 'Questionnaire',
            status: 'active',
            item: [
                { linkId: 'global-question', type: 'string' },
                {
                    linkId: 'parent-question',
                    type: 'integer',
                    repeats: true,
                    item: [
                        {
                            linkId: 'question-always-presented',
                            type: 'string',
                        },
                        {
                            linkId: 'question-conditional-from-parent',
                            type: 'string',
                            enableWhen: [
                                {
                                    question: 'parent-question',
                                    operator: '=',
                                    answerInteger: 1,
                                },
                            ],
                        },
                        {
                            linkId: 'question-conditional-from-the-same-level',
                            type: 'string',
                            enableWhen: [
                                {
                                    question: 'question-always-presented',
                                    operator: '=',
                                    answerString: 'show-the-same-level',
                                },
                            ],
                        },
                        {
                            linkId: 'question-conditional-from-global',
                            type: 'string',
                            enableWhen: [
                                {
                                    question: 'global-question',
                                    operator: '=',
                                    answerString: 'show-global',
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
                { linkId: 'global-question', answer: [{ valueString: 'show-global' }] },
                {
                    linkId: 'parent-question',
                    answer: [
                        {
                            valueInteger: 1,
                            item: [
                                {
                                    linkId: 'question-always-presented',
                                    answer: [{ valueString: 'hide-the-same-level' }],
                                },
                                {
                                    linkId: 'question-conditional-from-parent',
                                    answer: [{ valueString: 'ok' }],
                                },

                                {
                                    linkId: 'question-conditional-from-the-same-level',
                                    answer: [{ valueString: 'ok' }],
                                },
                                {
                                    linkId: 'question-conditional-from-global',
                                    answer: [{ valueString: 'ok' }],
                                },
                            ],
                        },
                        {
                            valueInteger: 2,
                            item: [
                                {
                                    linkId: 'question-always-presented',
                                    answer: [{ valueString: 'show-the-same-level' }],
                                },
                                {
                                    linkId: 'question-conditional-from-parent',
                                    answer: [{ valueString: 'ok' }],
                                },
                                {
                                    linkId: 'question-conditional-from-the-same-level',
                                    answer: [{ valueString: 'ok' }],
                                },
                                {
                                    linkId: 'question-conditional-from-global',
                                    answer: [{ valueString: 'ok' }],
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
                { linkId: 'global-question', answer: [{ valueString: 'show-global' }] },
                {
                    linkId: 'parent-question',
                    answer: [
                        {
                            valueInteger: 1,
                            item: [
                                {
                                    linkId: 'question-always-presented',
                                    answer: [{ valueString: 'hide-the-same-level' }],
                                },
                                {
                                    linkId: 'question-conditional-from-parent',
                                    answer: [{ valueString: 'ok' }],
                                },
                                {
                                    linkId: 'question-conditional-from-global',
                                    answer: [{ valueString: 'ok' }],
                                },
                            ],
                        },
                        {
                            valueInteger: 2,
                            item: [
                                {
                                    linkId: 'question-always-presented',
                                    answer: [{ valueString: 'show-the-same-level' }],
                                },
                                {
                                    linkId: 'question-conditional-from-the-same-level',
                                    answer: [{ valueString: 'ok' }],
                                },
                                {
                                    linkId: 'question-conditional-from-global',
                                    answer: [{ valueString: 'ok' }],
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
});

describe('enableWhen in deep nested', () => {
    test('works correctly ', async () => {
        const questionnaire: FCEQuestionnaire = {
            resourceType: 'Questionnaire',
            status: 'active',
            item: [
                {
                    linkId: 'nested-group',
                    type: 'group',
                    item: [{ linkId: 'global-question-in-nested', type: 'string' }],
                },
                {
                    linkId: 'nested-repeatable-group',
                    type: 'group',
                    repeats: true,
                    item: [{ linkId: 'global-question-in-nested-repeatable', type: 'string' }],
                },
                {
                    linkId: 'question-conditional-from-global-nested-equal-show',
                    type: 'integer',
                    enableWhen: [
                        {
                            question: 'global-question-in-nested',
                            operator: '=',
                            answerString: 'show',
                        },
                    ],
                },
                {
                    linkId: 'question-conditional-from-global-nested-repeatable-equal-show',
                    type: 'integer',
                    enableWhen: [
                        {
                            question: 'global-question-in-nested-repeatable',
                            operator: '=',
                            answerString: 'show',
                        },
                    ],
                },

                {
                    linkId: 'question-conditional-from-global-nested-equal-hide',
                    type: 'integer',
                    enableWhen: [
                        {
                            question: 'global-question-in-nested',
                            operator: '=',
                            answerString: 'hide',
                        },
                    ],
                },
                {
                    linkId: 'question-conditional-from-global-nested-repeatable-equal-hide',
                    type: 'integer',
                    enableWhen: [
                        {
                            question: 'global-question-in-nested-repeatable',
                            operator: '=',
                            answerString: 'hide',
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
                    linkId: 'nested-group',
                    item: [{ linkId: 'global-question-in-nested', answer: [{ valueString: 'show' }] }],
                },
                {
                    linkId: 'nested-repeatable-group',
                    item: [{ linkId: 'global-question-in-nested-repeatable', answer: [{ valueString: 'show' }] }],
                },
                {
                    linkId: 'question-conditional-from-global-nested-equal-show',
                    answer: [{ valueString: 'ok' }],
                },
                {
                    linkId: 'question-conditional-from-global-nested-repeatable-equal-show',
                    answer: [{ valueString: 'ok' }],
                },
                {
                    linkId: 'question-conditional-from-global-nested-equal-hide',
                    answer: [{ valueString: 'ok' }],
                },
                {
                    linkId: 'question-conditional-from-global-nested-repeatable-equal-hide',
                    answer: [{ valueString: 'ok' }],
                },
            ],
        };
        const expectedQR: QuestionnaireResponse = {
            resourceType: 'QuestionnaireResponse',
            status: 'completed',
            item: [
                {
                    linkId: 'nested-group',
                    item: [{ linkId: 'global-question-in-nested', answer: [{ valueString: 'show' }] }],
                },
                {
                    linkId: 'nested-repeatable-group',
                    item: [{ linkId: 'global-question-in-nested-repeatable', answer: [{ valueString: 'show' }] }],
                },
                {
                    linkId: 'question-conditional-from-global-nested-equal-show',
                    answer: [{ valueString: 'ok' }],
                },
                {
                    linkId: 'question-conditional-from-global-nested-repeatable-equal-show',
                    answer: [{ valueString: 'ok' }],
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

describe('enableWhen comparators logic for non-repeatable groups primitives', () => {
    const testConfigs: Array<{
        value1: number | undefined;
        value2: number;
        operator: QuestionnaireItemEnableWhen['operator'];
        expected: boolean;
    }> = [
        {
            value1: undefined,
            operator: '=',
            value2: 5,
            expected: false,
        },
        {
            value1: 5,
            operator: '=',
            value2: 5,
            expected: true,
        },
        {
            value1: 5,
            operator: '=',
            value2: 6,
            expected: false,
        },
        {
            value1: undefined,
            operator: '!=',
            value2: 5,
            expected: true,
        },
        {
            value1: 5,
            operator: '!=',
            value2: 5,
            expected: false,
        },
        {
            value1: 5,
            operator: '!=',
            value2: 6,
            expected: true,
        },
        {
            value1: undefined,
            operator: '<',
            value2: 5,
            expected: false,
        },
        {
            value1: 4,
            operator: '<',
            value2: 5,
            expected: true,
        },
        {
            value1: 5,
            operator: '<',
            value2: 5,
            expected: false,
        },
        {
            value1: undefined,
            operator: '<=',
            value2: 6,
            expected: false,
        },
        {
            value1: 7,
            operator: '<=',
            value2: 6,
            expected: false,
        },
        {
            value1: 5,
            operator: '<=',
            value2: 6,
            expected: true,
        },
        {
            value1: undefined,
            operator: '>',
            value2: 5,
            expected: false,
        },
        {
            value1: 5,
            operator: '>',
            value2: 5,
            expected: false,
        },
        {
            value1: 5,
            operator: '>',
            value2: 4,
            expected: true,
        },
        {
            value1: undefined,
            operator: '>=',
            value2: 6,
            expected: false,
        },
        {
            value1: 5,
            operator: '>=',
            value2: 5,
            expected: true,
        },
        {
            value1: 5,
            operator: '>=',
            value2: 6,
            expected: false,
        },
    ];

    test.each(testConfigs)(
        'works correctly for $value1 $operator $value2',
        async ({ operator, value1, value2, expected }) => {
            const questionnaire: FCEQuestionnaire = {
                resourceType: 'Questionnaire',
                status: 'active',
                item: [
                    { linkId: 'value-1', type: 'integer' },
                    {
                        linkId: 'question',
                        type: 'string',
                        enableWhen: [
                            {
                                question: 'value-1',
                                operator,
                                answerInteger: value2,
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
                        linkId: 'value-1',
                        answer: value1 !== undefined ? [{ valueInteger: value1 }] : [],
                    },
                    {
                        linkId: 'question',
                        answer: [{ valueString: 'ok' }],
                    },
                ],
            };
            const expectedQR: QuestionnaireResponse = {
                resourceType: 'QuestionnaireResponse',
                status: 'completed',
                item: [
                    ...(value1 !== undefined
                        ? [
                              {
                                  linkId: 'value-1',
                                  answer: [{ valueInteger: value1 }],
                              },
                          ]
                        : []),
                    ...(expected
                        ? [
                              {
                                  linkId: 'question',
                                  answer: [{ valueString: 'ok' }],
                              },
                          ]
                        : []),
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
        },
    );
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

describe('isAnswerValueEmpty', () => {
    const valueList = [
        { value: { string: 'ok' }, expect: false },
        { value: { integer: 0 }, expect: false },
        { value: { boolean: false }, expect: false },
        { value: { string: '' }, expect: true },
        { value: { string: null }, expect: true },
        { value: { string: undefined }, expect: true },
        { value: undefined, expect: true },
        { value: null, expect: true },
        { value: { integer: NaN }, expect: true },
    ];

    test.each(valueList)('works correctly for %s', async (valueType) => {
        expect(isAnswerValueEmpty(valueType.value)).toEqual(valueType.expect);
    });
});

describe('getAnswerValues', () => {
    const valueList: Array<{ value: FormAnswerItems[]; expect: AnswerValue[] }> = [
        { value: [], expect: [] },
        { value: [{ items: { linkId: {} } }], expect: [] },
        { value: [{ value: { string: null } }], expect: [] },
        { value: [{ value: undefined }], expect: [] },
        { value: [{}], expect: [] },
        { value: [{ value: { string: 'ok' } }], expect: [{ string: 'ok' }] },
    ];

    test.each(valueList)('works correctly for %s', async (valueType) => {
        expect(getAnswerValues(valueType.value)).toStrictEqual(valueType.expect);
    });
});

describe('isValueEqual', () => {
    const cases: {
        input: [AnswerValue, AnswerValue];
        expected: any;
        name: string;
    }[] = [
        {
            name: 'two primitive strings are equal',
            input: [{ string: '1' }, { string: '1' }],
            expected: true,
        },
        {
            name: 'two primitive strings are not equal',
            input: [{ string: '1' }, { string: '2' }],
            expected: false,
        },
        {
            name: 'two different primitives are not equal',
            input: [{ string: '1' }, { integer: 2 }],
            expected: false,
        },
        {
            name: 'two Codings are equal by code',
            input: [
                { Coding: { code: 'code', display: 'Display 1' } },
                { Coding: { code: 'code', display: 'Display 2' } },
            ],
            expected: true,
        },
        {
            name: 'two Codings are not equal by code',
            input: [
                { Coding: { code: 'code-1', display: 'Display 1' } },
                { Coding: { code: 'code-2', display: 'Display 2' } },
            ],
            expected: false,
        },
    ];

    test.each(cases)('works correctly for $name', ({ input, expected }) => {
        const [v1, v2] = input;
        expect(isValueEqual(v1, v2)).toEqual(expected);
    });
});

describe('compareValue', () => {
    const cases: {
        input: [AnswerValue, AnswerValue];
        expected: any;
        name: string;
    }[] = [
        {
            name: 'two primitive strings are equal',
            input: [{ string: '1' }, { string: '1' }],
            expected: 0,
        },
        {
            name: 'first string is less than second',
            input: [{ string: '1' }, { string: '2' }],
            expected: -1,
        },
        {
            name: 'first string is more than second',
            input: [{ string: '3' }, { string: '2' }],
            expected: 1,
        },
    ];

    test.each(cases)('works correctly for $name', ({ input, expected }) => {
        const [v1, v2] = input;
        expect(compareValue(v1, v2)).toEqual(expected);
    });

    test('throws for non-primitive Coding', () => {
        expect(() => compareValue({ Coding: { code: 'code' } }, { Coding: { code: 'code' } })).toThrow();
    });

    test('throws for different types', () => {
        expect(() => compareValue({ string: '1' }, { integer: 1 })).toThrow();
    });
});

describe('toAnswerValue', () => {
    const valueTypeList: { input: [any, string]; expect: any }[] = [
        { input: [{ valueString: 'test' }, 'value'], expect: { string: 'test' } },
        { input: [{}, 'value'], expect: undefined },
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

describe('wrapAnswerValue', () => {
    const cases: {
        input: [any, any]; // [type, value]
        expected: any;
        name: string;
    }[] = [
        {
            name: 'choice – object literal ⇒ Coding',
            input: ['choice', { code: 'code' }],
            expected: { Coding: { code: 'code' } },
        },
        {
            name: 'choice – primitive ⇒ string',
            input: ['choice', 'foo'],
            expected: { string: 'foo' },
        },
        {
            name: 'open-choice – object literal ⇒ Coding',
            input: ['open-choice', { code: 'bar' }],
            expected: { Coding: { code: 'bar' } },
        },
        {
            name: 'open-choice – primitive ⇒ string',
            input: ['open-choice', 'baz'],
            expected: { string: 'baz' },
        },
        {
            name: 'text',
            input: ['text', 'hello'],
            expected: { string: 'hello' },
        },
        {
            name: 'attachment',
            input: ['attachment', { url: 'http://file', title: 'file' }],
            expected: { Attachment: { url: 'http://file', title: 'file' } },
        },
        {
            name: 'reference',
            input: ['reference', { reference: 'Patient/1' }],
            expected: { Reference: { reference: 'Patient/1' } },
        },
        {
            name: 'quantity',
            input: ['quantity', { value: 5, unit: 'kg' }],
            expected: { Quantity: { value: 5, unit: 'kg' } },
        },
        {
            name: 'unknown type falls back to {[type]: value}',
            input: ['boolean', true],
            expected: { boolean: true },
        },
    ];

    test.each(cases)('works correctly for $name', ({ input, expected }) => {
        const [type, value] = input;
        expect(wrapAnswerValue(type as any, value)).toEqual(expected);
    });
});

describe('getBranchItems', () => {
    const questionnaire: Questionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        item: [
            {
                linkId: 'demographics-group',
                type: 'group',
                item: [
                    { linkId: 'full-name', type: 'string' },
                    { linkId: 'address-group', type: 'group', item: [{ linkId: 'city', type: 'string' }] },
                ],
            },
            {
                linkId: 'medications-group',
                type: 'group',
                repeats: true,
                item: [
                    { linkId: 'medication-name', type: 'string' },
                    { linkId: 'dosage', type: 'string' },
                ],
            },
            {
                linkId: 'conditions-group',
                type: 'group',
                repeats: true,
                item: [{ linkId: 'condition-name', type: 'string' }],
            },
            {
                linkId: 'known-allergies',
                type: 'string',
                repeats: true,
            },
        ],
    };

    describe('in filled QR', () => {
        const questionnaireResponse: QuestionnaireResponse = {
            resourceType: 'QuestionnaireResponse',
            status: 'completed',
            item: [
                {
                    linkId: 'demographics-group',
                    item: [
                        {
                            linkId: 'full-name',
                            answer: [{ valueString: 'Alice' }],
                        },
                        { linkId: 'address-group', item: [{ linkId: 'city', answer: [{ valueString: 'NY' }] }] },
                    ],
                },
                {
                    linkId: 'medications-group',
                    item: [
                        { linkId: 'medication-name', answer: [{ valueString: 'Aspirin' }] },
                        { linkId: 'dosage', answer: [{ valueString: '100mg' }] },
                    ],
                },
                {
                    linkId: 'medications-group',
                    item: [
                        { linkId: 'medication-name', answer: [{ valueString: 'Paracetamol' }] },
                        { linkId: 'dosage', answer: [{ valueString: '50mg' }] },
                    ],
                },
                {
                    linkId: 'known-allergies',
                    answer: [{ valueString: 'Peanuts' }, { valueString: 'Latex' }],
                },
            ],
        };

        const cases: {
            name: string;
            path: string[];
            expectedQItem: QuestionnaireItem;
            expectedQRItems: QuestionnaireResponseItem[];
        }[] = [
            {
                name: 'non-repeating group → leaf question',
                path: ['demographics-group', 'items', 'full-name'],
                expectedQItem: { linkId: 'full-name', type: 'string' },
                expectedQRItems: [
                    {
                        linkId: 'full-name',
                        answer: [{ valueString: 'Alice' }],
                    },
                ],
            },
            {
                name: 'non-repeating group → nested group → leaf question',
                path: ['demographics-group', 'items', 'address-group', 'items', 'city'],
                expectedQItem: { linkId: 'city', type: 'string' },
                expectedQRItems: [
                    {
                        linkId: 'city',
                        answer: [{ valueString: 'NY' }],
                    },
                ],
            },

            {
                name: 'repeating group (leaf = group instance)',
                path: ['medications-group'],
                expectedQItem: {
                    linkId: 'medications-group',
                    type: 'group',
                    repeats: true,
                    item: [
                        { linkId: 'medication-name', type: 'string' },
                        { linkId: 'dosage', type: 'string' },
                    ],
                },
                expectedQRItems: [
                    {
                        linkId: 'medications-group',
                        item: [
                            { linkId: 'medication-name', answer: [{ valueString: 'Aspirin' }] },
                            { linkId: 'dosage', answer: [{ valueString: '100mg' }] },
                        ],
                    },
                    {
                        linkId: 'medications-group',
                        item: [
                            { linkId: 'medication-name', answer: [{ valueString: 'Paracetamol' }] },
                            { linkId: 'dosage', answer: [{ valueString: '50mg' }] },
                        ],
                    },
                ],
            },
            {
                name: 'repeating group → indexed instance → child question',
                path: ['medications-group', 'items', '1', 'medication-name'],
                expectedQItem: { linkId: 'medication-name', type: 'string' },
                expectedQRItems: [{ linkId: 'medication-name', answer: [{ valueString: 'Paracetamol' }] }],
            },
            {
                name: 'stand-alone repeating question',
                path: ['known-allergies'],
                expectedQItem: {
                    linkId: 'known-allergies',
                    type: 'string',
                    repeats: true,
                },
                expectedQRItems: [
                    {
                        linkId: 'known-allergies',
                        answer: [{ valueString: 'Peanuts' }, { valueString: 'Latex' }],
                    },
                ],
            },
        ];

        test.each(cases)('$name', ({ path, expectedQItem, expectedQRItems }) => {
            const { qItem, qrItems } = getBranchItems(path, questionnaire, questionnaireResponse);
            expect(qItem).toStrictEqual(expectedQItem);
            expect(qrItems).toStrictEqual(expectedQRItems);
        });

        test('throws when the path does not exist', () => {
            expect(() => getBranchItems(['does-not-exist'], questionnaire, questionnaireResponse)).toThrow();
        });
    });

    describe('in empty QR', () => {
        const questionnaireResponse: QuestionnaireResponse = {
            resourceType: 'QuestionnaireResponse',
            status: 'completed',
        };

        const cases: {
            name: string;
            path: string[];
            expectedQItem: QuestionnaireItem;
            expectedQRItems: QuestionnaireResponseItem[];
        }[] = [
            {
                name: 'non-repeating group → leaf question',
                path: ['demographics-group', 'items', 'full-name'],
                expectedQItem: { linkId: 'full-name', type: 'string' },
                expectedQRItems: [],
            },
            {
                name: 'non-repeating group → nested group → leaf question',
                path: ['demographics-group', 'items', 'address-group', 'items', 'city'],
                expectedQItem: { linkId: 'city', type: 'string' },
                expectedQRItems: [],
            },

            {
                name: 'repeating group (leaf = group instance)',
                path: ['medications-group'],
                expectedQItem: {
                    linkId: 'medications-group',
                    type: 'group',
                    repeats: true,
                    item: [
                        { linkId: 'medication-name', type: 'string' },
                        { linkId: 'dosage', type: 'string' },
                    ],
                },
                expectedQRItems: [],
            },
            {
                name: 'repeating group → indexed instance → child question',
                path: ['medications-group', 'items', '0', 'medication-name'],
                expectedQItem: { linkId: 'medication-name', type: 'string' },
                expectedQRItems: [],
            },
            {
                name: 'stand-alone repeating question',
                path: ['known-allergies'],
                expectedQItem: {
                    linkId: 'known-allergies',
                    type: 'string',
                    repeats: true,
                },
                expectedQRItems: [],
            },
        ];

        test.each(cases)('$name', ({ path, expectedQItem, expectedQRItems }) => {
            const { qItem, qrItems } = getBranchItems(path, questionnaire, questionnaireResponse);
            expect(qItem).toStrictEqual(expectedQItem);
            expect(qrItems).toStrictEqual(expectedQRItems);
        });

        test('throws when the path does not exist', () => {
            expect(() => getBranchItems(['does-not-exist'], questionnaire, questionnaireResponse)).toThrow();
        });
    });
});

describe('calcContext', () => {
    const questionnaire: Questionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        item: [
            {
                linkId: 'demographics-group',
                type: 'group',
                item: [
                    { linkId: 'full-name', type: 'string' },
                    { linkId: 'address-group', type: 'group', item: [{ linkId: 'city', type: 'string' }] },
                ],
            },
        ],
    };

    const questionnaireResponse: QuestionnaireResponse = {
        resourceType: 'QuestionnaireResponse',
        status: 'completed',
        item: [
            {
                linkId: 'demographics-group',
                item: [
                    {
                        linkId: 'full-name',
                        answer: [{ valueString: 'Alice' }],
                    },
                    { linkId: 'address-group', item: [{ linkId: 'city', answer: [{ valueString: 'NY' }] }] },
                ],
            },
        ],
    };
    const initialContext = {
        resource: questionnaireResponse,
        questionnaire,
        context: questionnaireResponse,
    };

    const variables = [
        {
            name: 'Name',
            language: 'text/fhirpath',
            expression: `%resource.item.where(linkId='demographics-group').item.where(linkId='full-name').answer.value`,
        },
        {
            name: 'City',
            language: 'text/fhirpath',
            // valueString here not value because fhirpath model does not know about QuestionnaireResponseItem
            expression: `%context.item.where(linkId='address-group').item.where(linkId='city').answer.valueString`,
        },
    ];
    const qItem = questionnaire.item![0]!;
    const qrItem = questionnaireResponse.item![0]!;
    test('without specified qr item', () => {
        expect(calcContext(initialContext, variables, qItem, undefined)).toStrictEqual({
            resource: questionnaireResponse,
            questionnaire,
            context: { linkId: qItem.linkId },
            qitem: qItem,
            Name: ['Alice'],
            City: [],
        });
    });

    test('with specified qr item', () => {
        expect(calcContext(initialContext, variables, qItem, qrItem)).toStrictEqual({
            resource: questionnaireResponse,
            questionnaire,
            context: qrItem,
            qitem: qItem,
            Name: ['Alice'],
            City: ['NY'],
        });
    });
});

describe('calcInitialContext', () => {
    const questionnaire: Questionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        item: [
            {
                linkId: 'demographics-group',
                type: 'group',
                item: [
                    { linkId: 'full-name', type: 'string' },
                    { linkId: 'address-group', type: 'group', item: [{ linkId: 'city', type: 'string' }] },
                ],
            },
        ],
    };

    const questionnaireResponse: QuestionnaireResponse = {
        resourceType: 'QuestionnaireResponse',
        status: 'completed',
        item: [
            {
                linkId: 'demographics-group',
                item: [
                    {
                        linkId: 'full-name',
                        answer: [{ valueString: 'Alice' }],
                    },
                    { linkId: 'address-group', item: [{ linkId: 'city', answer: [{ valueString: 'NY' }] }] },
                ],
            },
        ],
    };
    const launchContextParameters: ParametersParameter[] = [
        { name: 'Patient', resource: { resourceType: 'Patient' } },
        { name: 'StringValue', valueString: 'string' },
    ];
    const qrfDataContext: QuestionnaireResponseFormData['context'] = {
        questionnaireResponse,
        questionnaire,
        fceQuestionnaire: questionnaire,
        launchContextParameters,
    };
    const formValues = mapResponseToForm(questionnaireResponse, questionnaire);

    test('works correctly', () => {
        expect(calcInitialContext(qrfDataContext, formValues)).toStrictEqual({
            questionnaire,
            resource: questionnaireResponse,
            context: questionnaireResponse,

            Questionnaire: questionnaire,
            QuestionnaireResponse: questionnaireResponse,

            Patient: { resourceType: 'Patient' },
            StringValue: 'string',
        });
    });
});

describe('parseFhirQueryExpression', () => {
    const patient: Patient = {
        resourceType: 'Patient',
        id: 'p-1',
        generalPractitioner: [{ reference: 'Organization/o-1' }, { reference: 'Organization/o-2' }],
    };
    const context = {
        Patient: patient,
        Organization: { resourceType: 'Organization', id: 'o-1' },
    } as any as ItemContext;

    test('works correctly for expression with spaces', () => {
        expect(parseFhirQueryExpression('/Patient?_id={{   %Patient.id  }}', context)).toStrictEqual([
            '/Patient',
            { _id: 'p-1' },
        ]);
    });

    test('works correctly for two vars', () => {
        expect(
            parseFhirQueryExpression(
                '/Patient?_id={{%Patient.id}}&managing-organization={{%Organization.id}}',
                context,
            ),
        ).toStrictEqual(['/Patient', { _id: 'p-1', 'managing-organization': 'o-1' }]);
    });

    test('works correctly for missing value', () => {
        expect(
            parseFhirQueryExpression(
                `/Patient?_id={{%Patient.id}}&general-practitioner={{%Patient.generalPractitioner.where(resourceType='Practitioner').reference}}`,
                context,
            ),
        ).toStrictEqual(['/Patient', { _id: 'p-1', 'general-practitioner': '' }]);
    });

    test('works correctly for multiple values', () => {
        expect(
            parseFhirQueryExpression(
                `/Patient?_id={{%Patient.id}}&general-practitioner={{%Patient.generalPractitioner.reference}}`,
                context,
            ),
        ).toStrictEqual(['/Patient', { _id: 'p-1', 'general-practitioner': 'Organization/o-1,Organization/o-2' }]);
    });
});

describe('evaluateQuestionItemExpression', () => {
    const patient: Patient = {
        resourceType: 'Patient',
        id: 'p-1',
        generalPractitioner: [{ reference: 'Organization/o-1' }, { reference: 'Organization/o-2' }],
    };
    const context = {
        Patient: patient,
        Organization: { resourceType: 'Organization', id: 'o-1' },
    } as any as ItemContext;

    test('works correctly for regular expression', () => {
        expect(
            evaluateQuestionItemExpression('link-id', 'path.to', context, {
                language: 'text/fhirpath',
                expression: '%Patient.id',
            }),
        ).toStrictEqual(['p-1']);
    });
    test('works correctly for non-fhirpath expression', () => {
        expect(
            evaluateQuestionItemExpression('link-id', 'path.to', context, {
                language: 'x-fhir-query',
                expression: '/Patient',
            }),
        ).toStrictEqual([]);
    });

    test('throws for error in expression', () => {
        expect(() =>
            evaluateQuestionItemExpression('link-id', 'path.to', context, {
                language: 'text/fhirpath',
                expression: '%P',
            }),
        ).toThrow();
    });
});
