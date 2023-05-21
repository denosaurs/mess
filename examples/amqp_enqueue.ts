import { AMQPMessageQueue } from "../message_queue/implementations/amqp/mod.ts";
import * as deno from "../serializer_deserializer/deno.ts";

const queue = new AMQPMessageQueue("test", {
  serializerDeserializer: deno,
  connection: "amqp://guest:guest@localhost:5672",
});

while (true) {
  await queue.queueMessage({ t: Math.random() });
}
//await queue.close();
