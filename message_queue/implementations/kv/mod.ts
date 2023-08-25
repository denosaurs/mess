import { MessageEvent } from "../../message_event.ts";
import { MessageQueue, MessageQueueOptions } from "../../message_queue.ts";
import { deferred } from "../../../deps.ts";

type DenoKvEnqueueOptions = Parameters<Deno.Kv["enqueue"]>[1];

type KvMessageQueueMessage = {
  queue: string;
  options: DenoKvEnqueueOptions;
  timestamp: number;
  origin: string;
  contentType?: string;
  contentEncoding?: string;
  data: unknown;
};

export type KvMessageQueueOptions<T> =
  & MessageQueueOptions<T>
  & (
    | {
      kv: Deno.Kv;
    }
    | {
      path?: string;
    }
  );

// deno-lint-ignore no-explicit-any
export class KvMessageQueue<T = any> extends MessageQueue<T> {
  #kv?: Deno.Kv;
  #initialized = false;
  #initialization: Promise<void>;
  #closed = false;
  #deferred = deferred<MessageEvent<T>>();

  get kv() {
    return this.#kv;
  }

  get closed() {
    return this.#closed;
  }

  get ready(): boolean {
    return this.#initialized && !this.closed && this.kv != undefined;
  }

  constructor(name: string, options: KvMessageQueueOptions<T> = {}) {
    super(name, options);
    this.#initialization = this.#initialize(options);
  }

  async #initialize(options: KvMessageQueueOptions<T>) {
    if ("kv" in options) {
      this.#kv = options.kv;
    } else {
      this.#kv = await Deno.openKv(options.path);
    }

    this.#initialized = true;
  }

  #consume(message: KvMessageQueueMessage): void {
    if (message.origin === this.id) {
      throw new Error(
        "The KvMessageQueue recieved its own message, this should be unreachable",
      );
    }

    if (
      this.encoderDecoder &&
      this.encoderDecoder.contentEncoding !== message.contentEncoding
    ) {
      throw new TypeError(
        `Expected message to have the contentEncoding ${this.encoderDecoder?.contentEncoding} but found ${message.contentEncoding}`,
      );
    }

    if (
      this.serializerDeserializer &&
      this.serializerDeserializer.contentType !== message.contentType
    ) {
      throw new TypeError(
        `Expected message to have the contentType ${this.encoderDecoder?.contentEncoding} but found ${message.contentEncoding}`,
      );
    }

    const settle = deferred<void>();
    const event = new MessageEvent<T>({
      data: this.serializerDeserializer != undefined ||
          this.encoderDecoder != undefined
        ? this.decode(message.data as Uint8Array)
        : (message.data as T),
      origin: message.origin,
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
            break;
          }
          case "rejected": {
            if (!requeue) {
              break;
            }

            settle.resolve();
            this.#deferred.resolve(event);
            throw new Error("KvMessageQueue rejection exception");
          }
          case "pending":
          case "ignored": {
            await this.kv.enqueue(
              message,
              message.options,
            );
            break;
          }
        }

        settle.resolve();
      });

    this.#deferred.resolve(event);
  }

  #assertOpen(): asserts this is this & { closed: false } {
    if (this.#closed) {
      throw new Error("This KvMessageQueue has already been closed");
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
    kv: Deno.Kv;
  } {
    if (!this.ready) {
      throw new Error("This KvMessageQueue is not ready for an unknown reason");
    }
  }

  // deno-lint-ignore require-await
  async close(): Promise<void> {
    if (this.kv) {
      this.kv.close();
    }

    this.#closed = true;
  }

  async queueMessage(
    message: T,
    options?: DenoKvEnqueueOptions,
  ): Promise<void> {
    const data = this.serializerDeserializer != undefined ||
        this.encoderDecoder != undefined
      ? this.encode(message)
      : message;

    this.#assertOpen();
    await this.#ensureInitialized();
    this.#assertReady();

    await this.kv.enqueue(
      {
        queue: this.name,
        contentType: this.serializerDeserializer?.contentType,
        contentEncoding: this.encoderDecoder?.contentEncoding,
        timestamp: Date.now(),
        origin: this.id,
        options,
        data,
      } satisfies KvMessageQueueMessage,
      options,
    );
  }

  async *[Symbol.asyncIterator](): AsyncIterator<MessageEvent<T>> {
    this.#assertOpen();
    await this.#ensureInitialized();
    this.#assertReady();

    const listener = this.kv.listenQueue(
      this.#consume.bind(this) as (message: unknown) => Promise<void>,
    );

    while (this.ready) {
      yield await this.#deferred;
      this.#deferred = deferred();
    }

    await listener;
  }
}
