// deno-lint-ignore-file no-explicit-any
import type { MessageFormat } from "../message_format/types.ts";
import rhea from "npm:rhea@3.0.1";

export type RheaBroadcastChannelOptions = {
  container?: rhea.ContainerOptions;
  connection?: rhea.ConnectionOptions;
};

export class RheaBroadcastChannel extends EventTarget
  implements BroadcastChannel {
  #container: rhea.Container;
  #connection: rhea.Connection;
  #format?: MessageFormat;
  #ready = false;
  #name: string;

  get name(): string {
    return this.#name;
  }

  onmessage: ((this: BroadcastChannel, ev: MessageEvent<any>) => any) | null =
    null;
  onmessageerror:
    | ((this: BroadcastChannel, ev: MessageEvent<any>) => any)
    | null = null;

  constructor(name: string, options: RheaBroadcastChannelOptions) {
    super();
    this.#name = name;
    this.#container = rhea.create_container(options.container);
    this.#connection = this.#container.connect(options.connection);

    // @ts-ignore TS2339
    this.#container.on("connection_open", (context: rhea.EventContext) => {
      this.#ready = true;
      context.connection.open_receiver(this.#name);
      context.connection.open_sender(this.#name);
    });

    // @ts-ignore TS2339
    this.#container.on("message", (context: rhea.EventContext) => {
      console.log(context.message!.body);
    });

    // @ts-ignore TS2339
    // this.#container.on("sendable", (context: rhea.EventContext) => {
    //   while (context.sender?.sendable()) {
    //   }
    // });
  }

  close(): void {
    if (this.#ready && this.#connection.is_open()) {
      this.#connection.close();
    }
    this.#ready = false;
  }

  postMessage(message: any): void {
  }
}

rhea.create_container();
