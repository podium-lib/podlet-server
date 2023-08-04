import configuration from '../lib/config.js';
import { Local } from '../lib/resolvers/local.js';
import { Core } from '../lib/resolvers/core.js';
import { Extensions } from '../lib/resolvers/extensions.js';
import { State } from '../lib/state.js';
import { i18n } from '../api/i18n.js';

export const command = 'i18n <command>';

export const aliases = ['i'];

const [extract, compile] = ['extract', 'compile'];

export const describe = 'Extract and compile i18n strings for the podlet.';

export const builder = (yargs) => {
  yargs.example('podlet i18n [command]');

  yargs.positional('command', {
    type: 'string',
    default: extract,
    choices: [extract, compile],
    describe: 'i18n command to run',
  });

  return yargs.argv;
};

export const handler = async (argv) => {
  const { command: commandArgument } = argv;
  const cwd = process.cwd();

  const state = new State({ cwd, development: true });
  state.set('core', await Core.load());
  state.set('extensions', await Extensions.load({ cwd }));
  state.set('local', await Local.load({ cwd, development: true }));

  const config = await configuration({ cwd, schemas: await state.config() });

  await i18n({ cmd: commandArgument, config, cwd });
};
