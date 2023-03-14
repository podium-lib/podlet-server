import { test, beforeEach } from "tap";
import fastify from "fastify";
import podletPlugin from "../../plugins/podlet.js";
import metricsPlugin from "../../plugins/metrics.js";

beforeEach(async (t) => {
  t.context.app = fastify({ logger: false });
});

test("metrics from other plugins gathered up and exposed on .metrics", async (t) => {
    t.plan(4)
    const { app } = t.context;
    await app.register(podletPlugin, { name: "my-podlet", version: "1.0.0", pathname: "/" });
    await app.register(metricsPlugin);
    t.equal(app.metricStreams.length, 1);
    const gatheredMetrics = [];
    app.metrics.on("data", (metric) => {
        gatheredMetrics.push(metric);
    });
    app.metrics.on("end", () => {
        t.equal(gatheredMetrics.length, 2, "there should be 2 metrics created");
        t.equal(gatheredMetrics[0].name, "podium_podlet_version_info", "metric should have correct name");
        t.equal(gatheredMetrics[1].name, "active_podlet", "metric should have correct name");
        t.end();
    })
    await app.listen({ port: 0 });
    app.metrics.push(null);
    await app.close();
});
