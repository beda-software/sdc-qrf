import {
    Attachment,
    Coding as FHIRCoding,
    QuestionnaireResponseItem as FHIRQuestionnaireResponseItem,
    QuestionnaireResponseItemAnswer as FHIRQuestionnaireResponseItemAnswer,
    Reference as FHIRReference,
} from 'fhir/r4b';
import isEmpty from 'lodash/isEmpty';

import { QuestionnaireResponseItemAnswer as FCEQuestionnaireResponseItemAnswer } from '@beda.software/aidbox-types';

import { fromFHIRReference } from '../../../converter';

export function processAnswers(items: FHIRQuestionnaireResponseItem[]) {
    if (!items) {
        return;
    }
    for (const item of items) {
        if (item.answer) {
            item.answer = item.answer.map(processAnswer).filter((answer) => !isEmpty(answer));
        }
        if (item.item) {
            processAnswers(item.item);
        }
    }
}

function processAnswer(answer: FHIRQuestionnaireResponseItemAnswer): FCEQuestionnaireResponseItemAnswer {
    const fceAnswer: FCEQuestionnaireResponseItemAnswer = { ...answer };
    const valueHandlers = {
        valueString: (value: string) => ({ string: value }),
        valueInteger: (value: number) => ({ integer: value }),
        valueDecimal: (value: number) => ({ decimal: value }),
        valueBoolean: (value: boolean) => ({ boolean: value }),
        valueCoding: (value: FHIRCoding) => ({ Coding: value }),
        valueDate: (value: string) => ({ date: value }),
        valueDateTime: (value: string) => ({ dateTime: value }),
        valueReference: (value: FHIRReference) => ({
            Reference: fromFHIRReference(value),
        }),
        valueTime: (value: string) => ({ time: value }),
        valueQuantity: (value: FHIRCoding) => ({ Quantity: value }),
        valueAttachment: (value: Attachment) => ({ Attachment: value }),
    };

    for (const key in valueHandlers) {
        if (key in fceAnswer) {
            //@ts-expect-error: Element implicitly has an 'any' type
            const value = fceAnswer[key];
            //@ts-expect-error: Element implicitly has an 'any' type
            delete fceAnswer[key];
            //@ts-expect-error: Element implicitly has an 'any' type
            fceAnswer.value = valueHandlers[key]?.(value);
        }
    }
    return fceAnswer;
}
