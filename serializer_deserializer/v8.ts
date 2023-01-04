import {
  deserializeAny,
  serializeAny,
} from "https://raw.githubusercontent.com/MierenManz/v8_format/main/references/mod.ts";
import { SerializerDeserializer } from "./types.ts";

const v8SerializerDeserializer = {
  serialize: (value) => serializeAny(value),
  deserialize: (data) => deserializeAny(data),
} satisfies SerializerDeserializer;

export const { serialize, deserialize } = v8SerializerDeserializer;
