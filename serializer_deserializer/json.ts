import { SerializerDeserializer } from "./types.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const jsonSerializerDeserializer = {
  contentType: "application/json",
  serialize: (value) => encoder.encode(JSON.stringify(value)),
  deserialize: (data) => JSON.parse(decoder.decode(data)),
} satisfies SerializerDeserializer;

export const { contentType, serialize, deserialize } =
  jsonSerializerDeserializer;
