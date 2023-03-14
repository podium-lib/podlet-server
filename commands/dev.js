import { dev } from "../api/dev.js"
import configuration from "../lib/config.js";

export const command = "dev";

export const aliases = ["d"];

export const describe = `Build and start the app, watch for file changes (live reload).`;

export const builder = (yargs) => {
  yargs.example("podlet dev");

  yargs.options({
    cwd: {
      describe: `Alter the current working directory. Defaults to the directory where the command is being run.`,
      default: process.cwd(),
    }
  });

  return yargs.argv;
};

export const handler = async (argv) => {
  const { cwd } = argv;
  const config = await configuration({ cwd });
  await dev({ config, cwd });
};
