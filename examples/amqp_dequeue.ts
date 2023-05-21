import { AMQPMessageQueue } from "../message_queue/amqp.ts";
import * as deno from "../serializer_deserializer/deno.ts";

const queue = new AMQPMessageQueue("test", {
  serializerDeserializer: deno,
  connection: "amqp://guest:guest@localhost:5672",
});

for await (const event of queue) {
  console.log(event.data);
  await event.deferred.resolve();
}
