import fp from 'fastify-plugin';
import etag from '@fastify/etag';
import cors from '@fastify/cors';
import { joinURLPathSegments } from '../lib/utils.js';

const clideSideScript = (port) => `(() => {
  const livereload = () => {
    const host = window.location.hostname;
    const ws = new WebSocket(\`ws://\${host}:${port}\`);
    ws.addEventListener("message", (event) => {
      if (event.data === 'update') {
        console.debug("live reload update, reloading page");
        // short timeout seems to avoid intermittent page reload failures
        setTimeout(() => {
          window.location.reload(true);
        }, 50);
      }
    });
    ws.addEventListener("close", () => {
      console.debug("live reload socket closed, reconnecting in 1s");
      setTimeout(() => {
        livereload();
      }, 1000);
    });
    ws.addEventListener("error", () => {
      console.debug("live reload error detected, closing socket");
      ws.close();
    });
  };
  livereload();
})()`;

export default fp(
  /**
   * @param {import('fastify').FastifyInstance} fastify
   * @param {object} options
   * @param {number} [options.port]
   * @param {string} [options.prefix]
   * @param {boolean} [options.development]
   * @param {any} [options.clientWatcher]
   * @param {any} [options.webSocketServer]
   * @param {any} [options.webSocketServerPort]
   */
  async (
    fastify,
    {
      development,
      port,
      prefix = '/',
      clientWatcher,
      webSocketServer,
      webSocketServerPort,
    },
  ) => {
    if (!development) return;

    const liveReloadClientPath = joinURLPathSegments(prefix, `/_/live/client`);

    await fastify.register(etag, {
      algorithm: 'fnv1a',
    });

    // in case podlet is being used with a layout
    await fastify.register(cors);

    function onFileChange() {
      webSocketServer.clients.forEach((client) => {
        client.send('update');
      });
    }

    if (clientWatcher) {
      clientWatcher.on('change', onFileChange);
      clientWatcher.on('add', onFileChange);
      clientWatcher.on('unlink', onFileChange);

      fastify.addHook('onReady', () => {
        onFileChange();
      });
    }

    // ensure we dont get 503s when using live reload
    fastify.addHook('onSend', (req, reply, payload, done) => {
      reply.header('connection', 'close');
      done();
    });

    fastify.get('/_/live/client', (request, reply) => {
      reply.type('application/javascript');
      reply.send(clideSideScript(webSocketServerPort));
    });

    fastify.addHook(
      'onSend',
      (request, reply, /** @type {string} */ payload, done) => {
        let newPayload = payload;
        const contentType = reply.getHeader('content-type') || '';
        if (typeof contentType === 'string') {
          // only inject live reload if the content type is html
          if (contentType.includes('html')) {
            // if there is a document, inject before closing body
            // @ts-ignore
            if (payload.includes('</body>')) {
              newPayload = payload.replace(
                '</body>',
                `<script src="http://localhost:${port}${liveReloadClientPath}" type="module"></script></body>`,
              );
            } else {
              // if no document, inject at the end of the payload
              newPayload = `${payload}<script src="http://localhost:${port}${liveReloadClientPath}" type="module"></script>`;
            }
          }
        }
        done(null, newPayload);
      },
    );
  },
);
