import { AMQPMessageQueue } from "../message_queue/amqp.ts";
import * as deno from "../message_serializer_deserializer/deno.ts";

const queue = new AMQPMessageQueue("test", {
  serializerDeserializer: deno,
  connection: Deno.env.get("AMQP"),
});

for await (const [event] of queue.on("message")) {
  console.log(event.data);
  event.deferred.resolve();
}
