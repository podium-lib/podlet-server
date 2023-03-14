import { test, beforeEach } from "tap";
import fastify from "fastify";
import plugin from "../../plugins/podlet.js";

beforeEach(async (t) => {
  t.context.app = fastify({ logger: false });
});

test("podlet instance created", async (t) => {
  const { app } = t.context;
  await app.register(plugin, { name: "my-podlet", version: "1.0.0", pathname: "/" });
  t.same(app.podlet.toJSON(), {
    name: "my-podlet",
    version: "1.0.0",
    content: "/",
    fallback: "",
    css: [],
    js: [],
    proxy: {},
  });
});

test("metrics stream exposed", async (t) => {
    const { app } = t.context;
    await app.register(plugin, { name: "my-podlet", version: "1.0.0", pathname: "/" });
    t.equal(app.metricStreams.length, 1);
});

test("metrics stream contains a podlet version gauge metric", async (t) => {
    t.plan(3)
    const { app } = t.context;
    await app.register(plugin, { name: "my-podlet", version: "1.0.0", pathname: "/" });
    const gatheredMetrics = [];
    app.metricStreams[0].on("data", (metric) => {
        gatheredMetrics.push(metric);
    });
    await app.listen({ port: 0 });
    app.metricStreams[0].on("end", () => {
        t.equal(gatheredMetrics.length, 2, "there should be 2 metrics created");
        t.equal(gatheredMetrics[0].name, "podium_podlet_version_info", "metric should have correct name");
        t.equal(gatheredMetrics[1].name, "active_podlet", "metric should have correct name");
        t.end();
    })
    app.metricStreams[0].push(null);
    await app.close();
});