import fp from "fastify-plugin";

export default fp(async function lazyScriptPlugin(fastify, { enabled, base }) {
  // inject live reload when in dev mode
  if (enabled) {
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
              `<script type="module">addEventListener('load',()=>import('${base}/client/lazy.js'))</script></body>`
            );
          } else {
            // if no document, inject at the end of the payload
            newPayload = `${payload}<script type="module">addEventListener('load',()=>import('${base}/client/lazy.js'))</script>`;
          }
        }
      }
      done(null, newPayload);
    });
  }
});
