import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { test, beforeEach, afterEach } from "tap";
import configuration from "../../lib/config.js";
import { build } from "../../api/build.js";
import { start } from "../../api/start.js";
import { Extensions } from "../../lib/extensions/extensions.js";

const tmp = join(tmpdir(), "./api.test.js");

beforeEach(async (t) => {
  await mkdir(tmp);
});

afterEach(async (t) => {
  await rm(tmp, { recursive: true, force: true });
});

test("Starting with no files in directory", async (t) => {
  const config = await configuration({ cwd: tmp });
  // @ts-ignore
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
  // @ts-ignore
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

// Test for using validated query parameters in server.js
test("Using validated query parameters in server.js", async (t) => {
  await mkdir(join(tmp, "schemas"));
  const contentSchema = {
    querystring: {
      type: "object",
      properties: {
        id: { type: "integer" },
      },
      required: ["id"],
    },
  };

  await writeFile(join(tmp, "schemas", "content.json"), JSON.stringify(contentSchema));
  await writeFile(
    join(tmp, "server.js"),
    `
    export default async function server(app) {
      app.setContentState(async ({ query }) => {
        const { id } = query;
        return { id };
      });
    }
  `.trim()
  );
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
  // @ts-ignore
  config.set("app.port", 0);
  config.set("app.logLevel", "FATAL");

  await build({ config, cwd: tmp });
  const app = await start({ config, cwd: tmp });

  const validRes = await fetch(`${app.address}/test-app?id=1`);
  t.equal(validRes.status, 200, "App should respond on content route with valid query parameter");

  const invalidRes = await fetch(`${app.address}/test-app?id=invalid`);
  t.equal(invalidRes.status, 400, "App should respond with a 400 status for invalid query parameter");

  await app.close();
});

test("Fallback route", async (t) => {
  await writeFile(
    join(tmp, "fallback.js"),
    `
  import { html, LitElement } from "lit";
  export default class Content extends LitElement {
      render() { 
          return html\`<div>Fallback content</div>\`;
      }
  }
  `.trim()
  );
  await writeFile(
    join(tmp, "package.json"),
    JSON.stringify({ name: "test-app", type: "module", dependencies: { lit: "*" } })
  );
  execSync("npm install", { cwd: tmp });
  const config = await configuration({ cwd: tmp });
  // @ts-ignore
  config.set("app.port", 0);
  config.set("app.logLevel", "FATAL");
  await build({ config, cwd: tmp });
  const app = await start({ config, cwd: tmp });

  const res = await fetch(`${app.address}/test-app/fallback`);
  const markup = await res.text();
  t.equal(res.status, 200, "App should respond on fallback route");
  t.match(markup, "<div>Fallback content</div>", "Fallback content should be displayed");

  await app.close();
});

// Test for scripts.js loading
test("scripts.js loading", async (t) => {
  await writeFile(
    join(tmp, "scripts.js"),
    `
    console.log("This script will be loaded after the main podlet scripts.");
  `.trim()
  );
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
  // @ts-ignore
  config.set("app.port", 0);
  config.set("app.logLevel", "FATAL");
  config.set("app.mode", "ssrOnly");
  await build({ config, cwd: tmp });
  const app = await start({ config, cwd: tmp });

  const res = await fetch(`${app.address}/test-app/static/client/scripts.js`);
  const content = await res.text();
  t.equal(res.status, 200, "App should respond on scripts.js route");
  t.match(content, "This script will be loaded after the main podlet scripts.", "scripts.js content should be correct");

  await app.close();
});

// Test for lazy.js loading
test("lazy.js loading", async (t) => {
  await writeFile(
    join(tmp, "lazy.js"),
    `
    console.log("This script is lazy-loaded after the window load event.");
  `.trim()
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
  await writeFile(
    join(tmp, "package.json"),
    JSON.stringify({ name: "test-app", type: "module", dependencies: { lit: "*" } })
  );
  execSync("npm install", { cwd: tmp });
  const config = await configuration({ cwd: tmp });
  config.set("app.port", 0);
  config.set("app.logLevel", "FATAL");
  await build({ config, cwd: tmp });
  const app = await start({ config, cwd: tmp });

  const res = await fetch(`${app.address}/test-app/static/client/lazy.js`);
  const content = await res.text();
  t.equal(res.status, 200, "App should respond on lazy.js route");
  t.match(content, "This script is lazy-loaded after the window load event.", "lazy.js content should be correct");

  await app.close();
});

// Test for extension loading
test("Loading an extension", async (t) => {
  await mkdir(join(tmp, "node_modules"));
  await mkdir(join(tmp, "node_modules", "test-extension"));
  await writeFile(
    join(tmp, "node_modules", "test-extension", "package.json"),
    JSON.stringify({
      name: "test-extension",
      version: "1.0.0",
      main: "index.js",
      type: "module",
    })
  );
  await writeFile(
    join(tmp, "node_modules", "test-extension", "index.js"),
    `
    export const config = {};
    export const build = () => [Promise.resolve()];
    export async function server(app) {};
    export const document = (incoming, template) => \`...test...\`;
  `
  );
  await writeFile(
    join(tmp, "package.json"),
    JSON.stringify({
      name: "test-app",
      type: "module",
      podium: { extensions: { "podlet-server": ["test-extension"] } },
    })
  );

  const extensions = await Extensions.load(tmp);
  const config = await configuration({ cwd: tmp, additionalSchemas: extensions.config });
  config.set("app.port", 0);
  config.set("app.logLevel", "FATAL");
  await build({ config, cwd: tmp });
  const app = await start({ config, extensions, cwd: tmp });

  t.equal(extensions.extensions.size, 1, "Should load one extension");

  await app.close();
});
