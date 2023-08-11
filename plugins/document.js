import fp from 'fastify-plugin';
import chalk from 'chalk';
import PathResolver from '../lib/path.js';

/**
 * @typedef {{ podlet: import("@podium/podlet").default, cwd: string, development: boolean, extensions?: import("../lib/resolvers/extensions").Extensions }} DocumentPluginOptions
 */

export default fp(
  async (
    fastify,
    /** @type {DocumentPluginOptions} */
    { podlet, cwd, development, extensions },
  ) => {
    let documentFile;

    // last extension in wins
    let extensionName;
    for (const extension of extensions || []) {
      documentFile = extension.document;
      extensionName = extension.meta.name;
    }
    // check if document.js or document.ts are present in cwd
    // if so, first transpile document.ts file (if present) to .js file and then load/read document.js and register it as a podlet view
    // if not, do nothing
    const resolver = new PathResolver({ cwd, development });
    const appDocumentFile = await resolver.resolve('./document');
    if (appDocumentFile.exists) {
      try {
        documentFile = (await resolver.import('./document')).default;
        fastify.log.debug(
          `📄 ${chalk.magenta(
            'document template',
          )}: loaded file ${appDocumentFile.path.replace(cwd, '')}`,
        );
      } catch (err) {
        fastify.log.fatal(
          err,
          `document.js file located but could not be loaded.`,
        );
      }
    } else if (documentFile) {
      fastify.log.debug(
        `📄 ${chalk.magenta(
          'document template',
        )}: loaded file from extension ${extensionName}`,
      );
    }

    if (documentFile) {
      podlet.view(documentFile);
    }
  },
);
