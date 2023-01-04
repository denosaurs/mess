// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
// Copyright 2023 the Denosaurs authors. All rights reserved. MIT license.

export type MessageEventDeferredState =
  | "pending"
  | "fulfilled"
  | "ignored"
  | "rejected";

export interface MessageEventDeferred extends Promise<void> {
  readonly state: MessageEventDeferredState;
  resolve(): void;
  // deno-lint-ignore no-explicit-any
  reject(reason?: any): void;
  ignore(): void;
}

/**
 * Creates a Promise with the `reject`, `resolve` and `ignore` functions placed as
 * methods on the promise object itself.
 */
export function messageEventDeferred(): MessageEventDeferred {
  let methods;
  let state: MessageEventDeferredState = "pending";
  const promise = new Promise<void>((resolve, reject) => {
    methods = {
      resolve() {
        state = "fulfilled";
        resolve();
      },
      // deno-lint-ignore no-explicit-any
      reject(reason?: any) {
        state = "rejected";
        reject(reason);
      },
      ignore() {
        state = "ignored";
        resolve();
      },
    };
  });
  Object.defineProperty(promise, "state", { get: () => state });
  return Object.assign(promise, methods) as MessageEventDeferred;
}
