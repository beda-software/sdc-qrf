import React, { useState } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { QuestionnaireResponse } from 'fhir/r4b';
import { success } from '@beda.software/remote-data';

import { QuestionItems, QuestionnaireResponseFormProvider } from '../components';
import { expandEnableWhenExpressions, mapResponseToForm } from '../utils';
import type { FormItems, GroupItemComponent, ItemContext, QRFContextData, QuestionItemComponent } from '../types';
import type { FCEQuestionnaire } from '../fce.types';

const SpyComponent: QuestionItemComponent = ({ questionItem, parentPath }) => {
    return <div data-testid={[...parentPath, questionItem.linkId!].join('.')} />;
};

const TestGroupComponent: GroupItemComponent = ({ questionItem, context, parentPath }) => {
    const { linkId, item, repeats } = questionItem;
    if (repeats) {
        return (
            <>
                {context.map((ctx, i) => (
                    <QuestionItems
                        key={i}
                        questionItems={item ?? []}
                        parentPath={[...parentPath, linkId!, 'items', i.toString()]}
                        context={ctx}
                    />
                ))}
            </>
        );
    }
    return (
        <QuestionItems
            questionItems={item ?? []}
            parentPath={[...parentPath, linkId!, 'items']}
            context={context[0]!}
        />
    );
};

function createInitialContext(questionnaire: FCEQuestionnaire, qr: QuestionnaireResponse): ItemContext {
    return {
        questionnaire,
        resource: qr,
        context: qr,
    };
}

function createProviderProps(initialFormValues: FormItems): QRFContextData {
    return {
        questionItemComponents: { string: SpyComponent, boolean: SpyComponent },
        groupItemComponent: TestGroupComponent,
        formValues: initialFormValues,
        setFormValues: vi.fn(),
        fhirService: vi.fn(async () => success({})),
    };
}

function StatefulFormProvider({
    initialFormValues,
    children,
}: {
    initialFormValues: FormItems;
    children: React.ReactNode;
}) {
    const [formValues, setFormValuesState] = useState<FormItems>(initialFormValues);
    const setFormValues = vi.fn((newValues: FormItems) => {
        setFormValuesState(newValues);
    });
    return (
        <QuestionnaireResponseFormProvider
            questionItemComponents={{ string: SpyComponent, boolean: SpyComponent }}
            groupItemComponent={TestGroupComponent}
            formValues={formValues}
            setFormValues={setFormValues}
            fhirService={vi.fn(async () => success({}))}
        >
            {children}
        </QuestionnaireResponseFormProvider>
    );
}

const ewe = (expression: string) => ({
    language: 'text/fhirpath' as const,
    expression,
});

afterEach(cleanup);

describe('QuestionItems enableWhenExpression', () => {
    const questionnaire: FCEQuestionnaire = expandEnableWhenExpressions({
        resourceType: 'Questionnaire',
        status: 'active',
        item: [
            { linkId: 'q-root-1', type: 'string' },
            {
                linkId: 'q-root-deps-root-1',
                type: 'string',
                enableWhenExpression: ewe(
                    "%resource.repeat(item).where(linkId='q-root-1').answer.valueString.exists()",
                ),
            },
            {
                linkId: 'a',
                type: 'group',
                item: [
                    { linkId: 'q-a-1', type: 'string' },
                    {
                        linkId: 'q-a-deps-a-1',
                        type: 'string',
                        enableWhenExpression: ewe(
                            "%resource.repeat(item).where(linkId='q-a-1').answer.valueString.exists()",
                        ),
                    },
                    {
                        linkId: 'q-a-deps-root-1',
                        type: 'string',
                        enableWhenExpression: ewe(
                            "%resource.repeat(item).where(linkId='q-root-1').answer.valueString.exists()",
                        ),
                    },
                ],
            },
            {
                linkId: 'b',
                type: 'group',
                repeats: true,
                variable: [
                    {
                        name: 'QB1',
                        language: 'text/fhirpath',
                        expression: "%context.item.where(linkId='q-b-1').answer.valueString",
                    },
                    {
                        name: 'QB2',
                        language: 'text/fhirpath',
                        expression: "%context.item.where(linkId='q-b-2').answer.valueString",
                    },
                ],
                item: [
                    { linkId: 'q-b-1', type: 'string' },
                    {
                        linkId: 'q-b-deps-b-1',
                        type: 'string',
                        enableWhenExpression: ewe('%QB1.exists()'),
                    },
                    { linkId: 'q-b-2', type: 'string' },
                    {
                        linkId: 'q-b-deps-b-2',
                        type: 'string',
                        enableWhenExpression: ewe('%QB2.exists()'),
                    },
                    {
                        linkId: 'q-b-deps-root-1',
                        type: 'string',
                        enableWhenExpression: ewe(
                            "%resource.repeat(item).where(linkId='q-root-1').answer.valueString.exists()",
                        ),
                    },
                    {
                        linkId: 'q-b-deps-a-1',
                        type: 'string',
                        enableWhenExpression: ewe(
                            "%resource.repeat(item).where(linkId='q-a-1').answer.valueString.exists()",
                        ),
                    },
                ],
            },
        ],
    });

    test('hides dependent questions when conditions are not met', async () => {
        const qr: QuestionnaireResponse = {
            resourceType: 'QuestionnaireResponse',
            status: 'in-progress',
            item: [
                { linkId: 'q-root-1' },
                { linkId: 'a', item: [{ linkId: 'q-a-1' }] },
                {
                    linkId: 'b',
                    item: [{ linkId: 'q-b-1' }, { linkId: 'q-b-2' }],
                },
            ],
        };

        const formValues = mapResponseToForm(qr, questionnaire);
        const context = createInitialContext(questionnaire, qr);

        render(
            <QuestionnaireResponseFormProvider {...createProviderProps(formValues)}>
                <QuestionItems questionItems={questionnaire.item!} parentPath={[]} context={context} />
            </QuestionnaireResponseFormProvider>,
        );

        await waitFor(() => {
            expect(screen.getByTestId('q-root-1')).toBeDefined();
        });

        expect(screen.getByTestId('q-root-1')).toBeDefined();
        expect(screen.getByTestId('a.items.q-a-1')).toBeDefined();
        expect(screen.getByTestId('b.items.0.q-b-1')).toBeDefined();
        expect(screen.getByTestId('b.items.0.q-b-2')).toBeDefined();

        expect(screen.queryByTestId('q-root-deps-root-1')).toBeNull();
        expect(screen.queryByTestId('a.items.q-a-deps-a-1')).toBeNull();
        expect(screen.queryByTestId('a.items.q-a-deps-root-1')).toBeNull();
        expect(screen.queryByTestId('b.items.0.q-b-deps-b-1')).toBeNull();
        expect(screen.queryByTestId('b.items.0.q-b-deps-b-2')).toBeNull();
        expect(screen.queryByTestId('b.items.0.q-b-deps-root-1')).toBeNull();
        expect(screen.queryByTestId('b.items.0.q-b-deps-a-1')).toBeNull();
    });

    test('shows dependent questions when conditions are met, with repeatable group isolation', async () => {
        const qr: QuestionnaireResponse = {
            resourceType: 'QuestionnaireResponse',
            status: 'in-progress',
            item: [
                { linkId: 'q-root-1', answer: [{ valueString: 'filled' }] },
                { linkId: 'q-root-deps-root-1' },
                {
                    linkId: 'a',
                    item: [
                        { linkId: 'q-a-1', answer: [{ valueString: 'filled' }] },
                        { linkId: 'q-a-deps-a-1' },
                        { linkId: 'q-a-deps-root-1' },
                    ],
                },
                {
                    linkId: 'b',
                    item: [
                        { linkId: 'q-b-1', answer: [{ valueString: 'filled' }] },
                        { linkId: 'q-b-deps-b-1' },
                        { linkId: 'q-b-2' },
                        { linkId: 'q-b-deps-b-2' },
                        { linkId: 'q-b-deps-root-1' },
                        { linkId: 'q-b-deps-a-1' },
                    ],
                },
                {
                    linkId: 'b',
                    item: [
                        { linkId: 'q-b-1' },
                        { linkId: 'q-b-deps-b-1' },
                        { linkId: 'q-b-2', answer: [{ valueString: 'filled' }] },
                        { linkId: 'q-b-deps-b-2' },
                        { linkId: 'q-b-deps-root-1' },
                        { linkId: 'q-b-deps-a-1' },
                    ],
                },
            ],
        };

        const formValues = mapResponseToForm(qr, questionnaire);
        const context = createInitialContext(questionnaire, qr);

        render(
            <StatefulFormProvider initialFormValues={formValues}>
                <QuestionItems questionItems={questionnaire.item!} parentPath={[]} context={context} />
            </StatefulFormProvider>,
        );

        await waitFor(
            () => {
                expect(screen.getByTestId('q-root-deps-root-1')).toBeDefined();
            },
            { timeout: 2000 },
        );

        // Root level
        expect(screen.getByTestId('q-root-1')).toBeDefined();
        expect(screen.getByTestId('q-root-deps-root-1')).toBeDefined();

        // Group a
        expect(screen.getByTestId('a.items.q-a-1')).toBeDefined();
        expect(screen.getByTestId('a.items.q-a-deps-a-1')).toBeDefined();
        expect(screen.getByTestId('a.items.q-a-deps-root-1')).toBeDefined();

        // Group b repeat 0: q-b-1 filled, q-b-2 not
        expect(screen.getByTestId('b.items.0.q-b-1')).toBeDefined();
        expect(screen.getByTestId('b.items.0.q-b-deps-b-1')).toBeDefined();
        expect(screen.getByTestId('b.items.0.q-b-2')).toBeDefined();
        expect(screen.queryByTestId('b.items.0.q-b-deps-b-2')).toBeNull();
        expect(screen.getByTestId('b.items.0.q-b-deps-root-1')).toBeDefined();
        expect(screen.getByTestId('b.items.0.q-b-deps-a-1')).toBeDefined();

        // Group b repeat 1: q-b-1 not filled, q-b-2 filled
        expect(screen.getByTestId('b.items.1.q-b-1')).toBeDefined();
        expect(screen.queryByTestId('b.items.1.q-b-deps-b-1')).toBeNull();
        expect(screen.getByTestId('b.items.1.q-b-2')).toBeDefined();
        expect(screen.getByTestId('b.items.1.q-b-deps-b-2')).toBeDefined();
        expect(screen.getByTestId('b.items.1.q-b-deps-root-1')).toBeDefined();
        expect(screen.getByTestId('b.items.1.q-b-deps-a-1')).toBeDefined();
    });
});

describe('QuestionItems expandEnableWhenExpressions (issue #47)', () => {
    /**
     * Use expandEnableWhenExpressions to eliminate enableWhenExpression. When an item has both
     * variable and enableWhenExpression referencing it (%MyVar), expand moves variable to the
     * helper so the expression can be evaluated. See https://github.com/beda-software/sdc-qrf/issues/47
     */
    test('variable is moved to helper so %MyVar in enableWhenExpression works', async () => {
        const questionnaire: FCEQuestionnaire = expandEnableWhenExpressions({
            resourceType: 'Questionnaire',
            status: 'active',
            item: [
                {
                    linkId: 'q-root-1',
                    type: 'string',
                    variable: [
                        {
                            name: 'MyVar',
                            language: 'text/fhirpath',
                            expression: "'value'",
                        },
                    ],
                    enableWhenExpression: ewe("%MyVar = 'value'"),
                },
            ],
        });

        const qr: QuestionnaireResponse = {
            resourceType: 'QuestionnaireResponse',
            status: 'in-progress',
            item: [{ linkId: 'q-root-1' }],
        };

        const formValues = mapResponseToForm(qr, questionnaire);
        const context = createInitialContext(questionnaire, qr);

        render(
            <StatefulFormProvider initialFormValues={formValues}>
                <QuestionItems questionItems={questionnaire.item!} parentPath={[]} context={context} />
            </StatefulFormProvider>,
        );

        await waitFor(() => {
            expect(screen.getByTestId('q-root-1-enable-when-expression')).toBeDefined();
            expect(screen.getByTestId('q-root-1')).toBeDefined();
        });
    });
});
