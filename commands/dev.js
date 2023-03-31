import { dev } from "../api/dev.js";
import configuration from "../lib/config.js";
import loadExtensions from "../lib/load-extensions.js";

export const command = "dev";

export const aliases = ["d"];

export const describe = `Build and start the app, watch for file changes (live reload).`;

export const builder = (yargs) => {
  yargs.example("podlet dev");

  yargs.options({
    cwd: {
      describe: `Alter the current working directory. Defaults to the directory where the command is being run.`,
      default: process.cwd(),
    },
  });

  return yargs.argv;
};

export const handler = async (argv) => {
  const { cwd } = argv;
  const extensions = await loadExtensions({ cwd });
  const config = await configuration({
    additionalSchemas: extensions.configSchemas.map(schema => schema.resolvedFile),
    cwd,
  });
  await dev({ extensions, config, cwd });
};
