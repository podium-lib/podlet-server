import pretty from "pino-pretty";
import chalk from "chalk";

// function to colorise status code
const coloriseStatusCode = (statusCode) => {
  if (statusCode >= 500) {
    return chalk.red(statusCode);
  } else if (statusCode >= 400) {
    return chalk.blue(statusCode);
  } else if (statusCode >= 300) {
    return chalk.cyan(statusCode);
  } else if (statusCode >= 200) {
    return chalk.green(statusCode);
  }
  return chalk.gray(statusCode);
};

// function to colorise response times
const coloriseResponseTime = (responseTime) => {
  if (responseTime >= 500) {
    return chalk.red(`${Math.round(Number(responseTime))} ms`);
  } else if (responseTime >= 100) {
    return chalk.yellow(`${Math.round(Number(responseTime))} ms`);
  }
  return chalk.green(`${Math.round(Number(responseTime))} ms`);
};

/**
 * @typedef {{ level: number, err: { type: string, message: string, stack: string }, req: { method: string, url: string, hostname: string }, res: { statusCode: number }, reqId: number, time: number, pid: number, responseTime: number, url: string }} LogObject
 */

const logDefaults = {
  level: null,
  err: null,
  req: {
    method: "",
    url: "",
    hostname: "",
  },
  res: {
    statusCode: null,
  },
  url: null,
  reqId: null,
  time: null,
  pid: null,
  responseTime: null,
};

export default (options) =>
  pretty({
    ...options,
    ignore: "pid,hostname,time,level",
    // customColors: 'err:red,info:blue,debug:cyan',
    // useOnlyCustomProps: true,
    colorize: false,
    singleLine: true,
    hideObject: true,

    /**
     * Formats log objects into a single line
     * @param {LogObject} log
     * @param {string} messageKey
     * @returns {string}
     */
    messageFormat(log, messageKey) {
      const { req, res, reqId, responseTime, level } = log || logDefaults;
      const { method, url } = req || logDefaults.req;
      const { statusCode } = res || logDefaults.res;

      const msg = log[messageKey];
      let message;

      if (method) {
        // request
        message = `[${chalk.cyan(reqId)}] ${method} ${chalk.cyan(url)}`;
      } else if (log.url && msg === "server listening") {
        // handle server listening msg
        message = `🖥️  ${msg} on ${chalk.magenta(log.url)}`;
      } else if (statusCode) {
        // response
        message = `[${chalk.cyan(reqId)}] ${coloriseStatusCode(statusCode)} (${coloriseResponseTime(responseTime)})`;
      } else {
        message = `${msg}`;
      }

      // fatal
      if (level === 60) {
        const err = log.err ? `${chalk.bold.red(JSON.stringify(log.err, null, 2))}\n` : "";
        return `${chalk.bold.red(`[FATAL] ${message}`)}\n${err}`;
      } 
      // error
      else if (level === 50) {
        const err = log.err ? `${chalk.red(JSON.stringify(log.err, null, 2))}\n` : "";
        return `${chalk.red(`[ERROR] ${message}`)}\n${err}`;
      } 
      // warn
      else if (level === 40) {
        return `${chalk.yellow(message)}\n`;
      } 
      // info
      else if (level === 30) {
        return `${chalk.blue(message)}\n`;
      } 
      // debug
      else if (level === 20) {
        return `${message}\n`;
      } 
      // trace
      else if (level === 10) {
        return `${message}\n`;
      }

      else {
        return `${message}\n`;
      }
    },
  });
