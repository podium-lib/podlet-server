import { start } from "../api/start.js"
import configuration from "../lib/config.js";
import loadExtensions from "../lib/load-extensions.js";

export const command = "start";

export const aliases = ["s"];

export const describe = `Starts the app in production mode`;

export const builder = (yargs) => {
  yargs.example("podlet start");

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
  const config = await configuration({ cwd });
  await start({ config, extensions, cwd });
};
