import { ComponentType } from 'react';

import {
    ParametersParameter,
    Questionnaire,
    QuestionnaireItem,
    QuestionnaireResponse,
    QuestionnaireResponseItem,
    QuestionnaireResponseItemAnswer,
} from 'fhir/r4b';
import { FCEQuestionnaire, FCEQuestionnaireItem } from './fce.types';

export type GroupItemComponent = ComponentType<GroupItemProps>;
export type QuestionItemComponent = ComponentType<QuestionItemProps>;

export type QuestionItemComponentMapping = {
    // [type: QuestionnaireItem['type']]: QuestionItemComponent;
    [type: string]: QuestionItemComponent;
};

export type ItemControlQuestionItemComponentMapping = {
    [code: string]: QuestionItemComponent;
};

export type ItemControlGroupItemComponentMapping = {
    [code: string]: GroupItemComponent;
};

export type ItemContext = {
    // ItemContext contains items in FHIR format, this context is passed to all expressions
    resource: QuestionnaireResponse;
    questionnaire: Questionnaire;
    context: QuestionnaireResponseItem | QuestionnaireResponse;
    qitem?: QuestionnaireItem;
    [x: string]: any;
};

export interface QRFContextData {
    questionItemComponents: QuestionItemComponentMapping;
    groupItemComponent?: GroupItemComponent;
    itemControlQuestionItemComponents?: ItemControlQuestionItemComponentMapping;
    itemControlGroupItemComponents?: ItemControlGroupItemComponentMapping;
    readOnly?: boolean;

    formValues: FormItems;
    setFormValues: (values: FormItems, fieldPath: Array<string | number>, value: any) => void;
}

export interface QuestionItemsProps {
    questionItems: FCEQuestionnaireItem[];

    context: ItemContext;
    parentPath: string[];
}

export interface QuestionItemProps {
    questionItem: FCEQuestionnaireItem;

    context: ItemContext;
    parentPath: string[];
}

export interface GroupItemProps {
    questionItem: FCEQuestionnaireItem;

    context: ItemContext[];
    parentPath: string[];
}

export type FHIRAnswerValue = Omit<
    Required<QuestionnaireResponseItemAnswer>,
    'item' | 'id' | '_id' | 'modifierExtension' | 'extension'
>;
// Internal Answer Value that is used in FormItems
export type AnswerValue = { [x: string]: any };

export interface RepeatableFormGroupItems {
    question?: string;
    items?: FormItems[];
}

interface NotRepeatableFormGroupItems {
    question?: string;
    items?: FormItems;
}

export type FormGroupItems = RepeatableFormGroupItems | NotRepeatableFormGroupItems;

export interface FormAnswerItems {
    value?: { [x: string]: any };
    question?: string;
    items?: FormItems;
}

export type FormItems = Record<string, FormGroupItems | FormAnswerItems[] | undefined>;

export interface QuestionnaireResponseFormData {
    formValues: FormItems;
    context: {
        fceQuestionnaire: FCEQuestionnaire;
        questionnaire: Questionnaire;
        questionnaireResponse: QuestionnaireResponse;
        launchContextParameters: ParametersParameter[];
    };
}
