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

  protected encode(message: T): Uint8Array {
    let data: Uint8Array;

    if (this.serializerDeserializer) {
      data = this.serializerDeserializer.serialize(message);
    } else {
      if (message instanceof Uint8Array) {
        data = new Uint8Array(message);
      } else {
        throw new TypeError(
          "Expected an Uint8Array when calling queueMessage without an serializerDeserializer configured",
        );
      }
    }

    if (this.encoderDecoder) {
      data = this.encoderDecoder.encode(data);
    }

    return data;
  }

  protected decode(data: Uint8Array): T {
    let message: T | Uint8Array = data;

    if (this.encoderDecoder) {
      message = this.encoderDecoder.decode(data);
    }

    if (this.serializerDeserializer) {
      message = this.serializerDeserializer.deserialize(data);
    }

    return message as T;
  }

  abstract close(): Promise<void>;
  abstract queueMessage(message: T): Promise<void>;
}
