import { decode, encode } from "npm:@msgpack/msgpack";
import { MessageSerializerDeserializer } from "./types.ts";

const msgpackMessageSerializerDeserializer = {
  serialize: (value) => encode(value),
  deserialize: (data) => decode(data),
} satisfies MessageSerializerDeserializer;

export const { serialize, deserialize } = msgpackMessageSerializerDeserializer;
