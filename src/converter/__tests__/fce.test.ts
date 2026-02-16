import { Questionnaire as FHIRQuestionnaire } from 'fhir/r4b';
import { describe, expect, test } from 'vitest';

// fce questionnaire
import fce_allergies from './resources/questionnaire_fce/allergies.json';
import fce_answer_options_toggle_expression from './resources/questionnaire_fce/answerOptionsToggleExpression.json';
import fce_assemble_context from './resources/questionnaire_fce/assemble_context.json';
import fce_beverages from './resources/questionnaire_fce/beverages.json';
import fce_choice_answer_option from './resources/questionnaire_fce/choice_answer_option.json';
import fce_consent from './resources/questionnaire_fce/consent.json';
import fce_constraint from './resources/questionnaire_fce/constraint.json';
import fce_cqf_examples from './resources/questionnaire_fce/cqf-examples.json';
import fce_deafult_sort from './resources/questionnaire_fce/default_sort.json';
import fce_enable_chart from './resources/questionnaire_fce/enable_chart.json';
import fce_enable_when from './resources/questionnaire_fce/enable_when.json';
import fce_encounter_create from './resources/questionnaire_fce/encounter_create.json';
import fce_gad_7 from './resources/questionnaire_fce/gad_7.json';
import fce_immunization from './resources/questionnaire_fce/immunization.json';
import fce_medication from './resources/questionnaire_fce/medication.json';
import fce_mixed_fce_with_extensions from './resources/questionnaire_fce/mixed-fce-with-extensions.json';
import fce_multiple_type_launch_context from './resources/questionnaire_fce/multiple_type_launch_context.json';
import fce_occurs from './resources/questionnaire_fce/occurs.json';
import fce_patient_create from './resources/questionnaire_fce/patient_create.json';
import fce_patient_edit from './resources/questionnaire_fce/patient_edit.json';
import fce_phq_2_phq_9 from './resources/questionnaire_fce/phq_2_phq_9.json';
import fce_physicalexam from './resources/questionnaire_fce/physicalexam.json';
import fce_practitioner_create from './resources/questionnaire_fce/practitioner_create.json';
import fce_practitioner_create_structure_map from './resources/questionnaire_fce/practitioner_create_structure_map.json';
import fce_practitioner_edit from './resources/questionnaire_fce/practitioner_edit.json';
import fce_practitioner_role_create from './resources/questionnaire_fce/practitioner_role_create.json';
import fce_public_appointment from './resources/questionnaire_fce/public_appointment.json';
import fce_review_of_systems from './resources/questionnaire_fce/review_of_systems.json';
import fce_source_queries from './resources/questionnaire_fce/source_queries.json';
import fce_sub_questionnaire from './resources/questionnaire_fce/sub-questionnaire.json';
import fce_unit_option from './resources/questionnaire_fce/unit-option.json';
import fce_unknown_extensions from './resources/questionnaire_fce/unknown-extensions.json';
import fce_variable from './resources/questionnaire_fce/variable.json';
import fce_vitals from './resources/questionnaire_fce/vitals.json';
import fce_with_attachment_questionnaire from './resources/questionnaire_fce/with-attachment-question.json';
// fhir questionnaire
import fhir_allergies from './resources/questionnaire_fhir/allergies.json';
import fhir_answer_options_toggle_expression from './resources/questionnaire_fhir/answerOptionsToggleExpression.json';
import fhir_assemble_context from './resources/questionnaire_fhir/assemble_context.json';
import fhir_beverages from './resources/questionnaire_fhir/beverages.json';
import fhir_choice_answer_option from './resources/questionnaire_fhir/choice_answer_option.json';
import fhir_consent from './resources/questionnaire_fhir/consent.json';
import fhir_constraint from './resources/questionnaire_fhir/constraint.json';
import fhir_cqf_examples from './resources/questionnaire_fhir/cqf-examples.json';
import fhir_deafult_sort from './resources/questionnaire_fhir/default_sort.json';
import fhir_enable_chart from './resources/questionnaire_fhir/enable_chart.json';
import fhir_enable_when from './resources/questionnaire_fhir/enable_when.json';
import fhir_encounter_create from './resources/questionnaire_fhir/encounter_create.json';
import fhir_gad_7 from './resources/questionnaire_fhir/gad_7.json';
import fhir_immunization from './resources/questionnaire_fhir/immunization.json';
import fhir_medication from './resources/questionnaire_fhir/medication.json';
import fhir_mixed_fce_with_extensions from './resources/questionnaire_fhir/mixed-fce-with-extensions.json';
import fhir_multiple_type_launch_context from './resources/questionnaire_fhir/multiple_type_launch_context.json';
import fhir_occurs from './resources/questionnaire_fhir/occurs.json';
import fhir_patient_create from './resources/questionnaire_fhir/patient_create.json';
import fhir_patient_edit from './resources/questionnaire_fhir/patient_edit.json';
import fhir_phq_2_phq_9 from './resources/questionnaire_fhir/phq_2_phq_9.json';
import fhir_physicalexam from './resources/questionnaire_fhir/physicalexam.json';
import fhir_practitioner_create from './resources/questionnaire_fhir/practitioner_create.json';
import fhir_practitioner_create_structure_map from './resources/questionnaire_fhir/practitioner_create_structure_map.json';
import fhir_practitioner_edit from './resources/questionnaire_fhir/practitioner_edit.json';
import fhir_practitioner_role_create from './resources/questionnaire_fhir/practitioner_role_create.json';
import fhir_public_appointment from './resources/questionnaire_fhir/public_appointment.json';
import fhir_review_of_systems from './resources/questionnaire_fhir/review_of_systems.json';
import fhir_source_queries from './resources/questionnaire_fhir/source_queries.json';
import fhir_sub_questionnaire from './resources/questionnaire_fhir/sub-questionnaire.json';
import fhir_unit_option from './resources/questionnaire_fhir/unit-option.json';
import fhir_unknown_extensions from './resources/questionnaire_fhir/unknown-extensions.json';
import fhir_variable from './resources/questionnaire_fhir/variable.json';
import fhir_vitals from './resources/questionnaire_fhir/vitals.json';
import fhir_with_attachment_questionnaire from './resources/questionnaire_fhir/with-attachment-question.json';

import { FCEQuestionnaire } from '../../fce.types';

import { fromFirstClassExtension, toFirstClassExtension } from '../../converter';
import { sortExtensionsList } from '../utils';

describe('Questionanire and QuestionnaireResponses transformation', () => {
    test.each([
        ['allergies', fhir_allergies, fce_allergies],
        ['beverages', fhir_beverages, fce_beverages],
        ['choice-answer-option', fhir_choice_answer_option, fce_choice_answer_option],
        ['encounter-create', fhir_encounter_create, fce_encounter_create],
        ['gad-7', fhir_gad_7, fce_gad_7],
        ['immunization', fhir_immunization, fce_immunization],
        ['medication', fhir_medication, fce_medication],
        ['multiple-type-launch-context', fhir_multiple_type_launch_context, fce_multiple_type_launch_context],
        ['patient-create', fhir_patient_create, fce_patient_create],
        ['patient-edit', fhir_patient_edit, fce_patient_edit],
        ['phq-2-phq-9', fhir_phq_2_phq_9, fce_phq_2_phq_9],
        ['physicalexam', fhir_physicalexam, fce_physicalexam],
        ['practitioner-create', fhir_practitioner_create, fce_practitioner_create],
        ['practitioner-edit', fhir_practitioner_edit, fce_practitioner_edit],
        ['practitioner-role-create', fhir_practitioner_role_create, fce_practitioner_role_create],
        ['public-appointment', fhir_public_appointment, fce_public_appointment],
        ['review-of-systems', fhir_review_of_systems, fce_review_of_systems],
        ['source-queries', fhir_source_queries, fce_source_queries],
        ['vitals', fhir_vitals, fce_vitals],
        [
            'practitioner-create-structure-map',
            fhir_practitioner_create_structure_map,
            fce_practitioner_create_structure_map,
        ],
        ['consent', fhir_consent, fce_consent],
        ['enable-when', fhir_enable_when, fce_enable_when],
        ['cqf-examples', fhir_cqf_examples, fce_cqf_examples],
        ['constraint', fhir_constraint, fce_constraint],
        ['answerOptionsToggleExpression', fhir_answer_options_toggle_expression, fce_answer_options_toggle_expression],
        ['unit-option', fhir_unit_option, fce_unit_option],
        ['variable', fhir_variable, fce_variable],
        ['sub-questionnaire', fhir_sub_questionnaire, fce_sub_questionnaire],
        ['with-attachment-questionnaire', fhir_with_attachment_questionnaire, fce_with_attachment_questionnaire],
        // NOTE: this following is not included here because it's example of mixed FCE + extensions, it is only for FCE -> FHIR
        // ['mixed-fce-with-extensions', fhir_mixed_fce_with_extensions, fce_mixed_fce_with_extensions],
        ['unknown-extensions', fhir_unknown_extensions, fce_unknown_extensions],
        ['occurs', fhir_occurs, fce_occurs],
        ['assemble-context', fhir_assemble_context, fce_assemble_context],
        ['enable-chart', fhir_enable_chart, fce_enable_chart],
        ['default_sort', fhir_deafult_sort, fce_deafult_sort],
    ])('Each FHIR Questionnaire should convert to FCE %s', async (_, fhir_questionnaire, fce_questionnaire) => {
        expect(toFirstClassExtension(fhir_questionnaire as FHIRQuestionnaire)).toStrictEqual(fce_questionnaire);
    });

    test.each([
        ['allergies', fce_allergies, fhir_allergies],
        ['beverages', fce_beverages, fhir_beverages],
        ['choice-answer-option', fce_choice_answer_option, fhir_choice_answer_option],
        ['encounter-create', fce_encounter_create, fhir_encounter_create],
        ['gad-7', fce_gad_7, fhir_gad_7],
        ['immunization', fce_immunization, fhir_immunization],
        ['medication', fce_medication, fhir_medication],
        ['multiple-type-launch-context', fce_multiple_type_launch_context, fhir_multiple_type_launch_context],
        ['patient-create', fce_patient_create, fhir_patient_create],
        ['patient-edit', fce_patient_edit, fhir_patient_edit],
        ['phq-2-phq-9', fce_phq_2_phq_9, fhir_phq_2_phq_9],
        ['physicalexam', fce_physicalexam, fhir_physicalexam],
        ['practitioner-create', fce_practitioner_create, fhir_practitioner_create],
        ['practitioner-edit', fce_practitioner_edit, fhir_practitioner_edit],
        ['practitioner-role-create', fce_practitioner_role_create, fhir_practitioner_role_create],
        ['public-appointment', fce_public_appointment, fhir_public_appointment],
        ['review-of-systems', fce_review_of_systems, fhir_review_of_systems],
        ['source-queries', fce_source_queries, fhir_source_queries],
        ['vitals', fce_vitals, fhir_vitals],
        [
            'practitioner-create-structure-map',
            fce_practitioner_create_structure_map,
            fhir_practitioner_create_structure_map,
        ],
        ['consent', fce_consent, fhir_consent],
        ['enable-when', fce_enable_when, fhir_enable_when],
        ['cqf-examples', fce_cqf_examples, fhir_cqf_examples],
        ['constraint', fce_constraint, fhir_constraint],
        ['answerOptionsToggleExpression', fce_answer_options_toggle_expression, fhir_answer_options_toggle_expression],
        ['unit-option', fce_unit_option, fhir_unit_option],
        ['variable', fce_variable, fhir_variable],
        ['sub-questionnaire', fce_sub_questionnaire, fhir_sub_questionnaire],
        ['with-attachment-questionnaire', fce_with_attachment_questionnaire, fhir_with_attachment_questionnaire],
        ['mixed-fce-with-extensions', fce_mixed_fce_with_extensions, fhir_mixed_fce_with_extensions],
        ['unknown-extensions', fce_unknown_extensions, fhir_unknown_extensions],
        ['occurs', fce_occurs, fhir_occurs],
        ['assemble-context', fce_assemble_context, fhir_assemble_context],
        ['enable-chart', fce_enable_chart, fhir_enable_chart],
        ['default_sort', fce_deafult_sort, fhir_deafult_sort],
    ])('Each FCE Questionnaire should convert to FHIR %s', async (_, fce_questionnaire, fhir_questionnaire) => {
        expect(sortExtensionsList(fromFirstClassExtension(fce_questionnaire as FCEQuestionnaire))).toStrictEqual(
            sortExtensionsList(fhir_questionnaire),
        );
    });
});
