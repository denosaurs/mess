export interface MessageSerializerDeserializer {
  contentType?: string;
  // deno-lint-ignore no-explicit-any
  serialize(value: any): Uint8Array;
  // deno-lint-ignore no-explicit-any
  deserialize(data: Uint8Array): any;
}
