import { test, beforeEach } from "tap";
import fastify from "fastify";
import Podlet from "@podium/podlet";
import plugin from "../../plugins/manifest.js";

beforeEach(async (t) => {
  t.context.app = fastify({ logger: false });
});

test("manifest route served", async (t) => {
  const { app } = t.context;
  const podlet = new Podlet({ name: "my-podlet", version: "1.0.0", pathname: "/" });
  await app.register(plugin, { podlet });
  const address = await app.listen({ port: 0 });
  const result = await fetch(`${address}/manifest.json`);
  const manifest = await result.json();
  t.same(manifest, {
    name: "my-podlet",
    version: "1.0.0",
    content: "/",
    fallback: "",
    css: [],
    js: [],
    proxy: {},
  });
  await app.close();
});
