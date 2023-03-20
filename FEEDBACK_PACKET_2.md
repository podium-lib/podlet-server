# Feedback Packet 2

The intention of these "packets" will be to highlight one or more workflows or
feature sets in a way that doesn't require a large time commitment to test and offer feedback on.
The aim is to drop new feedback packets at regular intervals while we incorporate feedback and iterate.

Why "packets"?
I got the idea for the name from the TTRPG industry where they often use play test content "packets" to gather feedback.

If you are able to follow the guide outlined below, gather your thoughts and then offer some feedback
that would be most appreciated.

This week, the feedback packet is focused on app configuration.

## Installation

```
mkdir test-packet
cd test-packet
npm init -f
npm i @podium/experimental-podium-element @podium/podlet-server
```

Edit your `package.json` file and add `"type": "module",` to enable esm support.

## Running the server

```
npx podlet dev
```

And visit `http://localhost:8080` and you should be redirected to the podlet's manifest file.

## Using configuration

This feedback packet is all about app config, how that works and how to handle various scenarios. Under the hood, Convict is used and the app server comes with a number of built
in config options which can all be overridden. In addition, you can extend the config schema to add your own configuration values as needed.

## Step 1: Create a config directory

In your project directory, create a new folder named config:

```bash
mkdir config
```

## Step 2: Create a common configuration file

Create a new file called common.json inside the config folder:

```bash
touch config/common.json
```

Open common.json in your text editor and add global configuration overrides. For example, if you want to change the app name:

```json
{
  "app": {
    "name": "my-test-podlet"
  }
}
```

## Step 3: Create host/environment-specific configuration files

Config can be overridden for different environments such as local, dev, prod. It's flexible based on 2 parameters, host and env which are themselves configurable via environment variables. Eg. HOST=localhost ENV=local. Host is meant for different domains such as finn.no or dba.dk

Since the app tries to provide a set of good defaults for most things, the hope is that you will only need to overwrite these core values in limited cases though usage may prove this
an incorrect assumption and you might have ideas about this you can provide as feedback from the get go.

Inside the config folder, create a new folder named hosts:

```bash
mkdir config/hosts
```

Now, create folders for each host you want to configure. For example, if you have a localhost and a production host:

```bash
mkdir config/hosts/localhost
mkdir config/hosts/finn.no
```

Inside each host folder, create environment-specific configuration files as needed. For example, for a localhost host with local

```bash
touch config/hosts/localhost/config.local.json
```
And for the finn.com host:

```
touch config/hosts/finn.no/config.dev.json
touch config/hosts/finn.no/config.prod.json
```
In each config file, override configuration values for the specific host and environment. For example, you can change the app.port for the local environment of the localhost host:

```json5
// config/hosts/localhost/config.local.json
{
  "app": {
    "port": 3000
  }
}
```

Below is a list of config values that can be overwritten

#### App Config

| Key                            | Default                                         | ENV         | Possible Values                                    |
| ------------------------------ | ----------------------------------------------- | ----------- | -------------------------------------------------- |
| `app.name`                     | package.json name value                         | APP_NAME    |                                                    |
| `app.env`                      | local                                           | ENV         |                                                    |
| `app.host`                     | localhost                                       | HOST        |                                                    |
| `app.port`                     | 8080                                            | PORT        |                                                    |
| `app.logLevel`                 | INFO                                            | LOG_LEVEL   | "TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL" |
| `app.locale`                   | en-US                                           | LOCALE      |                                                    |
| `app.development`              | true when NODE_ENV=development, false otherwise | DEVELOPMENT | true/false                                         |
| `app.component`                | true                                            |             |                                                    |
| `app.mode`                     | hydrate                                         |             | hydrate, ssr-only, csr-only                        |
| `app.grace`                    | 0                                               |             |                                                    |
| `app.processExceptionHandlers` | true                                            |             | true/false                                         |
| `app.compression`              | true                                            |             | true/false                                         |

#### Podlet Config

| Key               | Default          | ENV     | Possible Values |
| ----------------- | ---------------- | ------- | --------------- |
| `podlet.pathname` | "/"              |         |                 |
| `podlet.version`  | ${Date.now()}    | VERSION |                 |
| `podlet.manifest` | "/manifest.json" |         |                 |
| `podlet.content`  | "/"              |         |                 |
| `podlet.fallback` | "/fallback"      |         |                 |

### Metrics Config

| Key                               | Default | ENV | Possible Values |
| --------------------------------- | ------- | --- | --------------- |
| `metrics.timing.timeAllRoutes`    | false   |     | true/false      |
| `metrics.timing.groupStatusCodes` | true    |     | true/false      |
| `metrics.timing.enabled`          | true    |     | true/false      |

### Assets Config

| Key                  | Default     | ENV | Possible Values |
| -------------------- | ----------- | --- | --------------- |
| `assets.base`        | "/static"   |     |                 |
| `assets.development` | false       |     | true/false      |
| `assets.scripts`     | auto detect |     | true/false      |
| `assets.lazy`        | auto detect |     | true/false      |

## Step 4 Create a schema file for custom configuration values

If you need to extend the built-in config values with your own custom values.
The config module Convict is used under the hood and the schema the app uses can be extended using a custom Convict schema.
Create a new file called schema.js inside the config folder:

```bash
touch config/schema.js
```

Open schema.js in your text editor and define your custom configuration values. For example:

```js
export default {
  db: {
    host: {
      doc: "Database host name/IP",
      format: "*",
      default: "server1.dev.test",
    },
    name: {
      doc: "Database name",
      format: String,
      default: "users",
    },
  },
};
```

Once you've defined your custom values in the schema file, you can override them in the common.json and host/environment-specific config files.
See [Convict](https://www.npmjs.com/package/convict) for more details about writing schemas.

## Step 5: Set environment variables for hosts and environments

Finally, when running locally, you shouldn't need to set any environment variables, HOST will default to `localhost` and ENV will default to `local` 
but when running in dev/prod, there are 3 environment variables that should be set. We will likely want to get this set automatically in the platform.
These are: HOST, ENV and VERSION. For Finn running in the current Fiaas, these would be HOST=finn.no ENV=dev|prod and VERSION={github commit hash}

For example:
```
HOST=finn.no ENV=dev VERSION=asd12df12gd3fg123 npm start
# Uses configuration values specified in config/hosts/finn.no/config.dev.json.
HOST=finn.no ENV=prod VERSION=asd12df12gd3fg123 npm start
# Uses configuration values specified in config/hosts/finn.no/config.prod.json.
```

Thats it for config, please give us any feedback you have!