import fp from 'fastify-plugin';

import assert from 'node:assert';
import abslog from 'abslog';
import Metrics from '@metrics/client';

const timeout = Symbol('timeout');
const uncaughtException = Symbol('uncaughtException');
const unhandledRejection = Symbol('unhandledRejection');
const SIGINT = Symbol('SIGINT');
const SIGTERM = Symbol('SIGTERM');
const SIGHUP = Symbol('SIGHUP');
const processWarn = Symbol('processWarn');
const processDeprecation = Symbol('processDeprecation');
const registerProcessHandlers = Symbol('registerProcessHandlers');
const unregisterProcessHandlers = Symbol('unregisterProcessHandlers');

class ProcessExceptionHandlers {
  constructor(logger) {
    this.logger = abslog(logger);
    this.deathrow = [];
    this[timeout] = 6000;
    this.terminating = false;
    this.exitCodeToUse = 0;
    this.shutdownInitiated = null;
    this.metrics = new Metrics();

    this.uncaughtExceptionCounter = this.metrics.counter({
      name: 'process_exception_handlers_uncaught_exception_count',
      description: 'Count for number of uncaught exceptions',
    });

    this.unhandledRejectionCounter = this.metrics.counter({
      name: 'process_exception_handlers_unhandled_rejection_count',
      description: 'Count for number of unhandled rejections',
    });

    this.sigintCounter = this.metrics.counter({
      name: 'process_exception_handlers_sigint_count',
      description: 'Count for number of sigints',
    });

    this.sigtermCounter = this.metrics.counter({
      name: 'process_exception_handlers_sigterm_count',
      description: 'Count for number of sigterms',
    });

    this.processWarnCounter = this.metrics.counter({
      name: 'process_exception_handlers_warn_count',
      description: 'Count for number of process warnings',
    });

    this.processDeprecationCounter = this.metrics.counter({
      name: 'process_exception_handlers_deprecation_count',
      description: 'Count for number of process deprecations',
    });

    this.terminateTimer = this.metrics.histogram({
      name: 'process_exception_handlers_terminate_timer',
      description: 'Time taken to terminate',
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 10],
    });

    this.shutdownTimer = this.metrics.histogram({
      name: 'process_exception_handlers_shutdown_timer',
      description: 'Time taken to shutdown server',
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 10],
    });

    this.uncaughtExceptionHandler = this[uncaughtException].bind(this);
    this.unhandledRejectionHandler = this[unhandledRejection].bind(this);
    this.sigintHandler = this[SIGINT].bind(this);
    this.sigtermHandler = this[SIGTERM].bind(this);
    this.sighupHandler = this[SIGHUP].bind(this);
    this.processWarnHandler = this[processWarn].bind(this);
    this.processDeprecationHandler = this[processDeprecation].bind(this);

    this[registerProcessHandlers]();
  }

  [registerProcessHandlers]() {
    process.on('uncaughtException', this.uncaughtExceptionHandler);
    process.on('unhandledRejection', this.unhandledRejectionHandler);
    process.on('SIGINT', this.sigintHandler);
    process.on('SIGTERM', this.sigtermHandler);
    process.on('SIGHUP', this.sighupHandler);
    process.on('warning', this.processWarnHandler);
    process.on('deprecation', this.processDeprecationHandler);
  }

  [unregisterProcessHandlers]() {
    process.removeListener('uncaughtException', this.uncaughtExceptionHandler);
    process.removeListener(
      'unhandledRejection',
      this.unhandledRejectionHandler,
    );
    process.removeListener('SIGINT', this.sigintHandler);
    process.removeListener('SIGTERM', this.sigtermHandler);
    process.removeListener('SIGHUP', this.sighupHandler);
    process.removeListener('warning', this.logger.warn);
    process.removeListener('deprecation', this.logger.warn);
  }

  /**
   * Intercept uncaught exceptions and terminate the server process with
   * an error code of 1.
   */
  [uncaughtException](err) {
    this.logger.fatal(
      'global uncaught exception - terminating with error.',
      err,
      { extras: err.stack },
    );

    this.uncaughtExceptionCounter.inc();

    this.terminate(1);
  }

  /**
   * Intercept unhandled promise rejections and terminate the server process
   * with an error code of 1.
   */
  [unhandledRejection](err) {
    this.logger.fatal(
      'global uncaught promise rejection - terminating with error.',
      err,
      { extras: err.stack },
    );

    this.unhandledRejectionCounter.inc();

    this.terminate(1);
  }

  /**
   * Listener for SIGINT, terminates the server process
   * with an error code of 0
   * SIGINT can be sent with ctrl+c
   */
  [SIGINT]() {
    this.logger.info('shutdown - got SIGINT - terminating gracefully');

    this.sigintCounter.inc();

    this.terminate(0);
  }

  /**
   * Listener for SIGTERM, terminates the server process
   * with an error code of 0
   * SIGTERM can be triggered by upstart.
   */
  [SIGTERM]() {
    this.logger.info('shutdown - got SIGTERM - terminating gracefully');

    this.sigtermCounter.inc();

    this.terminate(0);
  }

  /**
   * Listener for SIGHUP, terminates the server process
   * with an error code of 0
   * SIGHUP can be triggered the controlling terminal being closed.
   */
  [SIGHUP]() {
    this.logger.info('shutdown - got SIGHUP - terminating gracefully');

    this.metrics.metric({
      name: 'process_exception_handlers_sighup_count',
      description: 'Count for number of sighups',
    });

    this.terminate(0);
  }

  /**
   * Listen for and log node.js process warnings
   */
  [processWarn](...args) {
    this.logger.warn(...args);

    this.processWarnCounter.inc();
  }

  /**
   * Listen for and log depd process warnings
   *
   * https://www.npmjs.com/package/depd
   */
  [processDeprecation](...args) {
    this.logger.warn(...args);

    this.processDeprecationCounter.inc();
  }

  /**
   * Append a function to the termination list.
   *
   * @param {Function} callback Function to be run upon termination
   * @returns {Number} Id of the function in the termination registry
   */
  set(callback) {
    assert(
      {}.toString.call(callback) === '[object Function]' ||
        {}.toString.call(callback) === '[object AsyncFunction]',
      'Attribute "callback" must be a function',
    );
    const index = this.deathrow.push(callback);
    return index - 1;
  }

  /**
   * Remove a function from the termination registry.
   *
   * @param {Number} id Id of the function in the termination registry
   * @returns {Number} Number of functions in the termination registry (including removed once)
   */
  remove(id) {
    if (id >= this.deathrow.length) {
      return -1;
    }
    this.deathrow[id] = null;
    return this.deathrow.length;
  }

  /**
   * Set a new timeout.
   * NOTE: If set to 0, timeout will be omitted. If one of the functions in
   * the termination list does not terminate, the shutdown process can halt.
   *
   * @param {Number} time Timeout in milliseconds
   * @returns {Number} The new timeout
   */
  timeout(time) {
    this[timeout] = time;
    return this[timeout];
  }

  /**
   * Execute all functions in the termination registry.
   *
   * @param {Number} exitCode Exit code to exit with on completion. `1` will be used on timeouts
   * @param {Function} [exiter] Optional callback on exit. Will be invoked with exitCode
   */
  terminate(exitCode = this.exitCodeToUse, exiter = process.exit) {
    if (this.terminating && exitCode === this.exitCodeToUse) {
      this.logger.info(`Already terminating with exitCode ${exitCode}`);
      return;
    }

    if (exitCode === 1) {
      this.exitCodeToUse = 1;

      if (
        this.terminating &&
        // @ts-ignore
        Date.now() - this.shutdownInitiated < 2000
      ) {
        return;
      }

      this.logger.error('Exiting with status 1 in 2 seconds.');

      setTimeout(() => {
        process.exitCode = 1;
        process.nextTick(() => {
          this[unregisterProcessHandlers]();

          this.terminateTimer.observe(
            // @ts-ignore
            Date.now() - this.shutdownInitiated,
            { labels: { exitCode: 1, timeout: false } },
          );

          exiter(1);
        });
      }, 2000);
    }

    if (this.terminating) {
      this.logger.info('Already terminating');
      return;
    }

    this.terminating = true;
    if (this.deathrow.length === 0) {
      process.exitCode = this.exitCodeToUse;
      process.nextTick(() => {
        this[unregisterProcessHandlers]();

        this.metrics.metric({
          name: 'process_exception_handlers_terminate_timer',
          description: 'Time taken to terminate',
          // @ts-ignore
          time: Date.now() - this.shutdownInitiated,
          meta: { exitCode: this.exitCodeToUse, timeout: false },
        });

        this.terminateTimer.observe(
          // @ts-ignore
          Date.now() - this.shutdownInitiated,
          {
            labels: {
              exitCode: this.exitCodeToUse,
              timeout: false,
            },
          },
        );

        exiter(this.exitCodeToUse);
      });
      return;
    }

    // Mostly for tests
    let exited = false;

    this.shutdownInitiated = Date.now();

    const id =
      this[timeout] === 0
        ? this[timeout]
        : setTimeout(() => {
            exited = true;
            this.logger.error(`Termination timed out in ${this[timeout]}.`);

            process.exitCode = 1;
            process.nextTick(() => {
              this[unregisterProcessHandlers]();

              this.terminateTimer.observe(this[timeout], {
                labels: { exitCode: 1, timeout: true },
              });

              exiter(1);
            });
          }, this[timeout]);

    let counter = this.deathrow.length;
    const resolver = () => {
      counter -= 1;
      if (counter <= 0) {
        clearTimeout(id);

        if (exited) {
          return;
        }

        process.exitCode = this.exitCodeToUse;
        process.nextTick(() => {
          this[unregisterProcessHandlers]();

          this.terminateTimer.observe(
            // @ts-ignore
            Date.now() - this.shutdownInitiated,
            {
              labels: {
                exitCode: this.exitCodeToUse,
                timeout: false,
              },
            },
          );

          exiter(this.exitCodeToUse);
        });
      }
    };

    this.deathrow.forEach((cb) => {
      try {
        cb(resolver, this.exitCodeToUse === 1);
      } catch (e) {
        this.logger.error('Got error when invoking shutdown callback', e);
        resolver();
      }
    });
  }

  functionOnExit(func, server, options) {
    assert(
      {}.toString.call(server[func]) === '[object Function]' ||
        {}.toString.call(server[func]) === '[object AsyncFunction]',
      `server must have a '${func}' function`,
    );

    const grace =
      options && typeof options.grace === 'number' ? options.grace : 5000;

    const shutdown = (done) => {
      const hrtime = process.hrtime();
      this.logger.info('Closing down server');
      server[func]((err) => {
        const time = process.hrtime(hrtime);
        const nanoseconds = time[0] * 1e9 + time[1];
        const milliseconds = nanoseconds / 1e6;

        if (err) {
          this.logger.error(`Failed closing down in ${milliseconds}ms.`, err);

          this.shutdownTimer.observe(milliseconds, {
            labels: { success: false, method: func },
          });
        } else {
          this.logger.info(`Successfully closed down in ${milliseconds}ms.`);

          this.shutdownTimer.observe(milliseconds, {
            labels: { success: true, method: func },
          });
        }

        done();
      });
    };

    return this.set((done, immediate) => {
      if (immediate) {
        shutdown(done);
      } else {
        setTimeout(shutdown, grace, done);
      }
    });
  }

  /**
   * Gracefully close a resource on shutdown, e.g a vanilla or express server or a db-connection
   */
  closeOnExit(server, options) {
    return this.functionOnExit('close', server, options);
  }

  /**
   * Gracefully stop a resource on shutdown, e.g a vanilla or express server wrapped in stoppable: https://github.com/hunterloftis/stoppable
   */
  stopOnExit(server, options) {
    return this.functionOnExit('stop', server, options);
  }
}

let handlersAdded = false;

export default fp(
  /**
   * @param {import('fastify').FastifyInstance} fastify
   * @param {object} options
   * @param {number} [options.grace]
   * @param {boolean} [options.development]
   */
  (fastify, { grace, development }, next) => {
    if (development) return next();
    if (!handlersAdded) {
      const procExp = new ProcessExceptionHandlers(fastify.log);
      procExp.closeOnExit(fastify, { grace });

      handlersAdded = true;

      // @ts-ignore
      if (!fastify.metricStreams) {
        fastify.decorate('metricStreams', []);
      }

      // @ts-ignore
      fastify.metricStreams.push(procExp.metrics);
      next();
    }
  },
);
