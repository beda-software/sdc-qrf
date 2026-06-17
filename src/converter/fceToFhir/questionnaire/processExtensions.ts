import { FCEPrintableElement, FCEQuestionnaire } from '../../../fce.types';
import { Extension as FHIRExtension, Questionnaire as FHIRQuestionnaire } from 'fhir/r4b';

function processPrintableElements(url: string, elements: FCEPrintableElement[]): FHIRExtension[] {
    return elements.map((element) => {
        if ('valueAttachment' in element) {
            return { url, valueAttachment: element.valueAttachment };
        }

        if ('valueExpression' in element) {
            return { url, valueExpression: element.valueExpression };
        }

        return { url, valueString: (element as { valueString: string }).valueString };
    });
}

export function processExtensions(questionnaire: FCEQuestionnaire): FHIRQuestionnaire {
    const {
        launchContext,
        mapping,
        sourceQueries,
        targetStructureMap,
        assembledFrom,
        assembleContext,
        itemPopulationContext,
        variable,
        printableCover,
        printableHeader,
        printableHeaderFirstPage,
        printableFooter,
        printableFooterLastPage,
        ...fhirQuestionnaire
    } = questionnaire;

    let extensions: FHIRExtension[] = [];

    if (launchContext) {
        for (const launchContextItem of launchContext) {
            const name = launchContextItem.name;
            const typeList = launchContextItem.type;
            const description = launchContextItem.description;
            const launchContextExtension: FHIRExtension[] = [
                {
                    url: 'name',
                    valueCoding: name,
                },
            ];

            for (const typeCode of typeList ?? []) {
                launchContextExtension.push({ url: 'type', valueCode: typeCode });
            }

            if (description !== undefined) {
                launchContextExtension.push({
                    url: 'description',
                    valueString: description,
                });
            }

            extensions.push({
                url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext',
                extension: launchContextExtension,
            });
        }
    }

    if (mapping) {
        extensions = extensions.concat(
            mapping.map((item) =>
                'valueExpression' in item
                    ? {
                          url: 'https://emr-core.beda.software/StructureDefinition/questionnaire-mapper',
                          valueExpression: item.valueExpression,
                      }
                    : 'valueReference' in item
                      ? {
                            url: 'https://emr-core.beda.software/StructureDefinition/questionnaire-mapper',
                            valueReference: item.valueReference,
                        }
                      : {
                            url: 'https://emr-core.beda.software/StructureDefinition/questionnaire-mapper',
                            valueReference: item,
                        },
            ),
        );
    }

    if (sourceQueries) {
        extensions = extensions.concat(
            sourceQueries.map((item) => ({
                url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-sourceQueries',
                valueReference: { reference: item.reference },
            })),
        );
    }

    if (targetStructureMap) {
        extensions = extensions.concat(
            targetStructureMap.map((targetStructureMapRef) => ({
                url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-targetStructureMap',
                valueCanonical: targetStructureMapRef,
            })),
        );
    }

    if (assembledFrom) {
        extensions.push({
            url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-assembledFrom',
            valueCanonical: assembledFrom,
        });
    }

    if (assembleContext) {
        extensions = extensions.concat(
            assembleContext.map((assembleContextItem) => ({
                url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-assembleContext',
                valueString: assembleContextItem,
            })),
        );
    }

    if (itemPopulationContext) {
        extensions.push({
            url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemPopulationContext',
            valueExpression: itemPopulationContext,
        });
    }

    if (variable) {
        extensions = extensions.concat(
            variable.map((expr) => ({
                url: 'http://hl7.org/fhir/StructureDefinition/variable',
                valueExpression: expr,
            })),
        );
    }

    if (printableCover) {
        extensions = extensions.concat(
            processPrintableElements(
                'https://emr-core.beda.software/StructureDefinition/printable-cover',
                printableCover,
            ),
        );
    }

    if (printableHeader) {
        extensions = extensions.concat(
            processPrintableElements(
                'https://emr-core.beda.software/StructureDefinition/printable-header',
                printableHeader,
            ),
        );
    }

    if (printableHeaderFirstPage) {
        extensions = extensions.concat(
            processPrintableElements(
                'https://emr-core.beda.software/StructureDefinition/printable-header-first-page',
                printableHeaderFirstPage,
            ),
        );
    }

    if (printableFooter) {
        extensions = extensions.concat(
            processPrintableElements(
                'https://emr-core.beda.software/StructureDefinition/printable-footer',
                printableFooter,
            ),
        );
    }

    if (printableFooterLastPage) {
        extensions = extensions.concat(
            processPrintableElements(
                'https://emr-core.beda.software/StructureDefinition/printable-footer-last-page',
                printableFooterLastPage,
            ),
        );
    }

    if (extensions.length) {
        fhirQuestionnaire.extension = (fhirQuestionnaire.extension ?? []).concat(extensions);
    }

    return fhirQuestionnaire;
}
