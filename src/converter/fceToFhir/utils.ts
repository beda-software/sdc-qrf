import { convertToFHIRExtension } from '..';

export function processPrimitiveExtensions(element: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const property of Object.keys(element)) {
        const value = element[property];

        if (property.startsWith('_') && value instanceof Object && !Array.isArray(value)) {
            result[property] = {
                // TODO: update convertToFHIRExtension to accept element type to convert
                extension: convertToFHIRExtension(value),
            };
        }
    }

    return result;
}
