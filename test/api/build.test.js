import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { test, beforeEach, afterEach } from "tap";
import configuration from "../../lib/config.js";
import { build } from "../../api/build.js";
import { Extensions } from "../../lib/resolvers/extensions.js";
import { Local } from "../../lib/resolvers/local.js";
import { Core } from "../../lib/resolvers/core.js";
import { State } from "../../lib/state.js";

const tmp = join(tmpdir(), "./build-test-js");

async function setupConfig({ cwd }) {
  const state = new State({ cwd });
  state.set("core", await Core.load());
  state.set("extensions", await Extensions.load({ cwd }));
  state.set("local", await Local.load({ cwd }));

  const config = await configuration({ cwd, schemas: await state.config() });

  // @ts-ignore
  config.set("app.port", 0);
  config.set("app.logLevel", "FATAL");
  return { state, config };
}

beforeEach(async (t) => {
  await mkdir(tmp, { recursive: true });
});

afterEach(async (t) => {
  await rm(tmp, { recursive: true, force: true });
});

test("All possible supported JavaScript files defined and built", async (t) => {
  const { state, config } = await setupConfig({ cwd: tmp });
  await writeFile(join(tmp, "content.js"), "export default {}");
  await writeFile(join(tmp, "fallback.js"), "export default {}");
  await writeFile(join(tmp, "scripts.js"), "export default {}");
  await writeFile(join(tmp, "lazy.js"), "export default {}");
  // @ts-ignore
  config.set("app.base", "/test-app");
  // @ts-ignore
  config.set("app.name", "test-app");
  await build({ state, config, cwd: tmp });
  
  // server versions built into server directory
  t.ok(existsSync(join(tmp, "dist", "server", "content.js")));
  t.ok(existsSync(join(tmp, "dist", "server", "fallback.js")));
  // entrypoints created via writeFile
  t.ok(existsSync(join(tmp, "dist", ".build", "content-entrypoint.js")));
  t.ok(existsSync(join(tmp, "dist", ".build", "content.js")));
  t.ok(existsSync(join(tmp, "dist", ".build", "scripts.js")));
  t.ok(existsSync(join(tmp, "dist", ".build", "lazy.js")));
  // esbuild versions created to apply plugins
  t.ok(existsSync(join(tmp, "dist", ".build", "fallback-entrypoint.js")));
  t.ok(existsSync(join(tmp, "dist", ".build", "fallback.js")));
  t.ok(existsSync(join(tmp, "dist", ".build", "scripts.js")));
  t.ok(existsSync(join(tmp, "dist", ".build", "lazy.js")));
  // final rollup versions built into client directory
  t.ok(existsSync(join(tmp, "dist", "client", "content.js")));
  t.ok(existsSync(join(tmp, "dist", "client", "fallback.js")));
  t.ok(existsSync(join(tmp, "dist", "client", "scripts.js")));
  t.ok(existsSync(join(tmp, "dist", "client", "lazy.js")));
});

test("All possible supported Typescript files defined and built", async (t) => {
  const { state, config } = await setupConfig({ cwd: tmp });
  await writeFile(join(tmp, "content.ts"), "export default {}");
  await writeFile(join(tmp, "fallback.ts"), "export default {}");
  await writeFile(join(tmp, "scripts.ts"), "export default {}");
  await writeFile(join(tmp, "lazy.ts"), "export default {}");
  // @ts-ignore
  config.set("app.base", "/test-app");
  // @ts-ignore
  config.set("app.name", "test-app");
  await build({ state, config, cwd: tmp });
  
  // server versions built into server directory
  t.ok(existsSync(join(tmp, "dist", "server", "content.js")));
  t.ok(existsSync(join(tmp, "dist", "server", "fallback.js")));
  // entrypoints created via writeFile
  t.ok(existsSync(join(tmp, "dist", ".build", "content-entrypoint.js")));
  t.ok(existsSync(join(tmp, "dist", ".build", "content.js")));
  t.ok(existsSync(join(tmp, "dist", ".build", "scripts.js")));
  t.ok(existsSync(join(tmp, "dist", ".build", "lazy.js")));
  // esbuild versions created to apply plugins
  t.ok(existsSync(join(tmp, "dist", ".build", "fallback-entrypoint.js")));
  t.ok(existsSync(join(tmp, "dist", ".build", "fallback.js")));
  t.ok(existsSync(join(tmp, "dist", ".build", "scripts.js")));
  t.ok(existsSync(join(tmp, "dist", ".build", "lazy.js")));
  // final rollup versions built into client directory
  t.ok(existsSync(join(tmp, "dist", "client", "content.js")));
  t.ok(existsSync(join(tmp, "dist", "client", "fallback.js")));
  t.ok(existsSync(join(tmp, "dist", "client", "scripts.js")));
  t.ok(existsSync(join(tmp, "dist", "client", "lazy.js")));
});
