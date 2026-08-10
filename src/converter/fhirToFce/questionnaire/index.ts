import { Questionnaire as FHIRQuestionnaire } from 'fhir/r4b';
import cloneDeep from 'lodash/cloneDeep';

import { processExtensions } from './processExtensions';
import { processItems } from './processItems';
import { checkFhirQuestionnaireProfile, processPrimitiveExtensions, trimUndefined } from '../utils';
import { FCEQuestionnaire } from '../../../fce.types';

export function convertQuestionnaire(fhirQuestionnaire: FHIRQuestionnaire, withTranslations = false): FCEQuestionnaire {
    checkFhirQuestionnaireProfile(fhirQuestionnaire);
    fhirQuestionnaire = cloneDeep(fhirQuestionnaire);
    const processedItem = processItems(fhirQuestionnaire, withTranslations);
    const extensions = processExtensions(fhirQuestionnaire);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { item: _item, ...rest } = fhirQuestionnaire;
    const questionnaire = trimUndefined({
        ...processPrimitiveExtensions(rest, withTranslations),
        item: processedItem,
        ...extensions,
        extension: undefined,
    });
    return questionnaire;
}
