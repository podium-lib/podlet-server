# Advanced Usage Guide: Localization

This guide assumes you have already completed the beginner's guide and are familiar with the basics of setting up and running a Podium podlet server. In this advanced guide, we will cover how to add localization support to your Podium podlet application using the built-in localization features.

## Step 1: Create the locale directory

Create a new directory named locale in the root of your project. This is where you will store your localization JSON files.

```sh
mkdir locale
```

## Step 2: Create localization JSON files

For each language you want to support, create a corresponding JSON file in the locale directory. The file name should be the language code (e.g., en.json, no.json).

Example: locale/en.json
Here's an example of a localization JSON file for English:

```json
{
  "how_much_money": "How much money do you have in the saved, really?"
}
```
Example: locale/no.json
Here's an example of a localization JSON file for Norwegian:

```json
{
  "how_much_money": "Hvor mye penger har du i boden, egentlig?"
}
```
## Step 3: Update your content components

Use the t() function in your content and fallback routes to fetch the translated text.

Example: content.js
Here's an example of how to use the t() function in your content component:

```javascript
import { PodiumElement, html } from '@podium/podlet';

export default class Content extends PodiumElement {
  render() {
    return html`<section>${this.t('how_much_money')}</section>`;
  }
}
```
## Step 4: Set the locale in your configuration

You can set the locale for your application either in your configuration files (e.g., config/host/localhost/config.local.json, config/host/www.example.com/config.production.json) or using the LOCALE environment variable.

Example: Setting the locale in config/host/www.example.com/config.production.json
```json
{
  "app": {
    "locale": "en"
  }
}
```

Example: Setting the locale using the LOCALE environment variable

```sh
LOCALE=no npm run dev
```

That's it! You have now successfully added localization support to your Podium podlet application. To learn more about the underlying localization library (lit-translate), you can check out the lit-translate documentation.