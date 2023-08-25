import { KvMessageQueue } from "../message_queue/implementations/kv/mod.ts";

const queue = new KvMessageQueue("test", { path: "./queue" });

while (true) {
  await queue.queueMessage({ t: Math.random() });
}
//await queue.close();
