import fp from 'fastify-plugin';
import { joinURLPathSegments } from '../lib/utils.js';

export default fp(async (fastify, { enabled, base, development, prefix }) => {
  // inject live reload when in dev mode
  if (enabled) {
    fastify.log.debug('custom client side scripting enabled');

    const url = development
      ? joinURLPathSegments(prefix, `/_/dynamic/files/scripts.js`)
      : joinURLPathSegments(base, `/client/scripts.js`);

    // @ts-ignore
    fastify.scriptsList.push({ value: url, type: 'module' });
    // fastify.addHook(
    //   'onSend',
    //   (request, reply, /** @type {string} */ payload, done) => {
    //     let newPayload = payload;
    //     const contentType = reply.getHeader('content-type') || '';
    //     if (typeof contentType === 'string') {
    //       // only inject live reload if the content type is html
    //       if (contentType.includes('html')) {
    //         // if there is a document, inject before closing body
    //         const url = development
    //           ? joinURLPathSegments(prefix, `/_/dynamic/files/scripts.js`)
    //           : joinURLPathSegments(base, `/client/scripts.js`);

    //         if (payload.includes('</body>')) {
    //           newPayload = payload.replace(
    //             '</body>',
    //             `<script type="module" src="${url}"></script></body>`,
    //           );
    //         } else {
    //           // if no document, inject at the end of the payload
    //           newPayload = `${payload}<script type="module" src="${url}"></script>`;
    //         }
    //       }
    //     }
    //     done(null, newPayload);
    //   },
    // );
  }
});
