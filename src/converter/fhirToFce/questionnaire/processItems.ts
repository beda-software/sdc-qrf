import { Questionnaire as FHIRQuestionnaire, QuestionnaireItem as FHIRQuestionnaireItem } from 'fhir/r4b';

import { processExtensibleElement, processPrimitiveExtensions } from '../utils';
import { FCEQuestionnaireItem } from '../../../fce.types';

export function processItems(fhirQuestionnaire: FHIRQuestionnaire) {
    return fhirQuestionnaire.item?.map((item) => convertItemProperties(item));
}

function convertItemProperties(item: FHIRQuestionnaireItem): FCEQuestionnaireItem {
    const newItem = getUpdatedPropertiesFromItem(item);

    if (item.item) {
        newItem.item = item.item.map((nestedItem) => convertItemProperties(nestedItem));
    }
    return newItem;
}

function getUpdatedPropertiesFromItem(item: FHIRQuestionnaireItem) {
    return processExtensibleElement(processPrimitiveExtensions({ ...item }));
}
