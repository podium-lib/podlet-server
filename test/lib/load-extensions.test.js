import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { test, beforeEach, afterEach } from "tap";
import loadExtensions from "../../lib/load-extensions.js";

const tmp = join(tmpdir(), "./load-extensions.test.js");

beforeEach(async () => {
  await mkdir(tmp);
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

test("No extensions present", async (t) => {
  const extensions = await loadExtensions({ cwd: tmp });
  t.equal(extensions.configSchemas.length, 0);
  t.equal(extensions.serverPlugins.length, 0);
  t.equal(extensions.documentTemplates.length, 0);
  t.equal(extensions.buildPlugins.length, 0);
  t.equal(extensions.fallbackFiles.length, 0);
});

test("One extension present", async (t) => {
  await writeFile(
    join(tmp, "package.json"),
    JSON.stringify({ name: "test-app", type: "module", dependencies: { "test-extension": "1.0.0" } })
  );
  await mkdir(join(tmp, "node_modules"));
  await mkdir(join(tmp, "node_modules", "test-extension"));
  await mkdir(join(tmp, "node_modules", "test-extension", "config"));
  await writeFile(
    join(tmp, "node_modules", "test-extension", "package.json"),
    JSON.stringify({
      name: "test-extension",
      version: "1.0.0",
      main: "index.js",
      type: "module",
      podium: { extension: ["podlet-server"] },
    })
  );
  await writeFile(join(tmp, "node_modules", "test-extension", "index.js"), "export default {};");
  await writeFile(join(tmp, "node_modules", "test-extension", "config", "schema.js"), "export default {};");
  await writeFile(join(tmp, "node_modules", "test-extension", "fallback.js"), "export default class Fallback {};");
  await writeFile(join(tmp, "node_modules", "test-extension", "build.js"), "export default () => { return []};");
  await writeFile(join(tmp, "node_modules", "test-extension", "document.js"), "export default () => {};");
  await writeFile(
    join(tmp, "node_modules", "test-extension", "server.js"),
    "export default async function server() {};"
  );

  const extensions = await loadExtensions({ cwd: tmp });

  t.equal(extensions.configSchemas.length, 1);
  t.equal(extensions.serverPlugins.length, 1);
  t.equal(extensions.documentTemplates.length, 1);
  t.equal(extensions.buildPlugins.length, 1);
  // t.equal(extensions.fallbackFiles.length, 1);
});

test("Two extensions present", async (t) => {
  await writeFile(
    join(tmp, "package.json"),
    JSON.stringify({ name: "test-app", type: "module", dependencies: { "test-extension": "1.0.0", "test-extension2": "1.0.0" } })
  );
  await mkdir(join(tmp, "node_modules"));
  await mkdir(join(tmp, "node_modules", "test-extension"));
  await mkdir(join(tmp, "node_modules", "test-extension", "config"));
  await writeFile(
    join(tmp, "node_modules", "test-extension", "package.json"),
    JSON.stringify({
      name: "test-extension",
      version: "1.0.0",
      main: "index.js",
      type: "module",
      podium: { extension: ["podlet-server"] },
    })
  );
  await writeFile(join(tmp, "node_modules", "test-extension", "index.js"), "export default {};");
  await writeFile(join(tmp, "node_modules", "test-extension", "config", "schema.js"), "export default {};");
  await writeFile(join(tmp, "node_modules", "test-extension", "fallback.js"), "export default class Fallback {};");
  await writeFile(join(tmp, "node_modules", "test-extension", "build.js"), "export default () => { return []};");
  await writeFile(join(tmp, "node_modules", "test-extension", "document.js"), "export default () => {};");
  await writeFile(
    join(tmp, "node_modules", "test-extension", "server.js"),
    "export default async function server() {};"
  );

  await mkdir(join(tmp, "node_modules", "test-extension2"));
  await mkdir(join(tmp, "node_modules", "test-extension2", "config"));
  await writeFile(
    join(tmp, "node_modules", "test-extension2", "package.json"),
    JSON.stringify({
      name: "test-extension2",
      version: "1.0.0",
      main: "index.js",
      type: "module",
      podium: { extension: ["podlet-server"] },
    })
  );
  await writeFile(join(tmp, "node_modules", "test-extension2", "index.js"), "export default {};");
  await writeFile(join(tmp, "node_modules", "test-extension2", "config", "schema.js"), "export default {};");
  await writeFile(join(tmp, "node_modules", "test-extension2", "fallback.js"), "export default class Fallback {};");
  await writeFile(join(tmp, "node_modules", "test-extension2", "build.js"), "export default () => { return []};");
  await writeFile(join(tmp, "node_modules", "test-extension2", "document.js"), "export default () => {};");
  await writeFile(
    join(tmp, "node_modules", "test-extension2", "server.js"),
    "export default async function server() {};"
  );

  const extensions = await loadExtensions({ cwd: tmp });

  t.equal(extensions.configSchemas.length, 2);
  t.equal(extensions.serverPlugins.length, 2);
  t.equal(extensions.documentTemplates.length, 2);
  t.equal(extensions.buildPlugins.length, 2);
  // t.equal(extensions.fallbackFiles.length, 2);
});
