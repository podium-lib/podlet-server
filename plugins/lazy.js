import fp from 'fastify-plugin';
import { joinURLPathSegments } from '../lib/utils.js';

export default fp(
  async (fastify, { enabled, prefix = '/', base, development = false }) => {
    // inject live reload when in dev mode
    if (enabled) {
      const url = development
        ? joinURLPathSegments(prefix, `/_/dynamic/files/lazyload/lazy.js`)
        : joinURLPathSegments(base, `/client/lazy.js`);

      // @ts-ignore
      fastify.scriptsList.push({ value: url, type: 'module' });

      // fastify.addHook(
      //   'onSend',
      //   (request, reply, /** @type {string} */ payload, done) => {
      //     let newPayload = payload;
      //     const contentType = reply.getHeader('content-type') || '';
      //     if (typeof contentType === 'string') {
      //       // only inject lazy if the content type is html
      //       if (contentType.includes('html')) {
      //         // if there is a document, inject before closing body
      //         const url = development
      //           ? joinURLPathSegments(prefix, `/_/dynamic/files/lazy.js`)
      //           : joinURLPathSegments(base, `/client/lazy.js`);

      //         if (payload.includes('</body>')) {
      //           newPayload = payload.replace(
      //             '</body>',
      //             `<script type="module">addEventListener('load',()=>import('${url}'))</script></body>`,
      //           );
      //         } else {
      //           // if no document, inject at the end of the payload
      //           newPayload = `${payload}<script type="module">addEventListener('load',()=>import('${url}'))</script>`;
      //         }
      //       }
      //     }
      //     done(null, newPayload);
      //   },
      // );
    }
  },
);
