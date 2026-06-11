import { useContext, useEffect, useMemo, useState } from 'react';
import type { AxiosRequestConfig } from 'axios';
import { FCEQuestionnaireItem } from './fce.types';
import { type RemoteData, isSuccess, loading, success, mapSuccess, sequenceArray } from '@beda.software/remote-data';

import { QRFContext } from './context';
import { EvaluateFhirpath, FormItems, ItemContext, QuestionnaireResponseFormData } from './types';
import {
    calcInitialContext,
    resolveItemPopulationContext,
    resolveTemplateExpr,
    evaluateFHIRPathExpression,
    getBranchItems,
} from './utils';

export function useQuestionnaireResponseFormContext() {
    return useContext(QRFContext);
}

export type UseQuestionItemContextArgs = {
    initialContext: ItemContext;
    branchItems: ReturnType<typeof getBranchItems>;
    fhirService: (config: AxiosRequestConfig) => Promise<RemoteData<unknown>>;
    questionItem: FCEQuestionnaireItem;
    evaluateFhirpath?: EvaluateFhirpath;
};

type AsyncState = Record<
    number,
    Record<
        string,
        {
            key: string;
            remoteData: RemoteData<unknown>;
        }
    >
>;

export function useQuestionItemContext(props: UseQuestionItemContextArgs): {
    contexts: ItemContext[];
    evaluationResponse: RemoteData<ItemContext[]>;
} {
    const { initialContext, branchItems, fhirService, questionItem, evaluateFhirpath } = props;
    const { variable, linkId } = questionItem;
    const variables = useMemo(() => variable ?? [], [variable]);
    const [asyncState, setAsyncState] = useState<AsyncState>({});

    useEffect(() => {
        branchItems.qrItems.forEach((qrItem, branchIndex) => {
            let workingContext: ItemContext = {
                ...initialContext,
                context: qrItem,
                qitem: branchItems.qItem,
            };
            // Bind the item's itemPopulationContext so the item's variables/expressions and its
            // descendants can reference it (e.g. `%PostalAddressArray`).
            workingContext = resolveItemPopulationContext(workingContext, questionItem, evaluateFhirpath);

            variables.forEach((variable) => {
                if (!variable?.name || !variable.expression) {
                    return;
                }

                const { name, expression, language } = variable;

                if (language === 'application/x-fhir-query') {
                    const url = resolveTemplateExpr(expression!, workingContext, `${linkId}.variable.${name}`, true);

                    if (!url) {
                        workingContext[name] = null;
                        return;
                    }

                    const key = url;
                    const branchState = asyncState[branchIndex] ?? {};
                    const current = branchState[name];

                    if (current && current.key === key) {
                        if (isSuccess(current.remoteData)) {
                            workingContext[name] = current.remoteData.data;
                        } else {
                            workingContext[name] = null;
                        }
                        return;
                    }

                    workingContext[name] = null;

                    setAsyncState((prev) => {
                        return {
                            ...prev,
                            [branchIndex]: {
                                ...(prev[branchIndex] ?? {}),
                                [name]: { key, remoteData: loading },
                            },
                        };
                    });

                    void (async () => {
                        const remoteData = await fhirService({
                            url,
                            method: 'GET',
                        });

                        setAsyncState((prev) => {
                            const prevBranch = prev[branchIndex] ?? {};
                            const prevVar = prevBranch[name];

                            // Ignore outdated responses (url mismatch)
                            if (prevVar && prevVar.key !== key) {
                                return prev;
                            }

                            return {
                                ...prev,
                                [branchIndex]: {
                                    ...prevBranch,
                                    [name]: { key, remoteData },
                                },
                            };
                        });
                    })();
                } else {
                    workingContext[name] = evaluateFHIRPathExpression(
                        variable,
                        workingContext,
                        `${linkId}.variable.${name}`,
                        evaluateFhirpath,
                    );
                }
            });
        });
    }, [asyncState, branchItems, fhirService, initialContext, variables]);

    const contexts = useMemo(() => {
        return branchItems.qrItems.map<ItemContext>((qrItem, branchIndex) => {
            let workingContext: ItemContext = {
                ...initialContext,
                context: qrItem,
                qitem: branchItems.qItem,
            };
            // Bind the item's itemPopulationContext so the item's expressions and its descendants
            // (rendered with this context) can reference it (e.g. `%PostalAddressArray`).
            workingContext = resolveItemPopulationContext(workingContext, questionItem, evaluateFhirpath);

            variables.forEach((variable) => {
                if (!variable?.name || !variable.expression) {
                    return;
                }

                const { name, language } = variable;

                if (language === 'application/x-fhir-query') {
                    const branchState = asyncState[branchIndex] ?? {};
                    const current = branchState[name];

                    if (current && isSuccess(current.remoteData)) {
                        workingContext[name] = current.remoteData.data;
                    } else {
                        workingContext[name] = null;
                    }
                } else {
                    workingContext[name] = evaluateFHIRPathExpression(
                        variable,
                        workingContext,
                        `${linkId}.variable.${name}`,
                        evaluateFhirpath,
                    );
                }
            });

            return workingContext;
        });
    }, [asyncState, branchItems, initialContext, variables]);

    const evaluationResponse: RemoteData<ItemContext[]> = useMemo(() => {
        const remoteList: RemoteData<unknown>[] = [];
        Object.values(asyncState).forEach((branchState) => {
            Object.values(branchState).forEach(({ remoteData }) => {
                remoteList.push(remoteData);
            });
        });

        if (!remoteList.length) {
            return success<ItemContext[]>(contexts);
        }

        return mapSuccess(sequenceArray(remoteList), () => contexts);
    }, [asyncState, contexts]);

    return {
        contexts,
        evaluationResponse,
    };
}

export type UseQuestionnaireContextArgs = {
    qrfDataContext: QuestionnaireResponseFormData['context'];
    values: FormItems;
    fhirService: (config: AxiosRequestConfig) => Promise<RemoteData<unknown>>;
    evaluateFhirpath?: EvaluateFhirpath;
};

type QuestionnaireAsyncState = Record<
    string,
    {
        key: string;
        remoteData: RemoteData<unknown>;
    }
>;

export function useQuestionnaireContext(props: UseQuestionnaireContextArgs): {
    context: ItemContext;
    evaluationResponse: RemoteData<ItemContext>;
} {
    const { qrfDataContext, values, fhirService, evaluateFhirpath } = props;
    const variables = useMemo(
        () => qrfDataContext.fceQuestionnaire.variable ?? [],
        [qrfDataContext.fceQuestionnaire.variable],
    );
    const [asyncState, setAsyncState] = useState<QuestionnaireAsyncState>({});

    const resolutionContext = useMemo(
        () => calcInitialContext(qrfDataContext, values, evaluateFhirpath),
        [qrfDataContext, values, evaluateFhirpath],
    );

    useEffect(() => {
        variables.forEach((variable) => {
            if (!variable?.name || !variable.expression || variable.language !== 'application/x-fhir-query') {
                return;
            }

            const { name, expression } = variable;
            const url = resolveTemplateExpr(expression, resolutionContext, `questionnaire.variable.${name}`, true);

            if (!url) {
                return;
            }

            const current = asyncState[name];
            if (current && current.key === url) {
                // Already fetching/fetched this exact URL.
                return;
            }

            setAsyncState((prev) => ({
                ...prev,
                [name]: { key: url, remoteData: loading },
            }));

            void (async () => {
                const remoteData = await fhirService({ url, method: 'GET' });

                setAsyncState((prev) => {
                    const prevVar = prev[name];

                    // Ignore outdated responses (url mismatch).
                    if (prevVar && prevVar.key !== url) {
                        return prev;
                    }

                    return {
                        ...prev,
                        [name]: { key: url, remoteData },
                    };
                });
            })();
        });
    }, [asyncState, resolutionContext, fhirService, variables]);

    const resolvedQueryVariables = useMemo(() => {
        const resolved: Record<string, unknown> = {};
        Object.entries(asyncState).forEach(([name, { remoteData }]) => {
            if (isSuccess(remoteData)) {
                resolved[name] = remoteData.data;
            }
        });
        return resolved;
    }, [asyncState]);

    const context = useMemo(
        () => calcInitialContext(qrfDataContext, values, evaluateFhirpath, resolvedQueryVariables),
        [qrfDataContext, values, evaluateFhirpath, resolvedQueryVariables],
    );

    const evaluationResponse: RemoteData<ItemContext> = useMemo(() => {
        const remoteList = Object.values(asyncState).map(({ remoteData }) => remoteData);

        if (!remoteList.length) {
            return success<ItemContext>(context);
        }

        return mapSuccess(sequenceArray(remoteList), () => context);
    }, [asyncState, context]);

    return {
        context,
        evaluationResponse,
    };
}
