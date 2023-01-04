import { decode, encode } from "npm:@msgpack/msgpack";
import { SerializerDeserializer } from "./types.ts";

const msgpackSerializerDeserializer = {
  serialize: (value) => encode(value),
  deserialize: (data) => decode(data),
} satisfies SerializerDeserializer;

export const { serialize, deserialize } = msgpackSerializerDeserializer;
