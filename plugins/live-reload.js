// @ts-ignore
import chokidar from "chokidar";
import fp from "fastify-plugin";
import etag from "@fastify/etag";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";

const watch = [
  "content.js",
  "content.ts",
  "fallback.js",
  "fallback.ts",
  "scripts.js",
  "scripts.ts",
  "lazy.js",
  "lazy.ts",
  "client/**/*.js",
  "client/**/*.ts",
  "lib/**/*.js",
  "lib/**/*.ts",
  "src/**/*.js",
  "src/**/*.ts",
  "locales/**/*.po",
];

function buildUrlPath(path) {
  return path.replaceAll(/\/+/g, "/");
}

export default fp(
  async (fastify, { cwd = process.cwd(), development, port, prefix = "/" }, next) => {
    if (!development) return next();

    const liveReloadServerPath = buildUrlPath(`/${prefix}/_/live/reload`);
    const liveReloadClientPath = buildUrlPath(`/${prefix}/_/live/client`);

    await fastify.register(etag, {
      algorithm: "fnv1a",
    });

    await fastify.register(cors);
    await fastify.register(websocket);

    const wss = fastify.websocketServer;

    function onFileChange() {
      wss.clients.forEach((client) => {
        client.send("update", () => {
          // Something went wrong....
        });
      });
    }

    wss.on("connection", (ws) => {
      fastify.log.debug("live reload - server got connection from browser");

      ws.isAlive = true;

      ws.on("pong", () => {
        ws.isAlive = true;
      });

      ws.on("error", (error) => {
        fastify.log.debug("live reload - connection to browser errored");
        fastify.log.error(error);
      });
    });

    const pingpong = setInterval(() => {
      wss.clients.forEach((client) => {
        if (client.isAlive === false) return client.terminate();
        client.isAlive = false;
        client.ping(() => {
          // noop
        });
      });
    }, 30000);

    wss.on("close", () => {
      fastify.log.debug("live reload - server closed");
      clearInterval(pingpong);
    });

    const watcher = chokidar.watch(watch, {
      persistent: true,
      followSymlinks: false,
      cwd,
    });

    watcher.on("ready", () => {
      watcher.on("change", onFileChange);
      watcher.on("add", onFileChange);
      watcher.on("unlink", onFileChange);
    });

    watcher.on("error", (error) => {
      fastify.log.debug("live reload - file watching errored");
      fastify.log.error(error);
    });

    async function cleanup() {
      await watcher.close();
    }

    fastify.addHook("onClose", cleanup);

    fastify.get("/_/live/reload", { websocket: true }, (connection, request) => {});

    fastify.get("/_/live/client", (request, reply) => {
      reply.type("application/javascript");
      reply.send(`(() => {
const livereload = () => {
  const ws = new WebSocket('ws://localhost:${port}${liveReloadServerPath}');
  ws.addEventListener("message", (event) => {
    if (event.data === 'update') {
      window.location.reload(true);
    }
  });
  ws.addEventListener("close", () => {
    setTimeout(() => {
      livereload();
    }, 1000);
  });
  ws.addEventListener("error", () => {
    ws.close();
  });
};
livereload();
})()`);
    });

    fastify.addHook("onSend", (request, reply, /** @type {string} */ payload, done) => {
      let newPayload = payload;
      const contentType = reply.getHeader("content-type") || "";
      if (typeof contentType === "string") {
        // only inject live reload if the content type is html
        if (contentType.includes("html")) {
          // if there is a document, inject before closing body
          // @ts-ignore
          if (payload.includes("</body>")) {
            newPayload = payload.replace(
              "</body>",
              `<script src="http://localhost:${port}${liveReloadClientPath}" type="module"></script></body>`
            );
          } else {
            // if no document, inject at the end of the payload
            newPayload = `${payload}<script src="http://localhost:${port}${liveReloadClientPath}" type="module"></script>`;
          }
        }
      }
      done(null, newPayload);
    });

    next();
  },
  {
    name: "plugin-live-reload",
  }
);
