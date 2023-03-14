import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { test, beforeEach, afterEach } from "tap";
import PathResolver from "../../lib/path.js";
import { existsSync } from "node:fs";

const tmp = join(tmpdir(), "./path.test.js");

beforeEach(async () => {
  await mkdir(tmp);
  await writeFile(join(tmp, "javascript.js"), "export const script = true;");
  await writeFile(join(tmp, "typescript.ts"), "export const script = true;");
  await mkdir(join(tmp, "dist"));
  await writeFile(join(tmp, "package.json"), JSON.stringify({ name: "test-app", type: "module" }));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

test("JavaScript file resolution for a file that exists", async (t) => {
  const resolver = new PathResolver({ cwd: tmp, development: false });
  const resolution = await resolver.resolve("./javascript.js");
  t.equal(resolution.javascript, true);
  t.equal(resolution.typescript, false);
  t.equal(resolution.path, join(tmp, "./javascript.js"));
  t.equal(resolution.exists, true);
  t.equal(resolution.originalPath, "./javascript.js");
  t.equal(resolution.cwd, tmp);
});

test("JavaScript file resolution via absolute path", async (t) => {
  const resolver = new PathResolver({ cwd: tmp, development: false });
  const resolution = await resolver.resolve(join(tmp, "./javascript.js"));
  t.equal(resolution.javascript, true);
  t.equal(resolution.typescript, false);
  t.equal(resolution.path, join(tmp, "./javascript.js"));
  t.equal(resolution.exists, true);
  t.equal(resolution.originalPath, join(tmp, "./javascript.js"));
  t.equal(resolution.cwd, tmp);
});

test("Non existent file", async (t) => {
  const resolver = new PathResolver({ cwd: tmp, development: false });
  const resolution = await resolver.resolve("./fake.js");
  t.equal(resolution.javascript, false);
  t.equal(resolution.typescript, false);
  t.equal(resolution.path, join(tmp, "./fake.js"));
  t.equal(resolution.exists, false);
  t.equal(resolution.originalPath, "./fake.js");
  t.equal(resolution.cwd, tmp);
});

test("Typescript file", async (t) => {
  const resolver = new PathResolver({ cwd: tmp, development: false });
  const resolution = await resolver.resolve("./typescript.js");
  t.equal(resolution.javascript, false);
  t.equal(resolution.typescript, true);
  t.equal(resolution.path, join(tmp, "./typescript.ts"));
  t.equal(resolution.exists, true);
  t.equal(resolution.originalPath, "./typescript.js");
  t.equal(resolution.cwd, tmp);
});

test("Typescript and Javascript file throws", async (t) => {
  await writeFile(join(tmp, "javascript.ts"), "export const script = true;");
  const resolver = new PathResolver({ cwd: tmp, development: false });
  try {
    await resolver.resolve("./javascript.js");
  } catch (err) {
    t.match(err.message, ".ts and .js versions of file exist for file");
    t.match(err.message, "Please use either Typescript OR JavaScript");
  }
});

test(".buildAndResolve resolves Javascript the same as for .resolve", async (t) => {
  const resolver = new PathResolver({ cwd: tmp, development: false });
  t.equal((await resolver.resolve("./javascript.js")).path, (await resolver.buildAndResolve("./javascript.js")).path);
});

test(".buildAndResolve builds and then resolves Typescript to Javascript", async (t) => {
  const resolver = new PathResolver({ cwd: tmp, development: false });
  const resolution = await resolver.buildAndResolve("./typescript.js");
  t.equal(resolution.path, join(tmp, "dist", "server", "typescript.js"));
  t.ok(existsSync(resolution.path));
});

test("Import JavaScript file using a path string", async (t) => {
  const resolver = new PathResolver({ cwd: tmp, development: false });
  const { script } = await resolver.import("./javascript.js");
  t.equal(script, true);
});

test("Import TypeScript file using a path string", async (t) => {
  const resolver = new PathResolver({ cwd: tmp, development: false });
  const { script } = await resolver.import("./typescript.js");
  t.equal(script, true);
});

test("Import JavaScript file using a resolution object", async (t) => {
  const resolver = new PathResolver({ cwd: tmp, development: false });
  const resolution = await resolver.resolve("./javascript.js");
  const { script } = await resolver.import(resolution);
  t.equal(script, true);
});

test("Import TypeScript file using a buildAndResolve resolution object", async (t) => {
  const resolver = new PathResolver({ cwd: tmp, development: false });
  const resolution = await resolver.buildAndResolve("./typescript.js");
  const { script } = await resolver.import(resolution);
  t.equal(script, true);
});

test("Import TypeScript file using a resolution object", async (t) => {
  const resolver = new PathResolver({ cwd: tmp, development: false });
  const resolution = await resolver.resolve("./typescript.js");
  const { script } = await resolver.import(resolution);
  t.equal(script, true);
});

test("Import JavaScript file using a path string without extension", async (t) => {
  const resolver = new PathResolver({ cwd: tmp, development: false });
  const { script } = await resolver.import("./javascript");
  t.equal(script, true);
});

test("Import TypeScript file using a path string without extension", async (t) => {
  const resolver = new PathResolver({ cwd: tmp, development: false });
  const { script } = await resolver.import("./typescript");
  t.equal(script, true);
});
