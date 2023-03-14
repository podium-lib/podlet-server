import { build } from "../api/build.js";
import configuration from "../lib/config.js";

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
  const config = await configuration({ cwd });
  await build({ config, cwd });
};
