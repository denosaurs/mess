import {
  AmqpChannel,
  AmqpConnection,
  AmqpConnectOptions,
  BasicDeliver,
  BasicProperties,
  connect,
} from "https://deno.land/x/amqp@v0.21.0/mod.ts";

import { MessageEvent } from "./message_event.ts";
import { MessageQueue, MessageQueueOptions } from "./message_queue.ts";

export type AMQPMessageQueueOptions<T> = MessageQueueOptions<T> & {
  connection?: AmqpConnectOptions | string;
};

// deno-lint-ignore no-explicit-any
export class AMQPMessageQueue<T = any> extends MessageQueue<T> {
  #connection?: AmqpConnection;
  #channel?: AmqpChannel;
  #initialized = false;
  #initialization: Promise<void>;
  #closed = false;

  get #ready(): boolean {
    return this.#initialized && !this.#closed &&
      this.#connection != undefined && this.#channel != undefined;
  }

  constructor(name: string, options: AMQPMessageQueueOptions<T>) {
    super(name, options);
    this.#initialization = this.#initialize(options);
  }

  async #initialize(options: AMQPMessageQueueOptions<T>) {
    // @ts-ignore This is actually ok, but technically not according to typescript
    this.#connection = await connect(options.connection);
    this.#connection.closed().then(() => this.#closed = true);

    this.#channel = await this.#connection.openChannel();
    this.#channel.closed().then(() => this.#closed = true);
    await this.#channel.declareQueue({ queue: this.name });

    this.#channel.consume(
      { queue: this.name, consumerTag: this.id },
      this.#consume.bind(this),
    );

    this.#initialized = true;
  }

  async #consume(
    args: BasicDeliver,
    props: BasicProperties,
    rawData: Uint8Array,
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

    let data: T | Uint8Array = rawData;
    if (this.encoderDecoder) {
      data = this.encoderDecoder.decode(data);
    }

    if (this.serializerDeserializer) {
      data = this.serializerDeserializer.deserialize(data);
    }

    const event = new MessageEvent<T>({
      data: data as T,
      origin: args.consumerTag,
    });

    await this.emit("message", event);

    let requeue = true;
    try {
      await event.deferred;
    } catch (shouldRequeue) {
      requeue = shouldRequeue;
    } finally {
      switch (event.deferred.state) {
        case "fulfilled": {
          await this.#channel!.ack({ deliveryTag: args.deliveryTag });
          break;
        }
        case "rejected": {
          await this.#channel!.nack({ deliveryTag: args.deliveryTag, requeue });
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

  async queueMessage(message: T): Promise<void> {
    // TODO: Break the message encoding out into a helper function
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
