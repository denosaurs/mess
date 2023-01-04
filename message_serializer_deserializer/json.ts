import { MessageSerializerDeserializer } from "./types.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const jsonMessageSerializerDeserializer = {
  contentType: "application/json",
  serialize: (value) => encoder.encode(JSON.stringify(value)),
  deserialize: (data) => JSON.parse(decoder.decode(data)),
} satisfies MessageSerializerDeserializer;

export const { contentType, serialize, deserialize } =
  jsonMessageSerializerDeserializer;
