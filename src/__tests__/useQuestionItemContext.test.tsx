import { renderHook, waitFor } from '@testing-library/react';
import type { Questionnaire, QuestionnaireResponse, QuestionnaireResponseItem } from 'fhir/r4b';
import { isSuccess, success } from '@beda.software/remote-data';
import { describe, expect, test, vi } from 'vitest';

import { useQuestionItemContext } from '../hooks';
import type { ItemContext } from '../types';
import type { FCEQuestionnaireItem } from '../fce.types';
import { getBranchItems } from '../utils.js';

function createInitialContext(questionnaire: Questionnaire, questionnaireResponse: QuestionnaireResponse): ItemContext {
    return {
        questionnaire,
        resource: questionnaireResponse,
        context: questionnaireResponse,
        Questionnaire: questionnaire,
        QuestionnaireResponse: questionnaireResponse,
    };
}

function buildFHIRServiceMock(mapping: Record<string, any>) {
    return vi.fn(async (config: { url?: string }) => {
        if (config.url && mapping[config.url]) {
            return success(mapping[config.url]);
        }

        // Default: empty bundle-like object
        return success({});
    });
}

describe('useQuestionItemContext', () => {
    test('returns single context for non-group question', () => {
        const questionnaire: Questionnaire = {
            resourceType: 'Questionnaire',
            status: 'active',
            item: [
                {
                    linkId: 'q1',
                    type: 'string',
                },
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

        const fieldPath = ['q1'];
        const branchItems = getBranchItems(fieldPath, questionnaire, questionnaireResponse);

        const questionItem: FCEQuestionnaireItem = {
            linkId: 'q1',
            type: 'string',
        };

        const { result } = renderHook(() =>
            useQuestionItemContext({
                initialContext,
                branchItems,
                questionItem,
                fhirService: vi.fn(),
            }),
        );

        expect(result.current.contexts).toHaveLength(1);
        const [context] = result.current.contexts;
        expect(context).toBeDefined();
        expect(context.context).toEqual(branchItems.qrItems[0] as QuestionnaireResponseItem);

        expect(isSuccess(result.current.evaluationResponse)).toBe(true);
        if (isSuccess(result.current.evaluationResponse)) {
            expect(result.current.evaluationResponse.data).toEqual(result.current.contexts);
        }
    });

    test('returns array of contexts for group question', () => {
        const questionnaire: Questionnaire = {
            resourceType: 'Questionnaire',
            status: 'active',
            item: [
                {
                    linkId: 'group1',
                    type: 'group',
                    repeats: true,
                    item: [
                        {
                            linkId: 'q1',
                            type: 'string',
                        },
                    ],
                },
            ],
        };

        const questionnaireResponse: QuestionnaireResponse = {
            resourceType: 'QuestionnaireResponse',
            status: 'in-progress',
            item: [
                {
                    linkId: 'group1',
                    item: [
                        {
                            linkId: 'q1',
                            answer: [
                                {
                                    valueString: 'first',
                                },
                            ],
                        },
                    ],
                },
                {
                    linkId: 'group1',
                    item: [
                        {
                            linkId: 'q1',
                            answer: [
                                {
                                    valueString: 'second',
                                },
                            ],
                        },
                    ],
                },
            ],
        };

        const initialContext = createInitialContext(questionnaire, questionnaireResponse);

        const fieldPath = ['group1'];
        const branchItems = getBranchItems(fieldPath, questionnaire, questionnaireResponse);

        const questionItem: FCEQuestionnaireItem = {
            linkId: 'group1',
            type: 'group',
            variable: [
                {
                    name: 'Num',
                    language: 'text/fhirpath',
                    expression: "item.where(linkId='q1').answer.valueString.first()",
                },
            ],
        };

        const { result } = renderHook(() =>
            useQuestionItemContext({
                initialContext,
                branchItems,
                questionItem,
                fhirService: vi.fn(),
            }),
        );

        expect(branchItems.qrItems).toHaveLength(2);
        expect(result.current.contexts).toHaveLength(2);
        expect(result.current.contexts.map((ctx) => ctx.context)).toEqual(branchItems.qrItems);

        // Each context should have its own Num value derived from the corresponding group's q1 answer
        expect((result.current.contexts[0].Num as string[])[0]).toEqual('first');
        expect((result.current.contexts[1].Num as string[])[0]).toEqual('second');

        expect(isSuccess(result.current.evaluationResponse)).toBe(true);
        if (isSuccess(result.current.evaluationResponse)) {
            expect(result.current.evaluationResponse.data).toEqual(result.current.contexts);
        }
    });
});

describe('useQuestionItemContext with x-fhir-query', () => {
    test('evaluates patient/org variable chain', async () => {
        const questionnaire: Questionnaire = {
            resourceType: 'Questionnaire',
            status: 'active',
            item: [
                {
                    linkId: 'patient-id',
                    type: 'string',
                },
                {
                    linkId: 'org-name',
                    type: 'string',
                    // Variables are evaluated in order
                    variable: [
                        {
                            name: 'PatientBundle',
                            language: 'application/x-fhir-query',
                            expression:
                                "Patient?_id={{ %resource.item.where(linkId='patient-id').answer.valueString }}",
                        },
                        {
                            name: 'OrgId',
                            language: 'text/fhirpath',
                            expression: "%PatientBundle.entry.resource.managingOrganization.reference.split('/')[1]",
                        },
                        {
                            name: 'OrgBundle',
                            language: 'application/x-fhir-query',
                            expression: 'Organization?_id={{ %OrgId }}',
                        },
                        {
                            name: 'OrgName',
                            language: 'text/fhirpath',
                            expression: '%OrgBundle.entry.resource.name',
                        },
                    ],
                } as FCEQuestionnaireItem,
            ],
        };

        const makeQuestionnaireResponse = (patientId?: string): QuestionnaireResponse => ({
            resourceType: 'QuestionnaireResponse',
            status: 'in-progress',
            item: [
                {
                    linkId: 'patient-id',
                    ...(patientId
                        ? {
                              answer: [
                                  {
                                      valueString: patientId,
                                  },
                              ],
                          }
                        : {}),
                },
                {
                    linkId: 'org-name',
                },
            ],
        });

        const fhirService = buildFHIRServiceMock({
            'Patient?_id=p1': {
                entry: [
                    {
                        resource: {
                            managingOrganization: {
                                reference: 'Organization/org1',
                            },
                        },
                    },
                ],
            },
            'Organization?_id=org1': {
                entry: [
                    {
                        resource: {
                            name: 'Acme Org',
                        },
                    },
                ],
            },
        });

        const orgItem = questionnaire.item![1] as FCEQuestionnaireItem;

        const initialQuestionnaireResponse = makeQuestionnaireResponse();
        const initialContext = createInitialContext(questionnaire, initialQuestionnaireResponse);

        const initialBranchItems = getBranchItems([orgItem.linkId], questionnaire, initialQuestionnaireResponse);

        const { result, rerender } = renderHook(
            (props: {
                initialContext: ItemContext;
                branchItems: ReturnType<typeof getBranchItems>;
                questionItem: FCEQuestionnaireItem;
            }) =>
                useQuestionItemContext({
                    ...props,
                    fhirService,
                }),
            {
                initialProps: {
                    initialContext,
                    branchItems: initialBranchItems,
                    questionItem: orgItem,
                },
            },
        );

        // Initial render: variables are null before patient-id is provided
        expect(result.current.contexts[0]).toHaveProperty('PatientBundle', null);
        expect(result.current.contexts[0]).toHaveProperty('OrgBundle', null);

        // Fill patient-id and rerender
        const updatedQuestionnaireResponse = makeQuestionnaireResponse('p1');
        const updatedContext: ItemContext = {
            questionnaire,
            resource: updatedQuestionnaireResponse,
            context: updatedQuestionnaireResponse,
            Questionnaire: questionnaire,
            QuestionnaireResponse: updatedQuestionnaireResponse,
        };
        const updatedBranchItems = getBranchItems([orgItem.linkId], questionnaire, updatedQuestionnaireResponse);

        rerender({
            initialContext: updatedContext,
            branchItems: updatedBranchItems,
            questionItem: orgItem,
        });

        // Wait for PatientBundle to be loaded and OrgId to be calculated
        await waitFor(() => {
            const ctx = result.current.contexts[0];
            expect(ctx.PatientBundle).not.toBeNull();
            expect(ctx.OrgId?.[0]).toEqual('org1');
        });

        // Wait for OrgBundle and OrgName to be fully resolved
        await waitFor(() => {
            const ctx = result.current.contexts[0];
            expect(ctx.OrgBundle).not.toBeNull();
            expect(ctx.OrgName?.[0]).toEqual('Acme Org');
        });
    });

    test('isolates async contexts per branch item', async () => {
        const questionnaire: Questionnaire = {
            resourceType: 'Questionnaire',
            status: 'active',
            item: [
                {
                    linkId: 'row',
                    type: 'group',
                    repeats: true,
                    item: [
                        {
                            linkId: 'patient-id',
                            type: 'string',
                        },
                        {
                            linkId: 'org-name',
                            type: 'string',
                        },
                    ],
                    variable: [
                        {
                            name: 'PatientBundle',
                            language: 'application/x-fhir-query',
                            expression: "Patient?_id={{ %context.item.where(linkId='patient-id').answer.valueString }}",
                        },
                        {
                            name: 'OrgId',
                            language: 'text/fhirpath',
                            expression: "%PatientBundle.entry.resource.managingOrganization.reference.split('/')[1]",
                        },
                        {
                            name: 'OrgBundle',
                            language: 'application/x-fhir-query',
                            expression: 'Organization?_id={{ %OrgId }}',
                        },
                        {
                            name: 'OrgName',
                            language: 'text/fhirpath',
                            expression: '%OrgBundle.entry.resource.name',
                        },
                    ],
                } as FCEQuestionnaireItem,
            ],
        };

        const questionnaireResponse: QuestionnaireResponse = {
            resourceType: 'QuestionnaireResponse',
            status: 'in-progress',
            item: [
                {
                    linkId: 'row',
                    item: [
                        {
                            linkId: 'patient-id',
                            answer: [
                                {
                                    valueString: 'p1',
                                },
                            ],
                        },
                        { linkId: 'org-name' },
                    ],
                },
                {
                    linkId: 'row',
                    item: [
                        {
                            linkId: 'patient-id',
                            answer: [
                                {
                                    valueString: 'p2',
                                },
                            ],
                        },
                        { linkId: 'org-name' },
                    ],
                },
            ],
        };

        const fhirService = buildFHIRServiceMock({
            'Patient?_id=p1': {
                entry: [
                    {
                        resource: {
                            managingOrganization: {
                                reference: 'Organization/org1',
                            },
                        },
                    },
                ],
            },
            'Patient?_id=p2': {
                entry: [
                    {
                        resource: {
                            managingOrganization: {
                                reference: 'Organization/org2',
                            },
                        },
                    },
                ],
            },
            'Organization?_id=org1': {
                entry: [
                    {
                        resource: {
                            name: 'Org A',
                        },
                    },
                ],
            },
            'Organization?_id=org2': {
                entry: [
                    {
                        resource: {
                            name: 'Org B',
                        },
                    },
                ],
            },
        });

        const questionItem = questionnaire.item![0] as FCEQuestionnaireItem;

        const initialContext = createInitialContext(questionnaire, questionnaireResponse);
        const branchItems = getBranchItems(['row'], questionnaire, questionnaireResponse);

        const { result } = renderHook(() =>
            useQuestionItemContext({
                initialContext,
                branchItems,
                questionItem,
                fhirService,
            }),
        );

        await waitFor(() => {
            const [ctxA, ctxB] = result.current.contexts;
            expect(ctxA.OrgBundle.entry[0].resource.name).toEqual('Org A');
            expect(ctxB.OrgBundle.entry[0].resource.name).toEqual('Org B');
        });

        // Ensure we made patient and organization calls for both branches
        expect(fhirService).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'Patient?_id=p1',
            }),
        );
        expect(fhirService).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'Patient?_id=p2',
            }),
        );
        expect(fhirService).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'Organization?_id=org1',
            }),
        );
        expect(fhirService).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'Organization?_id=org2',
            }),
        );
    });
});
