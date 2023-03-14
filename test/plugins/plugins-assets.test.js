import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { test, beforeEach, afterEach } from "tap";
import fastify from "fastify";
import plugin from "../../plugins/assets.js";

const tmp = join(tmpdir(), "./plugins-assets.test.js");

beforeEach(async (t) => {
  await mkdir(tmp);
  await mkdir(join(tmp, "dist"));
  await writeFile(join(tmp, "dist", "test.txt"), "test");
});

afterEach(async (t) => {
  await rm(tmp, { recursive: true, force: true });
});

test("static assets not served for absolute base", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { cwd: tmp, base: "https://assets.test.com/package" });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/static/test.txt`);
  t.equal(result.status, 404, "test file should not be served at default location");
  await app.close();
});

test("static assets served for relative base", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { cwd: tmp, base: "/assets" });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/assets/test.txt`);
  t.equal(result.status, 200, "test file should be served at configured location");
  await app.close();
});

test("static assets served for default relative base", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { cwd: tmp });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/static/test.txt`);
  t.equal(result.status, 200, "test file should be served at default location");
  await app.close();
});

test("plugin mounted under a prefix: default base", async (t) => {
  const app = fastify({ logger: false });
  await app.register(async () => {
      await app.register(plugin, { cwd: tmp });
  }, { prefix: "/test" });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/test/static/test.txt`);
  t.equal(result.status, 200, "test file should be served under prefix");
  await app.close();
});

test("plugin mounted under a prefix: configured base", async (t) => {
  const app = fastify({ logger: false });
  await app.register(async () => {
      await app.register(plugin, { cwd: tmp, base: "/assets" });
  }, { prefix: "/test" });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/test/assets/test.txt`);
  t.equal(result.status, 200, "test file should be served under prefix and configured base");
  await app.close();
});
