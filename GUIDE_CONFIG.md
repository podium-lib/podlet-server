# Advanced Guide: Configuring a Podium Podlet Server

This advanced guide will walk you through configuring your Podium podlet server using the config system. This guide assumes you have completed the beginner's guide and are familiar with the basics of creating a Podium podlet server.

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
    "name": "my-advanced-podlet"
  }
}
```

## Step 3: Create host/environment-specific configuration files

Inside the config folder, create a new folder named hosts:

```bash
mkdir config/hosts
```

Now, create folders for each host you want to configure. For example, if you have a localhost and a production host:

```bash
mkdir config/hosts/localhost
mkdir config/hosts/www.example.com
```

Inside each host folder, create environment-specific configuration files. For example, for a localhost host with local, staging, and production environments:

```bash
touch config/hosts/localhost/config.local.json
touch config/hosts/localhost/config.staging.json
touch config/hosts/localhost/config.production.json
```
And for the www.example.com host:

```
touch config/hosts/www.example.com/config.local.json
touch config/hosts/www.example.com/config.staging.json
touch config/hosts/www.example.com/config.production.json
```
In each config file, override configuration values for the specific host and environment. For example, you can change the app.port for the local environment of the localhost host:

```json5
// config/hosts/localhost/config.local.json
{
  "app": {
    "port": 8081
  }
}
```

## Step 4 Create a schema file for custom configuration values

If you need to extend the built-in config values with your own custom values, create a new file called schema.js inside the config folder:

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

## Step 5: Set environment variables for hosts and environments

Set the HOST and ENV environment variables when starting your app to specify the host and environment you want to use. For example:

```
HOST=www.example.com ENV=staging npm run start
```
This will use the configuration values specified in config/hosts/www.example.com/config.staging.json.

Now, you have successfully configured your Podium podlet server using the config system. You can further customize and extend your podlet server using the various features and configurations available in the Podium podlet server package.