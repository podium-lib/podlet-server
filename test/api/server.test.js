import pino from 'pino';
import tap from 'tap';
import fs from 'fs';
import * as os from 'os';
import { join } from 'node:path';

import memoryDestination from './memory-destination.js';
import { TestServer } from '../../api/index.js';

const logLevelDebug = 'debug';
const tempDirectory = os.tmpdir();
tap.before(async () => {
  // Hack to work around the Podlet using the package.json name on creation
  fs.writeFileSync(
    join(tempDirectory, 'package.json'),
    `{"name": "test-server-app", "type": "module"}`,
  );
});

tap.teardown(async () => {
  fs.unlinkSync(join(tempDirectory, 'package.json'));
});
tap.afterEach(async () => {
  memoryDestination.reset();
});
tap.test('Logs with debug level when told to', async (t) => {
  const server = await TestServer.create({
    cwd: tempDirectory,
    development: true,
    // @ts-ignore
    loggerFunction: () => pino({ level: logLevelDebug }, memoryDestination),
  });
  server.config.set('app.logLevelDebug', logLevelDebug);
  await server.start();
  t.equal(memoryDestination.logs.length, 4);
  await server.stop();
  t.end();
});

tap.test('Logs nothing when set to error', async (t) => {
  const logLevelSilent = 'silent';
  const server = await TestServer.create({
    cwd: tempDirectory,
    development: true,
    // @ts-ignore
    loggerFunction: () => pino({ level: logLevelSilent }, memoryDestination),
  });
  server.config.set('app.logLevel', logLevelSilent);
  await server.start();
  t.equal(memoryDestination.logs.length, 0);
  await server.stop();
  t.end();
});
