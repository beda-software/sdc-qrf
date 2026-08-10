import { Questionnaire as FHIRQuestionnaire } from 'fhir/r4b';
import { FCEQuestionnaire } from '../../fce.types';

import { convertQuestionnaire } from './questionnaire';

export { translateQuestionnaire } from './translateQuestionnaire';

export function toFirstClassExtension(fhirResource: FHIRQuestionnaire, withTranslations = false): FCEQuestionnaire {
    return convertQuestionnaire(fhirResource, withTranslations);
}
