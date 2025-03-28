import { QuestionnaireResponseItemAnswer as FHIRQuestionnaireResponseItemAnswer } from 'fhir/r4b';
import isEmpty from 'lodash/isEmpty';

import {
    QuestionnaireResponseItem as FCEQuestionnaireResponseItem,
    QuestionnaireResponseItemAnswer as FCEQuestionnaireResponseItemAnswer,
} from '@beda.software/aidbox-types';

import { toFHIRReference } from '../../../converter';

export function processAnswers(items: FCEQuestionnaireResponseItem[]) {
    for (const item of items) {
        if (item.answer) {
            item.answer = item.answer.map(processAnswer).filter((answer) => !isEmpty(answer));
        }
        if (item.item) {
            processAnswers(item.item);
        }
    }
}

function processAnswer(answerItem: FCEQuestionnaireResponseItemAnswer): FHIRQuestionnaireResponseItemAnswer {
    if (!answerItem.value) {
        return answerItem;
    }
    const { value, ...item } = answerItem;
    const fhirAnswerItem: FHIRQuestionnaireResponseItemAnswer = item;
    const valueMappings = {
        string: 'valueString',
        decimal: 'valueDecimal',
        integer: 'valueInteger',
        boolean: 'valueBoolean',
        Coding: 'valueCoding',
        date: 'valueDate',
        dateTime: 'valueDateTime',
        time: 'valueTime',
        Quantity: 'valueQuantity',
        Attachment: 'valueAttachment',
    };
    for (const key in valueMappings) {
        if (key in value) {
            //@ts-expect-error: Element implicitly has an 'any' type
            const newKey = valueMappings[key];
            if (newKey) {
                //@ts-expect-error: Element implicitly has an 'any' type
                fhirAnswerItem[newKey] = value[key];
            }
            break;
        }
    }
    if (value.Reference) {
        fhirAnswerItem.valueReference = toFHIRReference(value.Reference);
    }
    return fhirAnswerItem;
}
