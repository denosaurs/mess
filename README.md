# Mess

[![Tags](https://img.shields.io/github/release/denosaurs/mess)](https://github.com/denosaurs/mess/releases)
[![deno doc](https://doc.deno.land/badge.svg)](https://doc.deno.land/https/deno.land/x/mess/mod.ts)
[![checks](https://github.com/denosaurs/mess/actions/workflows/checks.yml/badge.svg)](https://github.com/denosaurs/mess/actions/workflows/checks.yml)
[![License](https://img.shields.io/github/license/denosaurs/mess)](https://github.com/denosaurs/mess/blob/master/LICENSE)

Mess is a modern, broker-agnostic message queue for use in a distributed
environment. Currently, AMQP is supported, with plans to add support for other
platforms such as Redis and MQTT in the future.

## Example

This example demonstrates how to use the AMQP message queue with the json
serializer and deserializer:

```ts
import { AMQPMessageQueue } from "https://deno.land/x/mess/message_queue/implementations/amqp/mod.ts";
import * as json from "https://deno.land/x/mess/serializer_deserializer/json.ts";

const queue = new AMQPMessageQueue("test", {
  serializerDeserializer: deno,
  connection: "amqp://guest:guest@localhost:5672",
});

for await (const event of queue) {
  console.log(event.data);
  await event.deferred.resolve();
}
```

## Documentation

Check out the docs
[here](https://doc.deno.land/https://deno.land/x/mess/mod.ts).

## Maintainers

- Elias Sjögreen ([@eliassjogreen](https://github.com/eliassjogreen))

## Other

### Contribution

Pull request, issues and feedback are very welcome. Code style is formatted with
`deno fmt` and commit messages are done following Conventional Commits spec.

### License

Copyright 2023, the Denosaurs team. All rights reserved. MIT license.
