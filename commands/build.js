import configuration from "../lib/config.js";
import { Local } from "../lib/resolvers/local.js";
import { Core } from "../lib/resolvers/core.js";
import { Extensions } from "../lib/resolvers/extensions.js";
import { build } from "../api/build.js";
import { State } from "../lib/state.js";

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

  const state = new State({ cwd });
  state.set("core", await Core.load());
  state.set("extensions", await Extensions.load({ cwd, development: true }));
  state.set("local", await Local.load({ cwd, development: true }));

  const config = await configuration({ cwd, schemas: await state.config() });

  await build({ state, config, cwd });
};
