// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
// Copyright 2023 the Denosaurs authors. All rights reserved. MIT license.

export type MessageEventDeferredState =
  | "pending"
  | "fulfilled"
  | "ignored"
  | "rejected";

export interface MessageEventDeferred extends Promise<void> {
  readonly state: MessageEventDeferredState;

  resolve(): Promise<void>;
  reject(requeue?: boolean): Promise<void>;
  ignore(): Promise<void>;
}

/**
 * Creates a Promise with the `reject`, `resolve` and `ignore` functions placed as
 * methods on the promise object itself.
 */
export function messageEventDeferred(
  settle: Promise<void>,
): MessageEventDeferred {
  let methods;
  let state: MessageEventDeferredState = "pending";
  const promise = new Promise<void>((resolve, reject) => {
    methods = {
      async resolve() {
        state = "fulfilled";
        resolve();
        await settle;
      },
      async reject(requeue?: boolean) {
        state = "rejected";
        reject(requeue ?? true);
        await settle;
      },
      async ignore() {
        state = "ignored";
        resolve();
        await settle;
      },
    };
  });

  Object.defineProperty(promise, "state", { get: () => state });
  return Object.assign(promise, methods) as MessageEventDeferred;
}
