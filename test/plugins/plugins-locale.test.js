import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdir, rm, writeFile, readFile, stat, readdir } from "node:fs/promises";
import { test, beforeEach, afterEach } from "tap";
import fastify from "fastify";
import plugin from "../../plugins/locale.js";
import { getLinguiConfig, linguiCompile, linguiExtract } from "../../lib/lingui.js";
import configuration from "../../lib/config.js";
import { State } from "../../lib/state.js";
import { Core } from "../../lib/resolvers/core.js";

const tmp = join(tmpdir(), "./plugins-locale.test.js");

const contentfile = `import { i18n } from "@lingui/core";\nconst message = i18n.t({ id: "my.id", message: "My message" });`;

beforeEach(async (t) => {
  try {
    const tmpdir = await stat(tmp);

    if (tmpdir.isDirectory()) {
      await rm(tmp, { recursive: true, force: true });
    }
  } catch {}

  await mkdir(tmp);

  const state = new State({ cwd: tmp });
  const core = await Core.load();

  state.set("core", core);
  const config = await configuration({ cwd: tmp, schemas: await state.config() });
  config.set("app.locales", ["en-US", "nb"]);

  t.context.app = fastify({ logger: false });
  t.context.appConfig = config;
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

test("readTranslations method exists", async (t) => {
  const { app } = t.context;
  await app.register(plugin, { cwd: tmp, locale: "en-US" });

  t.ok(app.readTranslations);
});

test("Messages are returned by readTranslations", async (t) => {
  const { app, appConfig: config } = t.context;

  await writeFile(join(tmp, "content.js"), contentfile);
  const linguiConfig = await getLinguiConfig({ cwd: tmp, config });
  await linguiExtract({ linguiConfig, cwd: tmp, hideStats: true });
  await linguiCompile({ linguiConfig, config });

  await app.register(plugin, { cwd: tmp, locale: "en-US" });

  const messages = await app.readTranslations();

  t.equal("My message", messages["my.id"]);
});
