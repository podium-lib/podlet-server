import fs from "node:fs"
import pino from "pino"
import tap from "tap"

import memoryDestination from "./memory-destination.js"
import { TestServer } from "../../api/index.js"

const logLevelDebug = "debug"

tap.before(() => {
  // Hack to work around the Podlet using the package.json name on creation
  fs.writeFileSync("package.json", `{"name": "test", "type": "module"}`)
})

tap.teardown(() => {
  fs.unlinkSync("package.json")

})
tap.afterEach(async () => {
  memoryDestination.reset()
})
tap.test("Logs with debug level when told to", async (t) => {
  const server = await TestServer.create({
    cwd: process.cwd(), development: true,
    loggerFunction: () => pino({ level: logLevelDebug }, memoryDestination)
  })
  server.config.set("app.logLevelDebug", logLevelDebug)
  await server.start()
  t.equal(memoryDestination.logs.length, 3)
  await server.stop()
  t.end();
})

tap.test("Logs nothing when set to error", async (t) => {
  const logLevelSilent = "silent"
  const server = await TestServer.create({
    cwd: process.cwd(), development: true,
    loggerFunction: () => pino({ level: logLevelSilent }, memoryDestination)
  })
  server.config.set("app.logLevel", logLevelSilent)
  await server.start()
  t.equal(memoryDestination.logs.length, 0)
  await server.stop()
  t.end();
})