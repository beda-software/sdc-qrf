import { Questionnaire as FHIRQuestionnaire } from 'fhir/r4b';
import cloneDeep from 'lodash/cloneDeep';

import { processExtensions } from './processExtensions';
import { processItems } from './processItems';
import { processPrimitiveExtensions } from '../utils';
import { FCEQuestionnaire } from '../../../fce.types';

export function convertQuestionnaire(questionnaire: FCEQuestionnaire): FHIRQuestionnaire {
    questionnaire = cloneDeep(questionnaire);
    const processedItem = processItems(questionnaire.item ?? []);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { item: _item, ...rest } = questionnaire;

    return {
        ...processPrimitiveExtensions(processExtensions(rest as FCEQuestionnaire)),
        item: processedItem,
    };
}
