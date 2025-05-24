import { Questionnaire as FHIRQuestionnaire } from 'fhir/r4b';

import { convertQuestionnaire } from './questionnaire';
import { FCEQuestionnaire } from '../../fce.types';

export function fromFirstClassExtension(fceResource: FCEQuestionnaire): FHIRQuestionnaire {
    return convertQuestionnaire(fceResource);
}
