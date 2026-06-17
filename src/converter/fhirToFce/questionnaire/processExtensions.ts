import { Questionnaire as FHIRQuestionnaire, Expression as FHIRExpression } from 'fhir/r4b';
import { FCEPrintableElement } from '../../../fce.types';

export function processExtensions(fhirQuestionnaire: FHIRQuestionnaire): {
    launchContext?: any[];
    mapping?: any[];
    sourceQueries?: any[];
    targetStructureMap?: any[];
    assembledFrom?: any;
    assembleContext?: string[];
    itemPopulationContext?: FHIRExpression;
    variable?: FHIRExpression[];
    printableCover?: FCEPrintableElement[];
    printableHeader?: FCEPrintableElement[];
    printableHeaderFirstPage?: FCEPrintableElement[];
    printableFooter?: FCEPrintableElement[];
    printableFooterLastPage?: FCEPrintableElement[];
} {
    const launchContext = processLaunchContext(fhirQuestionnaire);
    const mapping = processMapping(fhirQuestionnaire);
    const sourceQueries = processSourceQueries(fhirQuestionnaire);
    const targetStructureMap = processTargetStructureMap(fhirQuestionnaire);
    const assembledFrom = processAssembledFrom(fhirQuestionnaire);
    const assembleContext = processAssembleContext(fhirQuestionnaire);
    const itemPopulationContext = processItemPopulationContext(fhirQuestionnaire);
    const variable = processVariable(fhirQuestionnaire);
    const printableCover = processPrintableElements(
        fhirQuestionnaire,
        'https://emr-core.beda.software/StructureDefinition/printable-cover',
    );
    const printableHeader = processPrintableElements(
        fhirQuestionnaire,
        'https://emr-core.beda.software/StructureDefinition/printable-header',
    );
    const printableHeaderFirstPage = processPrintableElements(
        fhirQuestionnaire,
        'https://emr-core.beda.software/StructureDefinition/printable-header-first-page',
    );
    const printableFooter = processPrintableElements(
        fhirQuestionnaire,
        'https://emr-core.beda.software/StructureDefinition/printable-footer',
    );
    const printableFooterLastPage = processPrintableElements(
        fhirQuestionnaire,
        'https://emr-core.beda.software/StructureDefinition/printable-footer-last-page',
    );

    return {
        launchContext: launchContext?.length ? launchContext : undefined,
        mapping: mapping?.length ? mapping : undefined,
        sourceQueries: sourceQueries?.length ? sourceQueries : undefined,
        targetStructureMap: targetStructureMap?.length ? targetStructureMap : undefined,
        assembledFrom: assembledFrom ? assembledFrom : undefined,
        assembleContext: assembleContext.length ? assembleContext : undefined,
        itemPopulationContext: itemPopulationContext ? itemPopulationContext : undefined,
        variable: variable?.length ? variable : undefined,
        printableCover: printableCover?.length ? printableCover : undefined,
        printableHeader: printableHeader?.length ? printableHeader : undefined,
        printableHeaderFirstPage: printableHeaderFirstPage?.length ? printableHeaderFirstPage : undefined,
        printableFooter: printableFooter?.length ? printableFooter : undefined,
        printableFooterLastPage: printableFooterLastPage?.length ? printableFooterLastPage : undefined,
    };
}

export function processLaunchContext(fhirQuestionnaire: FHIRQuestionnaire): any[] | undefined {
    let launchContextExtensions = fhirQuestionnaire.extension ?? [];

    launchContextExtensions = launchContextExtensions.filter(
        (ext) => ext.url === 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext',
    );

    if (launchContextExtensions.length === 0) {
        return undefined;
    }

    const launchContextArray = [];
    for (const launchContextExtension of launchContextExtensions) {
        const nameExtension = launchContextExtension.extension?.find((ext) => ext.url === 'name');
        const typeExtensions = launchContextExtension.extension?.filter((ext) => ext.url === 'type');
        const descriptionExtension = launchContextExtension.extension?.find((ext) => ext.url === 'description');

        const nameCode = nameExtension?.valueCoding?.code;
        const typeCodes = typeExtensions?.map((typeExtension) => typeExtension.valueCode!);
        const description = descriptionExtension?.valueString;

        let contextFound = false;
        for (const context of launchContextArray) {
            if (context.name.code === nameCode) {
                context.type.push(...(typeCodes ?? []));
                contextFound = true;
                break;
            }
        }

        if (!contextFound) {
            const context: any = {
                name: nameExtension?.valueCoding,
                type: typeCodes ?? [],
            };
            if (description) {
                context.description = description;
            }
            launchContextArray.push(context);
        }
    }

    return launchContextArray;
}

function processMapping(fhirQuestionnaire: FHIRQuestionnaire): any[] | undefined {
    const mapperExtensions = fhirQuestionnaire.extension?.filter(
        (ext) => ext.url === 'https://emr-core.beda.software/StructureDefinition/questionnaire-mapper',
    );

    if (!mapperExtensions) {
        return undefined;
    }

    return mapperExtensions.map((mapperExtension) =>
        'valueReference' in mapperExtension
            ? { valueReference: mapperExtension.valueReference }
            : { valueExpression: mapperExtension.valueExpression },
    );
}

function processSourceQueries(fhirQuestionnaire: FHIRQuestionnaire): any[] {
    const extensions =
        fhirQuestionnaire.extension?.filter(
            (ext) => ext.url === 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-sourceQueries',
        ) ?? [];

    return extensions.map((ext) => ext.valueReference);
}

function processTargetStructureMap(fhirQuestionnaire: FHIRQuestionnaire): string[] | undefined {
    const extensions = fhirQuestionnaire.extension?.filter(
        (ext) => ext.url === 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-targetStructureMap',
    );

    if (!extensions) {
        return undefined;
    }

    return extensions.map((extension) => extension.valueCanonical!);
}

function processAssembledFrom(fhirQuestionnaire: FHIRQuestionnaire): string | undefined {
    const extension = fhirQuestionnaire.extension?.find(
        (ext) => ext.url === 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-assembledFrom',
    );

    if (!extension) {
        return undefined;
    }

    return extension.valueCanonical;
}

function processAssembleContext(fhirQuestionnaire: FHIRQuestionnaire): string[] {
    const extensions = fhirQuestionnaire.extension?.filter(
        (ext) => ext.url === 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-assembleContext',
    );

    return (extensions ?? []).map((extension) => extension.valueString!);
}

function processItemPopulationContext(fhirQuestionnaire: FHIRQuestionnaire): FHIRExpression | undefined {
    const extension = fhirQuestionnaire.extension?.find(
        (ext) => ext.url === 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemPopulationContext',
    );

    if (!extension) {
        return undefined;
    }

    return extension.valueExpression;
}

function processVariable(fhirQuestionnaire: FHIRQuestionnaire): FHIRExpression[] | undefined {
    const extensions = fhirQuestionnaire.extension?.filter(
        (ext) => ext.url === 'http://hl7.org/fhir/StructureDefinition/variable',
    );

    if (!extensions?.length) {
        return undefined;
    }

    return extensions.map((ext) => ext.valueExpression!);
}

function processPrintableElements(
    fhirQuestionnaire: FHIRQuestionnaire,
    extensionUrl: string,
): FCEPrintableElement[] | undefined {
    const extensions = fhirQuestionnaire.extension?.filter((ext) => ext.url === extensionUrl);
    if (!extensions?.length) {
        return undefined;
    }

    const elements: FCEPrintableElement[] = [];

    for (const ext of extensions) {
        if (ext.valueAttachment) {
            elements.push({ valueAttachment: ext.valueAttachment });
        } else if (ext.valueExpression) {
            elements.push({ valueExpression: ext.valueExpression });
        } else if (ext.valueString !== undefined) {
            elements.push({ valueString: ext.valueString });
        }
    }

    return elements.length ? elements : undefined;
}
