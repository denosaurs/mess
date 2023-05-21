import {
  AmqpChannel,
  AmqpConnection,
  AmqpConnectOptions,
  BasicDeliver,
  BasicProperties,
  connect,
} from "https://deno.land/x/amqp@v0.23.1/mod.ts";

import { MessageEvent } from "../../message_event.ts";
import { MessageQueue, MessageQueueOptions } from "../../message_queue.ts";
import { deferred } from "../../../deps.ts";

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
  #deferred = deferred<MessageEvent<T>>();

  get connection() {
    return this.#connection;
  }

  get channel() {
    return this.#channel;
  }

  get closed() {
    return this.#closed;
  }

  get ready(): boolean {
    return (
      this.#initialized &&
      !this.closed &&
      this.connection != undefined &&
      this.channel != undefined
    );
  }

  constructor(name: string, options: AMQPMessageQueueOptions<T>) {
    super(name, options);
    this.#initialization = this.#initialize(options);
  }

  async #initialize(options: AMQPMessageQueueOptions<T>) {
    // @ts-ignore This is actually ok, but technically not according to typescript
    this.#connection = await connect(options.connection);
    this.#connection.closed().then(() => (this.#closed = true));

    this.#channel = await this.#connection.openChannel();
    this.#channel.closed().then(() => (this.#closed = true));
    await this.#channel.declareQueue({ queue: this.name });

    this.#initialized = true;
  }

  #consume(args: BasicDeliver, props: BasicProperties, data: Uint8Array): void {
    if (
      props.headers &&
      "origin" in props.headers &&
      props.headers.origin === this.id
    ) {
      return;
    }

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

    const settle = deferred<void>();
    const event = new MessageEvent<T>({
      data: this.decode(data),
      origin: args.consumerTag,
      settle,
    });

    let requeue = true;
    event.deferred
      .catch((shouldRequeue) => {
        requeue = shouldRequeue;
      })
      .finally(async () => {
        this.#assertReady();

        switch (event.deferred.state) {
          case "fulfilled": {
            await this.channel.ack({ deliveryTag: args.deliveryTag });
            break;
          }
          case "rejected": {
            await this.channel.reject({
              deliveryTag: args.deliveryTag,
              requeue,
            });
            break;
          }
          case "pending":
          case "ignored": {
            break;
          }
        }

        settle.resolve();
      });

    this.#deferred.resolve(event);
  }

  #assertOpen(): asserts this is this & { closed: false } {
    if (this.#closed) {
      throw new Error("This AMQPMessageQueue has already been closed");
    }
  }

  async #ensureInitialized() {
    if (!this.#initialized) {
      await this.#initialization;
    }
  }

  #assertReady(): asserts this is this & {
    ready: true;
    closed: false;
    connection: AmqpConnection;
    channel: AmqpChannel;
  } {
    if (!this.ready) {
      throw new Error(
        "This AMQPMessageQueue is not ready for an unknown reason",
      );
    }
  }

  async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
    }

    if (this.connection) {
      await this.connection.close();
    }

    this.#closed = true;
  }

  async queueMessage(message: T): Promise<void> {
    const data = this.encode(message);

    this.#assertOpen();
    await this.#ensureInitialized();
    this.#assertReady();

    await this.channel.publish(
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

  async *[Symbol.asyncIterator](): AsyncIterator<MessageEvent<T>> {
    this.#assertOpen();
    await this.#ensureInitialized();
    this.#assertReady();

    await this.channel.consume(
      { queue: this.name, consumerTag: this.id },
      this.#consume.bind(this),
    );

    while (this.ready) {
      yield await this.#deferred;
      this.#deferred = deferred();
    }
  }
}
