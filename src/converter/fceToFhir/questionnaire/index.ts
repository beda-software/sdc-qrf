import { Questionnaire as FHIRQuestionnaire } from 'fhir/r4b';
import cloneDeep from 'lodash/cloneDeep';

import { processExtensions } from './processExtensions';
import { processItems } from './processItems';
import { FCEQuestionnaire } from '../../../fce.types';

export function convertQuestionnaire(questionnaire: FCEQuestionnaire): FHIRQuestionnaire {
    questionnaire = cloneDeep(questionnaire);
    questionnaire.item = processItems(questionnaire.item ?? []);
    return processExtensions(questionnaire);
}
