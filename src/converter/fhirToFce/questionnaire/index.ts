import { Questionnaire as FHIRQuestionnaire } from 'fhir/r4b';
import cloneDeep from 'lodash/cloneDeep';

import { processExtensions } from './processExtensions';
import { processItems } from './processItems';
import { checkFhirQuestionnaireProfile, trimUndefined } from '../utils';
import { FCEQuestionnaire } from 'fce.types';

export function convertQuestionnaire(fhirQuestionnaire: FHIRQuestionnaire): FCEQuestionnaire {
    checkFhirQuestionnaireProfile(fhirQuestionnaire);
    fhirQuestionnaire = cloneDeep(fhirQuestionnaire);
    const item = processItems(fhirQuestionnaire);
    const extensions = processExtensions(fhirQuestionnaire);
    const questionnaire = trimUndefined({
        ...fhirQuestionnaire,
        item,
        ...extensions,
        extension: undefined,
    });
    return questionnaire;
}
