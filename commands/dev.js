import { dev } from "../api/dev.js";
import configuration from "../lib/config.js";
import { Extensions } from "../lib/extensions/extensions.js";

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
  const extensions = await Extensions.load(cwd);
  const config = await configuration({
    additionalSchemas: extensions.config(),
    cwd,
  });
  await dev({ extensions, config, cwd });
};
