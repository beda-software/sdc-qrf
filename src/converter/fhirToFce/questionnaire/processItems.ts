import { Questionnaire as FHIRQuestionnaire, QuestionnaireItem as FHIRQuestionnaireItem } from 'fhir/r4b';

import { processExtensibleElement, processPrimitiveExtensions } from '../utils';
import { FCEQuestionnaireItem } from '../../../fce.types';

export function processItems(fhirQuestionnaire: FHIRQuestionnaire) {
    return fhirQuestionnaire.item?.map((item) => convertItemProperties(item));
}

function convertItemProperties(item: FHIRQuestionnaireItem): FCEQuestionnaireItem {
    const { item: nestedItems, ...rest } = item;
    const newItem = processExtensibleElement(processPrimitiveExtensions(rest)) as FCEQuestionnaireItem;

    if (nestedItems) {
        newItem.item = nestedItems.map((nestedItem) => convertItemProperties(nestedItem));
    }

    return newItem;
}
