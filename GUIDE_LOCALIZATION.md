# Advanced Guide: Localization

This guide assumes you have already completed the beginner's guide and are familiar with the basics of setting up and running a Podium podlet server. In this advanced guide, we will cover how to add localization support to your Podium podlet application using the built-in localization features.

## Step 1: Define your supported locales in your configuration

You can set the supported locales for your application either in your configuration files (e.g., config/host/localhost/config.local.json, config/host/www.example.com/config.production.json) or using the LOCALES environment variable.

Example: Setting the supported locales in config/host/www.example.com/config.production.json

```json
{
  "app": {
    "locales": ["en", "nb"]
  }
}
```

Please note that `en` should always be included. That will be used as the source language of all Podlet server applications.

## Step 2: Set your active locale in your configuration

You can set the locale for your application either in your configuration files (e.g., config/host/localhost/config.local.json, config/host/www.example.com/config.production.json) or using the LOCALE environment variable.

Example: Setting the locale in config/host/www.example.com/config.production.json

```json
{
  "app": {
    "locale": "nb"
  }
}
```

Example: Setting the locale using the LOCALE environment variable

```sh
LOCALE=nb npm run dev
```

## Step 3: Define your messages in the code

Example: content.js
Here's an example of how to use the i18n() function in yout content component:

```javascript
import { PodiumElement } from "@podium/element";
import { html } from "lit";

export default class Content extends PodiumElement {
  render() {
    return html`<section>
      ${this.i18n.t({ id: "page.message", message: "Hello world", comment: "Main message in my app" })}
    </section>`;
  }
}
```

## Step 4: Translate the messages

You'll now notice that a new folder has appearead in your app. If you browse to `./locales` you will see a few different files.

- One `.po` file per locale defined in [Step 1](#step-1-define-your-supported-locales-in-your-configuration).
- One `.mjs` or `.ts` file per locale defined in [Step 1](#step-1-define-your-supported-locales-in-your-configuration).
  - The output file depends on whether you use TypeScript in your podlet server or not
- One `.d.ts` per `.ts` file per locale defined in [Step 1](#step-1-define-your-supported-locales-in-your-configuration) if you use TypeScript in your podlet server.

If you have set e.g `nb` as a supported locale in your configuration you can now open the `nb.po` file and add the Norwegian translation of your string there. This will trigger a compliation of said messages automatically if you build or run the dev server.

## Conclusion

That's it! You have now successfully added localization support to your Podium podlet application. To learn more about the underlying localization library (lingui), you can check out the [lingui documentation](https://lingui.dev/introduction).
