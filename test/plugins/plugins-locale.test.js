import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { test, beforeEach, afterEach } from "tap";
import fastify from "fastify";
import plugin from "../../plugins/locale.js";

const tmp = join(tmpdir(), "./plugins-locale.test.js");

beforeEach(async (t) => {
  await mkdir(tmp);
  await mkdir(join(tmp, "locale"));
  await writeFile(join(tmp, "locale", "en.json"), JSON.stringify({ key: "english value" }));
  await writeFile(join(tmp, "locale", "no.json"), JSON.stringify({ key: "norsk verdi" }));
    t.context.app = fastify({ logger: false });
});

test("English translation file added to fastify object", async (t) => {
  const { app } = t.context;
  await app.register(plugin, { cwd: tmp, locale: "en" });
  t.same(app.translations, { key: "english value" });
  await rm(tmp, { recursive: true, force: true });
});

test("Norwegian translation file added to fastify object", async (t) => {
  const { app } = t.context;
  await app.register(plugin, { cwd: tmp, locale: "no" });
  t.same(app.translations, { key: "norsk verdi" });
  await rm(tmp, { recursive: true, force: true });
});
