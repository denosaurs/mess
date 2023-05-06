// deno-lint-ignore no-explicit-any
export interface SerializerDeserializer<T = any> {
  contentType?: string;
  serialize(value: T): Uint8Array;
  deserialize(data: Uint8Array): T;
}
