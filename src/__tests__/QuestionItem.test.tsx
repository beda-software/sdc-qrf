import React from 'react';
import fhirpath from 'fhirpath';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import type { Questionnaire, QuestionnaireResponse } from 'fhir/r4b';
import { success } from '@beda.software/remote-data';

import { QuestionItem, QuestionnaireResponseFormProvider } from '../components';
import type { EvaluateFhirpath, ItemContext, QRFContextData, QuestionItemComponent } from '../types';
import type { FCEQuestionnaireItem } from '../fce.types';

function createInitialContext(questionnaire: Questionnaire, questionnaireResponse: QuestionnaireResponse): ItemContext {
    return {
        questionnaire,
        resource: questionnaireResponse,
        context: questionnaireResponse,
        Questionnaire: questionnaire,
        QuestionnaireResponse: questionnaireResponse,
    };
}

function createQRFProviderProps(overrides: Partial<QRFContextData> = {}): QRFContextData {
    const DummyQuestionComponent: QuestionItemComponent = () => null;

    return {
        questionItemComponents: {
            string: DummyQuestionComponent,
        },
        formValues: {},
        setFormValues: vi.fn(),
        fhirService: vi.fn(async () => success({})),
        ...overrides,
    };
}

describe('QuestionItem calculatedExpression', () => {
    test('populates non-repeating answers from calculatedExpression', async () => {
        const questionnaire: Questionnaire = {
            resourceType: 'Questionnaire',
            status: 'active',
            item: [
                {
                    linkId: 'source',
                    type: 'string',
                },
                {
                    linkId: 'target',
                    type: 'string',
                    calculatedExpression: {
                        language: 'text/fhirpath',
                        expression: "%resource.item.where(linkId='source').answer.valueString",
                    },
                } as FCEQuestionnaireItem,
            ],
        };

        const questionnaireResponse: QuestionnaireResponse = {
            resourceType: 'QuestionnaireResponse',
            status: 'in-progress',
            item: [
                {
                    linkId: 'source',
                    answer: [
                        {
                            valueString: 'hello',
                        },
                    ],
                },
                {
                    linkId: 'target',
                },
            ],
        };

        const initialContext = createInitialContext(questionnaire, questionnaireResponse);

        const providerProps = createQRFProviderProps();
        const setFormValuesSpy = providerProps.setFormValues as ReturnType<typeof vi.fn>;

        render(
            <QuestionnaireResponseFormProvider {...providerProps}>
                <QuestionItem
                    parentPath={[]}
                    context={initialContext}
                    questionItem={questionnaire.item![1] as FCEQuestionnaireItem}
                />
            </QuestionnaireResponseFormProvider>,
        );

        await waitFor(() => {
            expect(setFormValuesSpy).toHaveBeenCalled();
        });

        const lastCall = setFormValuesSpy.mock.calls.at(-1)!;
        const fieldPath = lastCall[1] as Array<string | number>;
        const answers = lastCall[2] as any[];

        expect(fieldPath).toEqual(['target']);
        expect(answers).toHaveLength(1);
        expect(answers).toStrictEqual([{ value: { string: 'hello' } }]);
    });

    test('populates repeating answers when repeats=true', async () => {
        const questionnaire: Questionnaire = {
            resourceType: 'Questionnaire',
            status: 'active',
            item: [
                {
                    linkId: 'source',
                    type: 'string',
                },
                {
                    linkId: 'target',
                    type: 'string',
                    repeats: true,
                    calculatedExpression: {
                        language: 'text/fhirpath',
                        expression: "('a' | 'b')",
                    },
                } as FCEQuestionnaireItem,
            ],
        };

        const questionnaireResponse: QuestionnaireResponse = {
            resourceType: 'QuestionnaireResponse',
            status: 'in-progress',
            item: [
                {
                    linkId: 'source',
                    answer: [
                        {
                            valueString: 'ignored',
                        },
                    ],
                },
                {
                    linkId: 'target',
                },
            ],
        };

        const initialContext = createInitialContext(questionnaire, questionnaireResponse);

        const providerProps = createQRFProviderProps();
        const setFormValuesSpy = providerProps.setFormValues as ReturnType<typeof vi.fn>;

        render(
            <QuestionnaireResponseFormProvider {...providerProps}>
                <QuestionItem
                    parentPath={[]}
                    context={initialContext}
                    questionItem={questionnaire.item![1] as FCEQuestionnaireItem}
                />
            </QuestionnaireResponseFormProvider>,
        );

        await waitFor(() => {
            expect(setFormValuesSpy).toHaveBeenCalled();
        });

        const lastCall = setFormValuesSpy.mock.calls.at(-1)!;
        const fieldPath = lastCall[1] as Array<string | number>;
        const answers = lastCall[2] as any[];

        expect(fieldPath).toEqual(['target']);
        expect(answers).toHaveLength(2);
        expect(answers).toStrictEqual([{ value: { string: 'a' } }, { value: { string: 'b' } }]);
    });
});

describe('QuestionItem cqf expressions', () => {
    test('updates text, readOnly and required based on cqfExpression', async () => {
        const questionnaire: Questionnaire = {
            resourceType: 'Questionnaire',
            status: 'active',
            item: [
                {
                    linkId: 'q1',
                    type: 'string',
                } as FCEQuestionnaireItem,
            ],
        };

        const questionnaireResponse: QuestionnaireResponse = {
            resourceType: 'QuestionnaireResponse',
            status: 'in-progress',
            item: [
                {
                    linkId: 'q1',
                },
            ],
        };

        const initialContext = createInitialContext(questionnaire, questionnaireResponse);

        const renderSpy = vi.fn();
        const SpyQuestionComponent: QuestionItemComponent = (props) => {
            renderSpy(props);
            return null;
        };

        const providerProps = createQRFProviderProps({
            questionItemComponents: {
                string: SpyQuestionComponent,
            },
        });

        const initialQuestionItem: FCEQuestionnaireItem = {
            linkId: 'q1',
            type: 'string',
            text: 'Initial text',
            readOnly: false,
            required: false,
            _text: {
                cqfExpression: {
                    language: 'text/fhirpath',
                    expression: "'Computed text'",
                },
            } as any,
            _readOnly: {
                cqfExpression: {
                    language: 'text/fhirpath',
                    expression: 'true',
                },
            } as any,
            _required: {
                cqfExpression: {
                    language: 'text/fhirpath',
                    expression: 'true',
                },
            } as any,
        };

        render(
            <QuestionnaireResponseFormProvider {...providerProps}>
                <QuestionItem parentPath={[]} context={initialContext} questionItem={initialQuestionItem} />
            </QuestionnaireResponseFormProvider>,
        );

        await waitFor(() => {
            expect(renderSpy).toHaveBeenCalledTimes(2);
        });

        const lastCall = renderSpy.mock.calls.at(-1)!;
        const lastProps = lastCall[0] as { questionItem: FCEQuestionnaireItem };

        expect(lastProps.questionItem.text).toBe('Computed text');
        expect(lastProps.questionItem.readOnly).toBe(true);
        expect(lastProps.questionItem.required).toBe(true);
    });
});

describe('QuestionnaireResponseFormProvider evaluateFhirpath', () => {
    test('uses custom evaluateFhirpath from provider when evaluating calculatedExpression via QuestionItems', async () => {
        const questionnaire: Questionnaire = {
            resourceType: 'Questionnaire',
            status: 'active',
            item: [
                {
                    linkId: 'target',
                    type: 'string',
                    calculatedExpression: {
                        language: 'text/fhirpath',
                        expression: '%resource.item.first().linkId.customFn()',
                    },
                } as FCEQuestionnaireItem,
            ],
        };

        const questionnaireResponse: QuestionnaireResponse = {
            resourceType: 'QuestionnaireResponse',
            status: 'in-progress',
            item: [{ linkId: 'target' }],
        };

        const initialContext = createInitialContext(questionnaire, questionnaireResponse);

        const customEvaluateFhirpath: EvaluateFhirpath = (fhirData, path, context, model, options) =>
            fhirpath.evaluate(fhirData, path, context, model, {
                async: false,
                ...options,
                userInvocationTable: {
                    ...options?.userInvocationTable,
                    customFn: {
                        fn: () => {
                            return ['from-custom-evaluator'];
                        },
                        arity: { 0: [], 1: ['String'] },
                    },
                },
            });

        const providerProps = createQRFProviderProps({
            evaluateFhirpath: customEvaluateFhirpath,
        });
        const setFormValuesSpy = providerProps.setFormValues as ReturnType<typeof vi.fn>;

        render(
            <QuestionnaireResponseFormProvider {...providerProps}>
                <QuestionItem parentPath={[]} context={initialContext} questionItem={questionnaire.item![0]} />
            </QuestionnaireResponseFormProvider>,
        );

        await waitFor(() => {
            expect(setFormValuesSpy).toHaveBeenCalled();
        });

        const lastCall = setFormValuesSpy.mock.calls.at(-1)!;
        const answers = lastCall[2] as any[];

        expect(answers).toHaveLength(1);
        expect(answers).toStrictEqual([{ value: { string: 'from-custom-evaluator' } }]);
    });
});
