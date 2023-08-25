import { KvMessageQueue } from "../message_queue/implementations/kv/mod.ts";

const queue = new KvMessageQueue("test", { path: "./queue" });

for await (const event of queue) {
  console.log(event.data);
  await event.deferred.resolve();
}
