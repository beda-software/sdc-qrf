import { convertToFHIRExtension } from '..';

export function processPrimitiveExtensions<T>(element: T): T {
    walk(element);
    return element;
}

function walk(node: unknown): void {
    if (node === null || typeof node !== 'object') {
        return;
    }

    if (Array.isArray(node)) {
        for (const item of node) {
            walk(item);
        }
        return;
    }

    const object = node as Record<string, unknown>;

    for (const property of Object.keys(object)) {
        const value = object[property];

        if (property.startsWith('_') && value instanceof Object && !Array.isArray(value)) {
            object[property] = {
                // TODO: update convertToFHIRExtension to accept element type to convert
                extension: convertToFHIRExtension(value as any),
            };
        } else {
            walk(value);
        }
    }
}
