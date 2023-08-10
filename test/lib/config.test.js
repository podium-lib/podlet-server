import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { afterEach, beforeEach, test } from "tap";
import { State } from "../../lib/state.js";
import { Extensions } from "../../lib/resolvers/extensions.js";
import { Local } from "../../lib/resolvers/local.js";
import { Core } from "../../lib/resolvers/core.js";
import configuration from "../../lib/config.js";

const tmp = join(tmpdir(), "./test.js");

beforeEach(async () => {
  await mkdir(tmp);
  await writeFile(join(tmp, "package.json"), JSON.stringify({ name: "test-podlet" }));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

test("default values", async (t) => {
  const state = new State({ cwd: tmp });
  const core = await Core.load();
  state.set("core", core);
  const config = await configuration({ cwd: tmp, schemas: await state.config() });
  // @ts-ignore
  t.equal(config.get("app.name"), "test-podlet", "app.name should equal test-podlet");
  t.equal(config.get("app.env"), "local", "app.env should equal local");
  t.equal(config.get("app.host"), "localhost", "app.host should equal localhost");
  t.equal(config.get("app.base"), "/test-podlet", "app.base should equal /test-podlet");
  t.equal(config.get("app.development"), true, "app.development should be true");
  t.same(config.get("app.locales"), [], "app.locales should default to an empty array");
  t.equal(config.get("podlet.fallback"), "", "podlet.fallback should be an empty string");
  t.equal(config.get("assets.scripts"), false, "assets.scripts should be false");
  t.equal(config.get("assets.lazy"), false, "assets.lazy should be false");
});

test("app.name overrides value in package.json", async (t) => {
  await mkdir(join(tmp, "config"));
  await writeFile(join(tmp, "config", "common.json"), JSON.stringify({ app: { name: "overridden-name" } }));
  const state = new State({ cwd: tmp });
  const core = await Core.load();
  state.set("core", core);
  const config = await configuration({ cwd: tmp, schemas: await state.config() });
  t.equal(config.get("app.name"), "overridden-name", "app.name should equal overridden-name");
  t.equal(config.get("app.base"), "/overridden-name", "app.base should equal /overridden-name");
});

test("app.name and app.base overrides respected", async (t) => {
  await mkdir(join(tmp, "config"));
  await writeFile(join(tmp, "config", "common.json"), JSON.stringify({ app: { name: "overridden-name", base: "/" } }));
  const state = new State({ cwd: tmp });
  const core = await Core.load();
  state.set("core", core);
  const config = await configuration({ cwd: tmp, schemas: await state.config() });
  t.equal(config.get("app.name"), "overridden-name", "app.name should equal overridden-name");
  t.equal(config.get("app.base"), "/", "app.base should equal /");
});

test("Unusable package.json name and no override provide yields actionable error message", async (t) => {
  await writeFile(join(tmp, "package.json"), JSON.stringify({ name: "@scope/name" }));
  try {
    const state = new State({ cwd: tmp });
    const core = await Core.load();
    state.set("core", core);
    await configuration({ cwd: tmp, schemas: await state.config() });
  } catch (err) {
    t.equal(
      err.message,
      `Name field in package.json was not usable as a default app name because it uses characters other than a-z and -.\nYou have 2 choices:\n1. Either set it to a different name using lower case letters and the - character\n2. keep it as is and define the app name in config.\nA good place for this is in /config/common.json\neg. { "app": { "name": "my-app-name-here" } }"`,
      "err.message should be useful",
    );
  }
});

test("ENV set to value other than local results in development=false", async (t) => {
  const env = process.env.ENV;
  process.env.ENV = "prod";
  const state = new State({ cwd: tmp });
  const core = await Core.load();
  state.set("core", core);
  const config = await configuration({ cwd: tmp, schemas: await state.config() });
  t.equal(config.get("app.development"), false, "app.development should be false");
  // reset env
  process.env.ENV = env;
});

test("When fallback.js is defined, podlet.fallback should equal /fallback", async (t) => {
  await writeFile(join(tmp, "/fallback.js"), "");
  const state = new State({ cwd: tmp });
  const core = await Core.load();
  state.set("core", core);
  const config = await configuration({ cwd: tmp, schemas: await state.config() });
  t.equal(config.get("podlet.fallback"), "/fallback", "podlet.fallback should be /fallback");
});

test("When fallback.ts is defined, podlet.fallback should equal /fallback", async (t) => {
  await writeFile(join(tmp, "/fallback.ts"), "");
  const state = new State({ cwd: tmp });
  const core = await Core.load();
  state.set("core", core);
  const config = await configuration({ cwd: tmp, schemas: await state.config() });
  t.equal(config.get("podlet.fallback"), "/fallback", "podlet.fallback should be /fallback");
});

test("When scripts.js is defined, app.scripts should be true", async (t) => {
  await writeFile(join(tmp, "/scripts.js"), "");
  const state = new State({ cwd: tmp });
  const core = await Core.load();
  state.set("core", core);
  const config = await configuration({ cwd: tmp, schemas: await state.config() });
  t.equal(config.get("assets.scripts"), true, "assets.scripts should be true");
});

test("When scripts.ts is defined, app.scripts should be true", async (t) => {
  await writeFile(join(tmp, "/scripts.js"), "");
  const state = new State({ cwd: tmp });
  const core = await Core.load();
  state.set("core", core);
  const config = await configuration({ cwd: tmp, schemas: await state.config() });
  // @ts-ignore
  t.equal(config.get("assets.scripts"), true, "assets.scripts should be true");
});

test("When lazy.js is defined, app.lazy should be true", async (t) => {
  await writeFile(join(tmp, "/lazy.js"), "");
  const state = new State({ cwd: tmp });
  const core = await Core.load();
  state.set("core", core);
  const config = await configuration({ cwd: tmp, schemas: await state.config() });
  t.equal(config.get("assets.lazy"), true, "assets.lazy should be true");
});

test("When lazy.ts is defined, app.lazy should be true", async (t) => {
  await writeFile(join(tmp, "/lazy.ts"), "");
  const state = new State({ cwd: tmp });
  const core = await Core.load();
  state.set("core", core);
  const config = await configuration({ cwd: tmp, schemas: await state.config() });
  t.equal(config.get("assets.lazy"), true, "assets.lazy should be true");
});

test("When config/common.json is defined, values within override defaults", async (t) => {
  await mkdir(join(tmp, "config"));
  await writeFile(
    join(tmp, "config", "common.json"),
    JSON.stringify({
      app: {
        mode: "csr-only",
      },
      podlet: {
        content: "/content",
      },
      metrics: {
        timing: {
          timeAllRoutes: true,
        },
      },
      assets: {
        scripts: true,
      },
    }),
  );
  const state = new State({ cwd: tmp });
  const core = await Core.load();
  state.set("core", core);
  const config = await configuration({ cwd: tmp, schemas: await state.config() });
  t.equal(config.get("app.mode"), "csr-only", "app.mode should be csr-only");
  t.equal(config.get("podlet.content"), "/content", "podlet.content should equal /content");
  t.equal(config.get("metrics.timing.timeAllRoutes"), true, "metrics.timing.timeAllRoutes should be true");
  t.equal(config.get("assets.scripts"), true, "assets.scripts should be true");
});

test("When domain/env specific config is defined, values within override defaults", async (t) => {
  const env = process.env.ENV;
  const host = process.env.HOST;
  process.env.ENV = "prod";
  process.env.HOST = "www.finn.no";
  await mkdir(join(tmp, "config/hosts/www.finn.no"), { recursive: true });
  await writeFile(
    join(tmp, "config", "hosts", "www.finn.no", "prod.json"),
    JSON.stringify({
      app: {
        mode: "csr-only",
      },
      podlet: {
        content: "/content",
      },
      metrics: {
        timing: {
          timeAllRoutes: true,
        },
      },
      assets: {
        scripts: true,
      },
    }),
  );
  const state = new State({ cwd: tmp });
  const core = await Core.load();
  state.set("core", core);
  const config = await configuration({ cwd: tmp, schemas: await state.config() });
  // @ts-ignore
  t.equal(config.get("app.mode"), "csr-only", "app.mode should be csr-only");
  t.equal(config.get("podlet.content"), "/content", "podlet.content should equal /content");
  t.equal(config.get("metrics.timing.timeAllRoutes"), true, "metrics.timing.timeAllRoutes should be true");
  t.equal(config.get("assets.scripts"), true, "assets.scripts should be true");
  // reset env
  process.env.ENV = env;
  process.env.HOST = host;
});

test("When domain/env specific config is defined in the old format, it still overrides the defaults", async (t) => {
  const env = process.env.ENV;
  const host = process.env.HOST;
  process.env.ENV = "prod";
  process.env.HOST = "www.finn.no";
  await mkdir(join(tmp, "config/hosts/www.finn.no"), { recursive: true });
  await writeFile(
    join(tmp, "config", "hosts", "www.finn.no", "config.prod.json"),
    JSON.stringify({
      app: {
        mode: "csr-only",
      },
    }),
  );
  const state = new State({ cwd: tmp });
  state.set("core", await Core.load());
  const config = await configuration({ cwd: tmp, schemas: await state.config() });
  // @ts-ignore
  t.equal(config.get("app.mode"), "csr-only", "app.mode should be csr-only");
  // reset env
  process.env.ENV = env;
  process.env.HOST = host;
});

test("When domain/env specific config is defined, values within override config/common.json values", async (t) => {
  const env = process.env.ENV;
  const host = process.env.HOST;
  process.env.ENV = "prod";
  process.env.HOST = "www.finn.no";

  // set values in common.json
  await mkdir(join(tmp, "config"));
  await writeFile(
    join(tmp, "config", "common.json"),
    JSON.stringify({
      app: {
        mode: "ssr-only",
      },
      podlet: {
        content: "/con",
      },
      metrics: {
        timing: {
          timeAllRoutes: true,
        },
      },
      assets: {
        scripts: true,
      },
    }),
  );

  // override again with domain specific config
  await mkdir(join(tmp, "config/hosts/www.finn.no"), { recursive: true });
  await writeFile(
    join(tmp, "config", "hosts", "www.finn.no", "prod.json"),
    JSON.stringify({
      app: {
        mode: "csr-only",
      },
      podlet: {
        content: "/content",
      },
      metrics: {
        timing: {
          timeAllRoutes: false,
        },
      },
      assets: {
        scripts: false,
      },
    }),
  );
  const state = new State({ cwd: tmp });
  const core = await Core.load();
  state.set("core", core);
  const config = await configuration({ cwd: tmp, schemas: await state.config() });
  // @ts-ignore
  t.equal(config.get("app.mode"), "csr-only", "app.mode should be csr-only");
  t.equal(config.get("podlet.content"), "/content", "podlet.content should equal /content");
  t.equal(config.get("metrics.timing.timeAllRoutes"), false, "metrics.timing.timeAllRoutes should be false");
  t.equal(config.get("assets.scripts"), false, "assets.scripts should be false");
  // reset env
  process.env.ENV = env;
  process.env.HOST = host;
});

test("app.grace when running in development", async (t) => {
  const env = process.env.ENV;
  process.env.ENV = "local";
  await mkdir(join(tmp, "config"));
  const state = new State({ cwd: tmp });
  const core = await Core.load();
  state.set("core", core);
  const config = await configuration({ cwd: tmp, schemas: await state.config() });
  // @ts-ignore
  t.equal(config.get("app.grace"), 0, "app.grace should equal 0");
  // reset env
  process.env.ENV = env;
});

test("app.grace when not running in development", async (t) => {
  const env = process.env.ENV;
  process.env.ENV = "prod";
  await mkdir(join(tmp, "config"));
  const state = new State({ cwd: tmp });
  const core = await Core.load();
  state.set("core", core);
  const config = await configuration({ cwd: tmp, schemas: await state.config() });
  // @ts-ignore
  t.equal(config.get("app.grace"), 5000, "app.grace should equal 5000");
  // reset env
  process.env.ENV = env;
});

test("app.grace when overridden", async (t) => {
  await mkdir(join(tmp, "config"));
  await writeFile(join(tmp, "config", "common.json"), JSON.stringify({ app: { grace: 2500 } }));
  const state = new State({ cwd: tmp });
  const core = await Core.load();
  state.set("core", core);
  const config = await configuration({ cwd: tmp, schemas: await state.config() });
  t.equal(config.get("app.grace"), 2500, "app.grace should equal 2500");
});

test("config loading from extensions overrides default config", async (t) => {
  await writeFile(
    join(tmp, "package.json"),
    JSON.stringify({
      name: "test-app",
      type: "module",
      version: "1.0.0",
      podium: { extensions: { "podlet-server": ["test-extension"] } },
    }),
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
    }),
  );
  await writeFile(
    join(tmp, "node_modules", "test-extension", "index.js"),
    `
    export const config = ({cwd, development}) => ({api:{default:"/extension",format:String},assets:{base:{default:"/extension",format:String}},app:{base:{default:"/extension",format:String}}});
  `,
  );
  await mkdir(join(tmp, "config"));
  await writeFile(
    join(tmp, "config", "schema.js"),
    'export default ({cwd, development}) => ({assets:{base:{default:"/app",format:String}}});',
  );

  const state = new State({ cwd: tmp });
  const core = await Core.load();
  const extensions = await Extensions.load({ cwd: tmp });
  const local = await Local.load({ cwd: tmp });

  state.set("core", core);
  state.set("extensions", extensions);
  state.set("local", local);
  const config = await configuration({ cwd: tmp, schemas: await state.config() });

  // @ts-ignore
  t.equal(config.get("api"), "/extension", "config should be loaded from extension");
  t.equal(config.get("app.base"), "/extension", "config should be loaded from extension");
  t.equal(config.get("assets.base"), "/app", "config should be loaded from app");
});
