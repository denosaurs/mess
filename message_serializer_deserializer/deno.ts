import type { MessageSerializerDeserializer } from "./types.ts";

// deno-lint-ignore no-explicit-any
export let core: any;

// deno-lint-ignore no-explicit-any
const { Deno } = globalThis as any;

// @ts-ignore Deno.core is not defined in types
if (Deno?.[Deno.internal]?.core) {
  // @ts-ignore Deno[Deno.internal].core is not defined in types
  core = Deno[Deno.internal].core;
} else if (Deno?.core) {
  // @ts-ignore Deno.core is not defined in types
  core = Deno.core;
} else {
  throw new TypeError("Deno.core is not supported in this environment");
}

const denoMessageSerializerDeserializer = {
  serialize: (value) => core.serialize(value),
  deserialize: (data) => core.deserialize(data),
} satisfies MessageSerializerDeserializer;

export const { serialize, deserialize } = denoMessageSerializerDeserializer;
