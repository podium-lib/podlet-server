import configuration from "../lib/config.js";
import { Local } from "../lib/local.js";
import { Core } from "../lib/core.js";
import { Extensions } from "../lib/extensions/extensions.js";
import { start } from "../api/start.js";

import { dev } from "../api/dev.js";

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

  const core = await Core.load();
  const extensions = await Extensions.load(cwd);
  const local = await Local.load(cwd);
  const config = await configuration({ cwd, schemas: [...core.config, ...extensions.config, ...local.config] });

  await dev({ core, extensions, local, config, cwd });
};
