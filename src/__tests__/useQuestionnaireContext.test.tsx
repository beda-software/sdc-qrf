import { renderHook, waitFor } from '@testing-library/react';
import { isSuccess, success } from '@beda.software/remote-data';
import { describe, expect, test, vi } from 'vitest';

import { useQuestionnaireContext } from '../hooks';
import type { QuestionnaireResponseFormData } from '../types';
import type { FCEQuestionnaire } from '../fce.types';

function buildFHIRServiceMock(mapping: Record<string, any>) {
    return vi.fn(async (config: { url?: string }) => {
        if (config.url && mapping[config.url]) {
            return success(mapping[config.url]);
        }

        return success({});
    });
}

function buildContext(variable: FCEQuestionnaire['variable']): QuestionnaireResponseFormData['context'] {
    const fceQuestionnaire: FCEQuestionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        item: [],
        variable,
    };

    return {
        questionnaireResponse: { resourceType: 'QuestionnaireResponse', status: 'in-progress' },
        questionnaire: fceQuestionnaire as any,
        fceQuestionnaire,
        launchContextParameters: [{ name: 'patient', resource: { resourceType: 'Patient', id: 'p1' } }],
    };
}

describe('useQuestionnaireContext', () => {
    test('fetches x-fhir-query variables and feeds dependent fhirpath variables', async () => {
        const qrfDataContext = buildContext([
            {
                name: 'PatientBundle',
                language: 'application/x-fhir-query',
                expression: 'Patient?_id={{ %patient.id }}',
            },
            {
                name: 'PatientFamily',
                language: 'text/fhirpath',
                expression: '%PatientBundle.entry.resource.name.family',
            },
        ]);

        const fhirService = buildFHIRServiceMock({
            'Patient?_id=p1': {
                entry: [{ resource: { resourceType: 'Patient', name: [{ family: 'Smith' }] } }],
            },
        });

        const { result } = renderHook(() => useQuestionnaireContext({ qrfDataContext, values: {}, fhirService }));

        // Before the fetch resolves, the query variable is empty (no crash).
        expect(result.current.context.PatientBundle).toStrictEqual([]);
        expect(result.current.context.PatientFamily).toStrictEqual([]);

        await waitFor(() => {
            expect(result.current.context.PatientFamily?.[0]).toEqual('Smith');
        });

        expect(isSuccess(result.current.evaluationResponse)).toBe(true);
        expect(fhirService).toHaveBeenCalledWith(expect.objectContaining({ url: 'Patient?_id=p1' }));
    });

    test('does not re-issue the request when the resolved URL is unchanged', async () => {
        const qrfDataContext = buildContext([
            {
                name: 'PatientBundle',
                language: 'application/x-fhir-query',
                expression: 'Patient?_id={{ %patient.id }}',
            },
        ]);

        const fhirService = buildFHIRServiceMock({
            'Patient?_id=p1': { entry: [{ resource: { resourceType: 'Patient' } }] },
        });

        const { result, rerender } = renderHook(() =>
            useQuestionnaireContext({ qrfDataContext, values: {}, fhirService }),
        );

        await waitFor(() => {
            expect(isSuccess(result.current.evaluationResponse)).toBe(true);
        });

        rerender();
        rerender();

        expect(fhirService).toHaveBeenCalledTimes(1);
    });
});
