export interface SerializerDeserializer<T> {
  contentType?: string;
  serialize(value: T): Uint8Array;
  deserialize(data: Uint8Array): T;
}
