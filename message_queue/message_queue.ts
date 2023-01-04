import { EventEmitter } from "../deps.ts";
import { MessageEncoderDecoder } from "../message_encoder_decoder/types.ts";
import { MessageSerializerDeserializer } from "../message_serializer_deserializer/types.ts";
import { MessageEvent } from "./message_event.ts";

export type MessageQueueOptions = {
  encoderDecoder?: MessageEncoderDecoder;
  serializerDeserializer?: MessageSerializerDeserializer;
  maxListenersPerEvent?: number;
  pollRate?: number;
  id?: string;
};

export type MessageQueueEvents = {
  "message": [MessageEvent];
};

export abstract class MessageQueue extends EventEmitter<MessageQueueEvents> {
  #name: string;
  #encoderDecoder?: MessageEncoderDecoder;
  #serializerDeserializer?: MessageSerializerDeserializer;
  #pollRate: number;
  #id: string;

  get name(): string {
    return this.#name;
  }

  get encoderDecoder(): MessageEncoderDecoder | undefined {
    return this.#encoderDecoder;
  }

  get serializerDeserializer(): MessageSerializerDeserializer | undefined {
    return this.#serializerDeserializer;
  }

  get pollRate(): number {
    return this.#pollRate;
  }

  get id(): string {
    return this.#id;
  }

  constructor(name: string, options: MessageQueueOptions) {
    super(options.maxListenersPerEvent ?? 1);

    this.#name = name;
    this.#encoderDecoder = options.encoderDecoder;
    this.#serializerDeserializer = options.serializerDeserializer;
    this.#pollRate = options.pollRate ?? 1000;
    this.#id = options.id ?? crypto.randomUUID();
  }

  abstract close(): Promise<void>;

  abstract queueMessage(buffer: ArrayBufferLike): Promise<void>;
  // deno-lint-ignore no-explicit-any
  abstract queueMessage(message: any): Promise<void>;
  // deno-lint-ignore no-explicit-any
  abstract queueMessage(messageOrBuffer: ArrayBufferLike | any): Promise<void>;
}
