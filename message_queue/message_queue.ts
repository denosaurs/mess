import { EventEmitter } from "../deps.ts";
import { EncoderDecoder } from "../encoder_decoder/types.ts";
import { SerializerDeserializer } from "../serializer_deserializer/types.ts";
import { MessageEvent } from "./message_event.ts";

export type MessageQueueOptions<T> =
  & (T extends Uint8Array
    ? { serializerDeserializer?: SerializerDeserializer<T> }
    : { serializerDeserializer: SerializerDeserializer<T> })
  & {
    encoderDecoder?: EncoderDecoder;
    maxListenersPerEvent?: number;
    id?: string;
  };

export type MaybeSerializerDeserializer<T> = T extends Uint8Array
  ? SerializerDeserializer<T> | undefined
  : SerializerDeserializer<T>;

export type MessageQueueEvents<T> = {
  "message": [MessageEvent<T>];
};

// deno-lint-ignore no-explicit-any
export abstract class MessageQueue<T = any>
  extends EventEmitter<MessageQueueEvents<T>> {
  #name: string;
  #encoderDecoder?: EncoderDecoder;
  #serializerDeserializer: MaybeSerializerDeserializer<T>;
  #id: string;

  get name(): string {
    return this.#name;
  }

  get encoderDecoder(): EncoderDecoder | undefined {
    return this.#encoderDecoder;
  }

  get serializerDeserializer(): MaybeSerializerDeserializer<T> {
    return this.#serializerDeserializer;
  }

  get id(): string {
    return this.#id;
  }

  constructor(name: string, options: MessageQueueOptions<T>) {
    super(options.maxListenersPerEvent ?? 1);

    this.#name = name;
    this.#encoderDecoder = options.encoderDecoder;
    this.#serializerDeserializer = options
      .serializerDeserializer as MaybeSerializerDeserializer<T>;
    this.#id = options.id ?? crypto.randomUUID();
  }

  abstract close(): Promise<void>;
  abstract queueMessage(message: T): Promise<void>;
}
