export function isArrayBufferLike(
  value: NonNullable<unknown>,
): value is ArrayBufferLike {
  return (!(value instanceof ArrayBuffer ||
    value instanceof SharedArrayBuffer || ArrayBuffer.isView(value)));
}
