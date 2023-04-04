import configuration from "../lib/config.js";
import { Local } from "../lib/local.js";
import { Core } from "../lib/core.js";
import { Extensions } from "../lib/extensions/extensions.js";
import { build } from "../api/build.js";

export const command = "build";

export const aliases = ["b"];

export const describe = `Build the app into the ./dist folder for production.`;

export const builder = (yargs) => {
  yargs.example("podlet build");

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
  const local = await Local.load({ cwd });
  const config = await configuration({ cwd, schemas: [...core.config, ...extensions.config, ...local.config] });

  await build({ core, extensions, local, config, cwd });
};
