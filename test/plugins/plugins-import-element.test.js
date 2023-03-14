import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { test, beforeEach, afterEach } from "tap";
import fastify from "fastify";
import plugin from "../../plugins/import-element.js";

const tmp = join(tmpdir(), "./plugins-import-element.test.js");

beforeEach(async (t) => {
  await mkdir(tmp);
  await writeFile(join(tmp, "package.json"), JSON.stringify({ name: "test-app", type: "module" }));
  await writeFile(join(tmp, "element.js"), "export default class Element {static get replaced() {return false;}}");
});

afterEach(async (t) => {
  await rm(tmp, { recursive: true, force: true });
});

test("invalid path given throws", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { appName: "test-app", cwd: tmp });
  try {
    // @ts-ignore
    await app.importElement("");
  } catch (err) {
    t.match(
      err.message,
      "Invalid path '' given to importElement",
      "customElement registry should contain test-app-element"
    );
  }
  try {
    // @ts-ignore
    await app.importElement("./");
  } catch (err) {
    t.match(
      err.message,
      "Invalid path './' given to importElement",
      "customElement registry should contain test-app-element"
    );
  }
  try {
    // @ts-ignore
    await app.importElement("/");
  } catch (err) {
    t.match(
      err.message,
      "Invalid path '/' given to importElement",
      "customElement registry should contain test-app-element"
    );
  }
});

test("decorator importElement imports element into registry", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { appName: "test-app", cwd: tmp });
  // @ts-ignore
  await app.importElement("./element.js");
  t.equal(
    // @ts-ignore
    customElements.__definitions.has("test-app-element"),
    true,
    "customElement registry should contain test-app-element"
  );
});

test("non development mode does not re-import element into registry with each call to importElement", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { appName: "test-app", cwd: tmp });
  // @ts-ignore
  await app.importElement("./element.js");
  t.equal(
    // @ts-ignore
    customElements.__definitions.has("test-app-element"),
    true,
    "customElement registry should contain test-app-element"
  );
  await writeFile(
    join(tmp, "element.js"),
    "export default class DifferentElement {static get replaced() {return true;}}"
  );
  // @ts-ignore
  await app.importElement("./element.js");
  // @ts-ignore
  t.equal(customElements.__definitions.get("test-app-element").ctor.replaced, false);
});

test("development mode re-imports element into registry with each call to importElement", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { appName: "test-app", cwd: tmp, development: true });
  // @ts-ignore
  await app.importElement("./element.js");
  t.equal(
    // @ts-ignore
    customElements.__definitions.has("test-app-element"),
    true,
    "customElement registry should contain test-app-element"
  );
  await writeFile(
    join(tmp, "element.js"),
    "export default class DifferentElement {static get replaced() {return true;}}"
  );
  // @ts-ignore
  await app.importElement("./element.js");
  // @ts-ignore
  t.equal(customElements.__definitions.get("test-app-element").ctor.replaced, true);
});

test("throws if filepath given does not exist", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { appName: "test-app", cwd: tmp, development: false });
  try {
    // @ts-ignore
    await app.importElement("./does-not-exist.js");
  } catch (err) {
    t.match(err.message, `Cannot find module './does-not-exist.js'`, "should match expected error message");
  }
});

test("successful server side rendering when dependent components used", async (t) => {
  const app = fastify({ logger: false });
  await app.register(plugin, { appName: "test-app", cwd: tmp, development: true });
  await writeFile(
    join(tmp, "element-with-dep.js"),
    `class DependentElement {static get replaced() {return false;}}
    customElements.define('dependent-component', DependentElement);
    export default class OriginalElement {static get replaced() {return false;}}`
  );
  // @ts-ignore
  await app.importElement("./element-with-dep.js");
  t.equal(
    // @ts-ignore
    customElements.__definitions.has("test-app-element-with-dep"),
    true,
    "customElement registry should contain test-app-element-with-dep"
  );
  t.equal(
    // @ts-ignore
    customElements.__definitions.has("dependent-component"),
    true,
    "customElement registry should contain dependent-component"
  );
  await writeFile(
    join(tmp, "element-with-dep.js"),
    `class DependentElement {static get replaced() {return true;}}
    customElements.define('dependent-component', DependentElement);
    export default class DifferentElement {static get replaced() {return true;}}`
  );
  // @ts-ignore
  await app.importElement("./element-with-dep.js");
  // @ts-ignore
  t.equal(customElements.__definitions.get("test-app-element-with-dep").ctor.replaced, true);
  // @ts-ignore
  t.equal(customElements.__definitions.get("dependent-component").ctor.replaced, true);
});
