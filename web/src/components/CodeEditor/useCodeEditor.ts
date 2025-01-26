import { history, indentWithTab } from '@codemirror/commands';
import { StreamLanguage, defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import * as yamlMode from '@codemirror/legacy-modes/mode/yaml';
import { Annotation, EditorState } from '@codemirror/state';
import {
    EditorView,
    ViewUpdate,
    gutter,
    highlightActiveLine,
    keymap,
    lineNumbers,
} from '@codemirror/view';
import yaml, { YAMLException } from 'js-yaml';
import { useEffect, useState } from 'react';
import { toYaml } from 'web/src/utils/yaml';

const yamlExt = StreamLanguage.define(yamlMode.yaml);

const External = Annotation.define<boolean>();

import { CodeEditorProps } from './types';

interface Props<R> extends CodeEditorProps<R> {
    container?: HTMLDivElement | null;
}

export function useCodeEditor<R>(props: Props<R>) {
    const { value, onChange, onParseError, readOnly = false } = props;
    const [container, setContainer] = useState<HTMLDivElement>();
    const [view, setView] = useState<EditorView>();
    const [state, setState] = useState<EditorState>();

    useEffect(() => setContainer(props.container!), [props.container]);

    const onDocChanged = EditorView.updateListener.of((vu: ViewUpdate) => {
        if (vu.docChanged && onChange && !vu.transactions.some((tr) => tr.annotation(External))) {
            const doc = vu.state.doc;
            try {
                onChange(yaml.load(doc.toString()) as R, vu);
                onParseError?.(null);
            } catch (e: unknown) {
                if (e instanceof YAMLException) {
                    onParseError?.(e);
                }
            }
        }
    });

    useEffect(() => {
        if (container && !state) {
            const config = {
                doc: toYaml(value),
                lineNumbers: true,
                extensions: [
                    syntaxHighlighting(defaultHighlightStyle),
                    highlightActiveLine(),
                    onDocChanged,
                    yamlExt,
                    EditorState.readOnly.of(readOnly),
                    history(),
                    keymap.of([indentWithTab]),
                    lineNumbers(),
                    gutter({}),
                ],
            };
            const newState = EditorState.create(config);
            setState(newState);

            if (!view) {
                const newView = new EditorView({
                    state: newState,
                    parent: container,
                });
                setView(newView);
            }
        }
        return () => {
            if (view) {
                view.destroy();
                setState(undefined);
                setView(undefined);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [container, state]);

    useEffect(() => {
        if (value === undefined) {
            return;
        }
        const currentValue = view ? view.state.doc.toString() : '';

        if (view && value !== currentValue) {
            view.dispatch({
                changes: { from: 0, to: currentValue.length, insert: toYaml(value) || '' },
                annotations: [External.of(true)],
            });
        }
    }, [value, view]);

    return { value, view, state };
}
