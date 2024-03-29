import {
  MessageEventDeferred,
  messageEventDeferred,
} from "./message_event_deferred.ts";

export type MessageEventInit<T> = {
  data: T;
  origin: string;
  settle: Promise<void>;
};

export class MessageEvent<T> {
  #data: T;
  #origin: string;
  #deferred: MessageEventDeferred;

  get data() {
    return this.#data;
  }

  get origin() {
    return this.#origin;
  }

  get deferred() {
    return this.#deferred;
  }

  constructor(init: MessageEventInit<T>) {
    this.#data = init.data;
    this.#origin = init.origin;
    this.#deferred = messageEventDeferred(init.settle);
  }
}
