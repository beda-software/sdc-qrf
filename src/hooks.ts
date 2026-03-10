import { useContext, useEffect, useMemo, useState } from 'react';
import type { AxiosRequestConfig } from 'axios';
import { FCEQuestionnaireItem } from './fce.types';
import { type RemoteData, isSuccess, loading, success, mapSuccess, sequenceArray } from '@beda.software/remote-data';

import { QRFContext } from './context';
import { ItemContext } from './types';
import { resolveTemplateExpr, evaluateFHIRPathExpression, getBranchItems, stripNonEnumerable } from './utils';

export function useQuestionnaireResponseFormContext() {
    return useContext(QRFContext);
}

export type UseQuestionItemContextArgs = {
    initialContext: ItemContext;
    branchItems: ReturnType<typeof getBranchItems>;
    fhirService: (config: AxiosRequestConfig) => Promise<RemoteData<unknown>>;
    questionItem: FCEQuestionnaireItem;
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
    const { initialContext, branchItems, fhirService, questionItem } = props;
    const { variable, linkId } = questionItem;
    const variables = useMemo(() => variable ?? [], [variable]);
    const [asyncState, setAsyncState] = useState<AsyncState>({});

    useEffect(() => {
        branchItems.qrItems.forEach((qrItem, branchIndex) => {
            const workingContext: ItemContext = {
                ...initialContext,
                context: qrItem,
                qitem: branchItems.qItem,
            };

            variables.forEach((variable) => {
                if (!variable?.name || !variable.expression) {
                    return;
                }

                const { name, expression, language } = variable;

                const branchState = asyncState[branchIndex] ?? {};
                const current = branchState[name];

                if (language === 'application/x-fhir-query') {
                    const url = resolveTemplateExpr(expression!, workingContext, `${linkId}.variable.${name}`, true);

                    if (!url) {
                        workingContext[name] = null;
                        return;
                    }

                    const key = url;

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
                    const result = evaluateFHIRPathExpression(variable, workingContext, `${linkId}.variable.${name}`);
                    // Fhirpath returns result with non-enumerable properties such as __path__
                    // It's cleaned up here because it's not part of actual value
                    const key = JSON.stringify(result.map(stripNonEnumerable));

                    workingContext[name] = result;

                    if (current && current.key === key) {
                        return;
                    }

                    setAsyncState((prev) => {
                        const prevBranch = prev[branchIndex] ?? {};

                        return {
                            ...prev,
                            [branchIndex]: {
                                ...prevBranch,
                                [name]: { key, remoteData: success(result) },
                            },
                        };
                    });
                }
            });
        });
    }, [asyncState, branchItems, fhirService, initialContext, variables]);

    const contexts = useMemo(() => {
        return branchItems.qrItems.map<ItemContext>((qrItem, branchIndex) => {
            const workingContext: ItemContext = {
                ...initialContext,
                context: qrItem,
                qitem: branchItems.qItem,
            };

            variables.forEach((variable) => {
                if (!variable?.name || !variable.expression) {
                    return;
                }

                const { name } = variable;

                const branchState = asyncState[branchIndex];
                const current = branchState?.[name];

                if (current && isSuccess(current.remoteData)) {
                    workingContext[name] = current.remoteData.data;
                } else {
                    workingContext[name] = null;
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
