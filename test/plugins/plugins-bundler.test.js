import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { test, beforeEach, afterEach } from "tap";
import fastify from "fastify";
import plugin from "../../plugins/bundler.js";

const tmp = join(tmpdir(), "./plugins-dependencies");

beforeEach(async (t) => {
  await mkdir(tmp);
  await mkdir(join(tmp, "node_modules"));
  await mkdir(join(tmp, "node_modules", "test-dep"));
  await writeFile(join(tmp, "package.json"), JSON.stringify({ name: "test-app" }));
  await writeFile(
    join(tmp, "node_modules", "test-dep", "package.json"),
    JSON.stringify({ name: "test-dep", main: "./index.js" })
  );
  await writeFile(join(tmp, "node_modules", "test-dep", "index.js"), "export default function dep() {}");
});

afterEach(async (t) => {
  await rm(tmp, { recursive: true, force: true });
});

test("dependency in node_modules folder bundled and served via url request", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { cwd: tmp, development: true });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/_/dynamic/modules/test-dep`);
  const response = await result.text();
  t.equal(result.status, 200, "requested dependency should be served");
  t.equal(
    result.headers.get("content-type"),
    "application/javascript",
    "requested dependency should be served with correct content-type"
  );
  t.match(
    response,
    "function e(){}export{e as default};",
    "requested dependency should respond with correct file contents"
  );
  t.match(
    response,
    "sourceMappingURL=data:application/json;base64",
    "requested dependency should respond with inline sourcemap"
  );
  await app.close();
});

test("dependency bundled and served via url request: prefixed plugin", async (t) => {
  const app = fastify({ logger: false });
  await app.register(
    async () => {
      await app.register(plugin, { cwd: tmp, development: true });
    },
    { prefix: "/test" }
  );
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/test/_/dynamic/modules/test-dep`);
  t.equal(result.status, 200, "requested dependency should be served");
  await app.close();
});

test("non-existent dependency results in a 404 error", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { cwd: tmp, development: true });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/_/dynamic/modules/does-not-exist`);
  const response = await result.json();
  t.equal(result.status, 404, "missing dependency should respond with a 404");
  t.same(
    response,
    {
      statusCode: 404,
      message: "Not Found",
      error: "Not Found",
    },
    "should respond with error object"
  );
  await app.close();
});
