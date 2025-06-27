import { QuestionnaireResponse as FHIRQuestionnaireResponse } from 'fhir/r4b';

import { QuestionnaireResponse as FCEQuestionnaireResponse } from '@beda.software/aidbox-types';
import { toFHIRReference } from '../../index';

export function processReference(fceQR: FCEQuestionnaireResponse): FHIRQuestionnaireResponse {
    const { encounter, source, subject, ...commonProperties } = fceQR;
    const fhirQuestionnaireResponse: FHIRQuestionnaireResponse = commonProperties as FHIRQuestionnaireResponse;
    if (encounter) {
        fhirQuestionnaireResponse.encounter = toFHIRReference(encounter);
    }

    if (source) {
        fhirQuestionnaireResponse.source = toFHIRReference(source);
    }

    if (subject) {
        fhirQuestionnaireResponse.subject = toFHIRReference(subject);
    }

    return fhirQuestionnaireResponse;
}
