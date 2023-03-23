import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { test, beforeEach, afterEach } from "tap";
import configuration from "../../lib/config.js";
import { build } from "../../api/build.js";
import { start } from "../../api/start.js";

const tmp = join(tmpdir(), "./api.test.js");

beforeEach(async (t) => {
  await mkdir(tmp);
});

afterEach(async (t) => {
  await rm(tmp, { recursive: true, force: true });
});

test("Starting with no files in directory", async (t) => {
  const config = await configuration({ cwd: tmp });
  config.set("app.port", 0);
  config.set("app.logLevel", "FATAL");
  // @ts-ignore
  config.set("app.base", "/test-app");
  // @ts-ignore
  config.set("app.name", "test-app");
  await build({ config, cwd: tmp });
  const app = await start({ config, cwd: tmp });
  const res = await fetch(`${app.address}/test-app/manifest.json`);
  t.equal(res.status, 200, "App should respond on manifest route");
  await app.close();
});

test("Starting with package.json file in directory", async (t) => {
  await writeFile(join(tmp, "package.json"), JSON.stringify({ name: "test-app" }));
  const config = await configuration({ cwd: tmp });
  config.set("app.port", 0);
  config.set("app.logLevel", "FATAL");
  await build({ config, cwd: tmp });
  const app = await start({ config, cwd: tmp });
  const res = await fetch(`${app.address}/test-app/manifest.json`);
  t.equal(res.status, 200, "App should respond on manifest route");
  await app.close();
});

test("Starting with content file in directory", async (t) => {
  await writeFile(
    join(tmp, "package.json"),
    JSON.stringify({ name: "test-app", type: "module", dependencies: { lit: "*" } })
  );
  await writeFile(
    join(tmp, "content.js"),
    `
    import { html, LitElement } from "lit";
    export default class Content extends LitElement {
        render() { 
            return html\`<div>hello world</div>\`;
        }
    }
    `.trim()
  );
  execSync("npm install", { cwd: tmp });
  const config = await configuration({ cwd: tmp });
  config.set("app.port", 0);
  config.set("app.logLevel", "FATAL");
  await build({ config, cwd: tmp });
  const app = await start({ config, cwd: tmp });
  const res = await fetch(`${app.address}/test-app`);
  const markup = await res.text();
  t.equal(res.status, 200, "App should respond on content route");
  t.match(markup, "<div>hello world</div>", "Content should be hello world");

  await app.close();
});
