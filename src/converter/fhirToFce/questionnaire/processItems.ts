import { Questionnaire as FHIRQuestionnaire, QuestionnaireItem as FHIRQuestionnaireItem } from 'fhir/r4b';

import { processExtensibleElement, processPrimitiveExtensions } from '../utils';
import { FCEQuestionnaireItem } from '../../../fce.types';

export function processItems(fhirQuestionnaire: FHIRQuestionnaire, withTranslations = false) {
    return fhirQuestionnaire.item?.map((item) => convertItemProperties(item, withTranslations));
}

function convertItemProperties(item: FHIRQuestionnaireItem, withTranslations = false): FCEQuestionnaireItem {
    const { item: nestedItems, ...rest } = item;
    const newItem = processExtensibleElement(
        processPrimitiveExtensions(rest, withTranslations),
        withTranslations,
    ) as FCEQuestionnaireItem;

    if (nestedItems) {
        newItem.item = nestedItems.map((nestedItem) => convertItemProperties(nestedItem, withTranslations));
    }

    return newItem;
}
