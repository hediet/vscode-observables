/**
 * Maps over an object's values, returning a new object with the same keys
 * but transformed values.
 */
export function mapObject<T extends Record<string, any>, U>(
    obj: T,
    fn: (value: T[keyof T], key: string) => U
): { [K in keyof T]: U } {
    return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [key, fn(value, key)])
    ) as { [K in keyof T]: U };
}
