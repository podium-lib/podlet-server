#!/usr/bin/env node

"use strict";

import { readFileSync } from "fs";
import chalk from "chalk";
import yargs from "yargs";
import boxen from "boxen";
import * as commands from "./commands/index.js";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), { encoding: "utf8" }));
const greeting = chalk.white.bold(`Podium Podlet Server (v${version})`);
const args = process.argv.slice(2);

const msgBox = boxen(greeting, { padding: 0.5 });
console.clear();
!args.includes("start") && console.log(msgBox);

yargs(args)
  .command(commands.build)
  .command(commands.start)
  .command(commands.dev)
  .command(commands.i18n)
  .example("podlet build", "Builds the podlet ready for production use")
  .example("podlet start", "Serves the podlet in production")
  .example("podlet dev", "Builds and serves the podlet in development mode")
  .example("podlet i18n [command]", "Handles extraction and compilation of messages")
  .demandCommand()
  .wrap(150)
  .version(false)
  .help().argv;
