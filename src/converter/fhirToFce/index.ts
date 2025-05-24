import { Questionnaire as FHIRQuestionnaire } from 'fhir/r4b';
import { FCEQuestionnaire } from '../../fce.types';

import { convertQuestionnaire } from './questionnaire';

export function toFirstClassExtension(fhirResource: FHIRQuestionnaire): FCEQuestionnaire {
    return convertQuestionnaire(fhirResource);
}
