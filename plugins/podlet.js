import { readFileSync } from 'node:fs';
import { SemVer } from 'semver';
import Podlet from '@podium/podlet';
import fastifyPodletPlugin from '@podium/fastify-podlet';
import fp from 'fastify-plugin';

export default fp(
  /**
   * @param {import('fastify').FastifyInstance} fastify
   * @param {object} options
   * @param {string} [options.name]
   * @param {string} [options.pathname]
   * @param {string} [options.version]
   * @param {string} [options.manifest]
   * @param {string} [options.content]
   * @param {string} [options.fallback]
   * @param {any} [options.development]
   */
  async (
    fastify,
    { name, version, pathname, manifest, content, fallback, development },
  ) => {
    // @ts-ignore
    const podlet = new Podlet({
      name,
      version,
      pathname,
      manifest,
      content,
      fallback,
      development,
      logger: fastify.log,
    });
    fastify.decorate('podlet', podlet);
    fastify.register(fastifyPodletPlugin, podlet);

    const packageJson = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), {
        encoding: 'utf8',
      }),
    );
    const podiumVersion = new SemVer(
      packageJson.dependencies['@podium/podlet']
        .replace('^', '')
        .replace('~', ''),
    );

    fastify.get(podlet.manifest(), async (request, reply) => {
      // enable timing metrics for this route
      // @ts-ignore
      reply.context.config.timing = true;
      reply.type('application/json');
      return JSON.stringify(podlet);
    });

    /**
     * Generate a metric for which major version of the Podium podlet is being run
     * Metric is pushed into the podlet metrics stream which is then collected
     */
    // @ts-ignore
    const gauge = podlet.metrics.gauge({
      name: 'active_podlet',
      description: 'Indicates if a podlet is mounted and active',
      labels: { podium_version: podiumVersion.major, podlet_name: name },
    });
    setImmediate(() => gauge.set(1));

    // @ts-ignore
    if (!fastify.metricStreams) {
      fastify.decorate('metricStreams', []);
    }

    // @ts-ignore
    fastify.metricStreams.push(podlet.metrics);

    if (development) {
      // wrap the markup in a podlet render call to get templating when in dev mode
      fastify.addHook(
        'onSend',
        (request, reply, /** @type {string} */ payload, done) => {
          let newPayload = payload;
          const contentType = reply.getHeader('content-type') || '';
          if (typeof contentType === 'string') {
            if (contentType.includes('html')) {
              // @ts-ignore
              newPayload = podlet.render(reply.app.podium, payload);
            }
          }
          done(null, newPayload);
        },
      );
    }

    // set up scriptsList for other plugins to add scripts to
    // @ts-ignore
    if (!fastify.scriptsList) {
      fastify.decorate('scriptsList', []);
    }

    // process metrics streams at the end
    fastify.addHook('onReady', async () => {
      // @ts-ignore
      if (!fastify.scriptsList) return;

      // @ts-ignore
      podlet.js(fastify.scriptsList);
    });
  },
);
