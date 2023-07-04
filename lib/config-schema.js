export const schema = {
  app: {
    name: {
      doc: "Podlet name. Must match ^[a-z-]*$. Defaults to name in package.json.",
      format: "app-name",
      default: null,
      env: "APP_NAME",
    },
    env: {
      doc: "Environments",
      format: String,
      default: "local",
      arg: "env",
      env: "ENV",
    },
    host: {
      doc: "Host",
      format: String,
      default: "localhost",
      env: "HOST",
      arg: "host",
    },
    base: {
      doc: "The base pathname to mount the app routes on. Defaults to the app name",
      format: String,
      default: "",
      env: "APP_BASE",
      arg: "app-base",
    },
    port: {
      doc: "The port to expose the http service on",
      format: "port",
      default: 8080,
      env: "PORT",
      arg: "port",
    },
    logLevel: {
      format: ["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"],
      default: "INFO",
      env: "LOG_LEVEL",
      arg: "log-level",
    },
    locales: {
      doc: "Locales",
      format: Array,
      default: [],
    },
    locale: {
      doc: "Locale",
      format: String,
      default: "en",
      env: "LOCALE",
    },
    development: {
      doc: "Development mode",
      format: Boolean,
      env: "DEVELOPMENT",
      default: false,
    },
    component: {
      doc: "Enables/disables custom element output. Default: true",
      format: Boolean,
      default: true,
    },
    mode: {
      doc: "Render mode. Render custom element with hydration, client side only or server side only. Default: hydrate.",
      format: ["hydrate", "csr-only", "ssr-only"],
      default: "hydrate",
    },
    grace: {
      doc: "Shutdown grace period",
      format: Number,
      default: 5000,
    },
    compression: {
      doc: "Enables/disables compression on routes",
      format: Boolean,
      default: true,
    },
  },
  podlet: {
    pathname: {
      doc: "Podlet pathname.",
      format: String,
      default: "/",
    },
    version: {
      doc: "Podlet version. Locally, this should change on every request. In production, this should stay stable between deploys.",
      format: String,
      env: "VERSION",
      default: `${Date.now()}`,
    },
    manifest: {
      doc: "Manifest route pathname",
      format: String,
      default: "/manifest.json",
    },
    content: {
      doc: "Content Route pathname",
      format: String,
      default: "/",
    },
    fallback: {
      doc: "Fallback route pathname",
      format: String,
      default: "",
    },
  },
  metrics: {
    timing: {
      timeAllRoutes: {
        doc: "Collect timing metrics for all routes",
        format: Boolean,
        default: false,
      },
      groupStatusCodes: {
        doc: "Group status codes for collected timing metrics",
        format: Boolean,
        default: true,
      },
      enabled: {
        doc: "Enable/disable timing metrics collection",
        format: Boolean,
        default: true,
      },
    },
  },
  assets: {
    base: {
      doc: "Base path or URL for assets. Eg. /static or https://assets.cdn.com/static. DO NOT include trailing slash.",
      format: String,
      default: "/static",
    },
    development: {
      doc: "Asset development mode. When enabled, content and fallback will be wrapped in development scripts. Should be set to false when in production.",
      format: Boolean,
      default: false,
    },
    scripts: {
      doc: "Whether scripts.js should be loaded. By default, the existence of the file scripts.js at project root determines this setting.",
      format: Boolean,
      default: false,
    },
    lazy: {
      doc: "Whether lazy.js should be loaded. By default, the existence of the file lazy.js at project root determines this setting.",
      format: Boolean,
      default: false,
    },
  },
  development: {
    liveReload: {
      port: {
        doc: "The port to expose the live reload web socket service on",
        format: "port",
        default: null,
      }
    },
  },
};

export const formats = {
  "app-name": {
    validate: function (val) {
      if (!/^[a-z-]*$/.test(val)) {
        throw new Error("may only contain lower cases letters and hyphens. (^[a-z-]*$)");
      }
    },
  },
};
