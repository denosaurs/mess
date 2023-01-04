import {
  AmqpChannel,
  AmqpConnection,
  AmqpConnectOptions,
  BasicDeliver,
  BasicProperties,
  connect,
} from "https://deno.land/x/amqp@v0.21.0/mod.ts";

import { delay } from "../deps.ts";
import { isArrayBufferLike } from "../utils.ts";
import { MessageEvent } from "./message_event.ts";
import { MessageQueue, MessageQueueOptions } from "./message_queue.ts";

export type AMQPMessageQueueOptions = MessageQueueOptions & {
  connection?: AmqpConnectOptions | string;
};

export class AMQPMessageQueue extends MessageQueue {
  #connection?: AmqpConnection;
  #channel?: AmqpChannel;
  #initialized = false;
  #initialization: Promise<void>;
  #closed = false;

  get #ready(): boolean {
    return this.#initialized && !this.#closed &&
      this.#connection != undefined && this.#channel != undefined;
  }

  constructor(name: string, options: AMQPMessageQueueOptions) {
    super(name, options);
    this.#initialization = this.#initialize(options);
  }

  async #initialize(options: AMQPMessageQueueOptions) {
    // @ts-ignore This is actually ok, but technically not according to typescript
    this.#connection = await connect(options.connection);
    this.#connection.closed().then(() => this.#closed = true);

    this.#channel = await this.#connection.openChannel();
    this.#channel.closed().then(() => this.#closed = true);
    await this.#channel.declareQueue({ queue: this.name });

    this.#initialized = true;

    while (this.#ready) {
      await this.#channel.consume(
        { queue: this.name, consumerTag: this.id },
        this.#consume.bind(this),
      );
      await delay(this.pollRate);
    }
  }

  async #consume(
    args: BasicDeliver,
    props: BasicProperties,
    data: Uint8Array,
  ): Promise<void> {
    if (
      props.headers &&
      "origin" in props.headers &&
      props.headers.origin === this.id
    ) {
      return;
    }

    // TODO: Break the message decoding out into a helper function
    if (this.encoderDecoder?.contentEncoding !== props.contentEncoding) {
      throw new TypeError(
        `Expected message to have the contentEncoding ${this.encoderDecoder?.contentEncoding} but found ${props.contentEncoding}`,
      );
    }

    if (this.serializerDeserializer?.contentType !== props.contentType) {
      throw new TypeError(
        `Expected message to have the contentType ${this.encoderDecoder?.contentEncoding} but found ${props.contentEncoding}`,
      );
    }

    if (this.encoderDecoder) {
      data = this.encoderDecoder.decode(data);
    }

    if (this.serializerDeserializer) {
      data = this.serializerDeserializer.deserialize(data);
    }

    const event = new MessageEvent({
      data,
      origin: args.consumerTag,
    });

    await this.emit("message", event);

    try {
      await event.deferred;
    } finally {
      switch (event.deferred.state) {
        case "fulfilled": {
          await this.#channel!.ack({ deliveryTag: args.deliveryTag });
          break;
        }
        case "rejected": {
          await this.#channel!.nack({ deliveryTag: args.deliveryTag });
          break;
        }
        case "pending":
        case "ignored": {
          break;
        }
      }
    }
  }

  async close(): Promise<void> {
    if (this.#ready && this.#connection) {
      await this.#connection.close();
    }

    await this.off("message");
    this.#closed = true;
  }

  async queueMessage(buffer: ArrayBufferLike): Promise<void>;
  // deno-lint-ignore no-explicit-any
  async queueMessage(message: any): Promise<void>;
  // deno-lint-ignore no-explicit-any
  async queueMessage(messageOrBuffer: ArrayBufferLike | any): Promise<void> {
    // TODO: Break the message encoding out into a helper function
    let data: Uint8Array;

    if (this.serializerDeserializer) {
      data = this.serializerDeserializer.serialize(messageOrBuffer);
    } else {
      if (isArrayBufferLike(messageOrBuffer)) {
        data = new Uint8Array(messageOrBuffer);
      } else {
        throw new TypeError(
          "Expected an ArrayBufferLike when calling queueMessage without an serializerDeserializer configured",
        );
      }
    }

    if (this.encoderDecoder) {
      data = this.encoderDecoder.encode(data);
    }

    if (this.#closed) {
      throw new Error("This AMQPMessageQueue has already been closed");
    }

    if (!this.#initialized) {
      await this.#initialization;
    }

    if (!this.#ready) {
      throw new Error(
        "This AMQPMessageQueue is not ready for an unknown reason",
      );
    }

    await this.#channel!.publish(
      { routingKey: this.name },
      {
        contentType: this.serializerDeserializer?.contentType,
        contentEncoding: this.encoderDecoder?.contentEncoding,
        timestamp: Date.now(),
        headers: { origin: this.id },
      },
      data,
    );
  }
}
