import {
  deserializeAny,
  serializeAny,
} from "https://raw.githubusercontent.com/MierenManz/v8_format/main/references/mod.ts";
import { MessageSerializerDeserializer } from "./types.ts";

const v8MessageSerializerDeserializer = {
  serialize: (value) => serializeAny(value),
  deserialize: (data) => deserializeAny(data),
} satisfies MessageSerializerDeserializer;

export const { serialize, deserialize } = v8MessageSerializerDeserializer;
