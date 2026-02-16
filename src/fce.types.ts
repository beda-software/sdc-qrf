import {
    Attachment,
    CodeableConcept,
    Coding,
    Duration,
    Expression,
    Extension,
    Quantity,
    Questionnaire,
    QuestionnaireItem,
    QuestionnaireItemAnswerOption,
    Reference,
} from 'fhir/r4b';

export interface FCEQuestionnaire extends Questionnaire {
    /** NOTE: from extension http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-assembleContext */
    assembleContext?: string[];
    /** NOTE: from extension https://jira.hl7.org/browse/FHIR-22356#assembledFrom */
    assembledFrom?: string;
    item?: FCEQuestionnaireItem[];
    /** NOTE: from extension http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemPopulationContext */
    /** Specifies a query that identifies the resource (or set of resources for a repeating item) that should be used to populate this Questionnaire or Questionnaire.item on initial population. */
    itemPopulationContext?: Expression;
    /** NOTE: from extension http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext */
    launchContext?: FCEQuestionnaireLaunchContext[];
    /** NOTE: from extension https://emr-core.beda.software/StructureDefinition/questionnaire-mapper */
    /** List of mapping resources that must be executed on extract */
    mapping?: Array<Reference>;
    /** NOTE: from extension http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-sourceQueries */
    sourceQueries?: Array<Reference>;
    /** NOTE: from extension http://hl7.org/fhir/StructureDefinition/variable */
    /** Variable specifying a logic to generate a variable for use in subsequent logic. The name of the variable will be added to FHIRPath's context when processing descendants of the element that contains this extension. */
    variable?: Expression[];
    /** NOTE: from extension http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-targetStructureMap */
    targetStructureMap?: string[];
}

export interface FCEQuestionnaireItem extends QuestionnaireItem {
    /** NOTE: from extension http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-answerExpression */
    /** An expression (FHIRPath, CQL or FHIR Query) that resolves to a list of permitted answers for the question item or that establishes context for a group item. */
    answerExpression?: Expression;
    /** NOTE: from extension http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression */
    /** Calculated value for a question answer as determined by an evaluated expression. */
    calculatedExpression?: Expression;
    /** NOTE: from extension http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-choiceColumn */
    /** Guide for rendering multi-column choices */
    choiceColumn?: FCEQuestionnaireItemChoiceColumn[];
    /** NOTE: from extension http://hl7.org/fhir/StructureDefinition/questionnaire-constraint */
    /** An invariant that must be satisfied before responses to the questionnaire can be considered "complete". */
    itemConstraint?: FCEQuestionnaireItemConstraint[];
    /** NOTE: from extension http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-answerOptionsToggleExpression */
    /** A complex expression that provides a list of the allowed options that should be enabled or disabled based on the evaluation of a provided expression. */
    answerOptionsToggleExpression?: FCEQuestionnaireItemAnswerOptionsToggleExpression[];
    /** NOTE: from extension http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-enableWhenExpression */
    /** An expression that returns a boolean value for whether to enable the item. */
    enableWhenExpression?: Expression;
    /** NOTE: from extension http://hl7.org/fhir/StructureDefinition/questionnaire-hidden */
    hidden?: boolean;
    /** NOTE: from extension http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression */
    /** Initial value for a question answer as determined by an evaluated expression. */
    initialExpression?: Expression;
    /** Nested questionnaire items */
    item?: FCEQuestionnaireItem[];
    /** NOTE: from extension http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl */
    /** The type of data entry control or structure that should be used to render the item. */
    itemControl?: CodeableConcept;
    /** NOTE: from extension http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemPopulationContext */
    /** Specifies a query that identifies the resource (or set of resources for a repeating item) that should be used to populate this Questionnaire or Questionnaire.item on initial population. */
    itemPopulationContext?: Expression;
    /** NOTE: from extension https://emr-core.beda.software/StructureDefinition/macro */
    macro?: string;
    _readOnly?: FCEQuestionnaireItemReadOnly;
    /** NOTE: from extension http://hl7.org/fhir/StructureDefinition/questionnaire-referenceResource */
    /** Where the type for a question is Reference, indicates a type of resource that is permitted. */
    referenceResource?: string[];
    _required?: FCEQuestionnaireItemRequired;
    /** NOTE: from extension https://jira.hl7.org/browse/FHIR-22356#subQuestionnaire */
    subQuestionnaire?: string;
    _text?: FCEQuestionnaireItemText;
    /** NOTE: from extension https://jira.hl7.org/browse/FHIR-22356#subQuestionnaire */
    /** Additional instructions for the user to guide their input (i.e. a human readable version of a regular expression like “nnn-nnn-nnn”). In most UIs this is the placeholder (or ‘ghost’) text placed directly inside the edit controls and that disappear when the control gets the focus. */
    entryFormat?: string;
    /** NOTE: from extension http://hl7.org/fhir/StructureDefinition/entryFormat */
    /** NOTE: from extension http://hl7.org/fhir/StructureDefinition/variable */
    /** Variable specifying a logic to generate a variable for use in subsequent logic. The name of the variable will be added to FHIRPath's context when processing descendants of the element that contains this extension. */
    variable?: Expression[];
    unit?: Coding;
    sliderStepValue?: number;
    adjustLastToRight?: boolean;
    start?: number;
    stop?: number;
    helpText?: string;
    stopLabel?: string;
    rowsNumber?: number;
    colsNumber?: number;
    unitOption?: Coding[];
    columnSize?: number;
    itemMedia?: Attachment;
    regex?: string;
    observationExtract?: boolean;
    observationLinkPeriod?: Duration;
    minValue?: Extension;
    maxValue?: Extension;
    minQuantity?: Extension;
    maxQuantity?: Extension;
    minOccurs?: number;
    maxOccurs?: number;
    showOrdinalValue?: boolean;
    preferredTerminologyServer?: string;
    openLabel?: string;
    backgroundImage?: Attachment;
    language?: Coding;
    choiceOrientation?: 'horizontal' | 'vertical';
    choiceColumns?: number;
    ordinalValue?: number;
    mimeType?: string[];
    enableChart?: FCEQuestionnaireItemEnableChart;
    enableFiltering?: boolean;
    enableSort?: boolean;
    defaultSort?: FCEQuestionnaireItemDefaultSort;
}

export interface FCEQuestionnaireItemText {
    cqfExpression?: Expression;
    extension?: Extension[];
}

export interface FCEQuestionnaireItemReadOnly {
    cqfExpression?: Expression;
    extension?: Extension[];
}

export interface FCEQuestionnaireItemRequired {
    cqfExpression?: Expression;
    extension?: Extension[];
}

export interface FCEQuestionnaireItemChoiceColumn {
    /** NOTE: from extension forDisplay */
    /** Use for display ? */
    forDisplay?: boolean;
    /** NOTE: from extension label */
    /** Column label */
    label?: string;
    /** NOTE: from extension path */
    /** Column path */
    path?: string;
    /** NOTE: from extension width */
    /** Width of column */
    width?: Quantity;
}

export interface FCEQuestionnaireItemConstraint {
    /** NOTE: from extension expression */
    expression: string;
    /** NOTE: from extension human */
    human: string;
    /** NOTE: from extension key */
    key: string;
    /** NOTE: from extension location */
    // TODO: not supported yet
    // location?: string[];
    /** NOTE: from extension requirements */
    requirements?: string;
    /** NOTE: from extension severity */
    severity: string;
}

export type FCEQuestionnaireItemAnswerOptionsToggleExpressionOption = Omit<
    QuestionnaireItemAnswerOption,
    'initialSelected' | '_initialSelected'
>;

export interface FCEQuestionnaireItemAnswerOptionsToggleExpression {
    expression: Expression;
    option: Array<FCEQuestionnaireItemAnswerOptionsToggleExpressionOption>;
}

export interface FCEQuestionnaireItemEnableChart {
    linkIdX?: string;
    linkIdY?: string;
}

export interface FCEQuestionnaireItemDefaultSort {
    linkId?: string;
    sort?: 'asc' | 'desc';
}
export interface FCEQuestionnaireLaunchContext {
    /** NOTE: from extension description */
    description?: string;
    /** NOTE: from extension name */
    name?: Coding;
    /** NOTE: from extension type */
    type?: string;
}
