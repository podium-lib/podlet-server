Advanced Guide: Using Podium Document templates
===============================================

This advanced guide assumes that you have already completed the beginner's guide and are familiar with the basics of setting up and running a Podium podlet server. In this guide, we will cover how to use the Podium Document feature to define a custom document template in your Podium podlet application using a `document.js` or `document.ts` file.

Step 1: Create the document.js or document.ts file
--------------------------------------------------

In the root of your project, create a new file named `document.js` or `document.ts`. This is where you will define your custom document template for your Podium podlet application.

For example:

sh

```sh
touch document.js
```

Step 2: Define the custom document template
-------------------------------------------

Open the `document.js` or `document.ts` file and define a custom document template by exporting a function that returns a string representing the HTML document.

Here's an example of a custom document template in `document.js`:

javascript

```javascript
// document.js
export default (incoming, fragment, head) => `
<!doctype html>
<html lang="${incoming.context.locale}">
    <head>
        <meta charset="${incoming.view.encoding}">
        <title>${incoming.view.title}</title>
        ${head}
    </head>
    <body>
        ${fragment}
    </body>
</html>`;
```

In a TypeScript `document.ts` file, make sure to import and use the proper types:

typescript

```typescript
// document.ts
import { HttpIncoming } from "@podium/podlet";

export default (incoming: HttpIncoming<{ [key: string]: unknown }>, fragment: string, head: string): string => `
<!doctype html>
<html lang="${incoming.context.locale}">
    <head>
        <meta charset="${incoming.view.encoding}">
        <title>${incoming.view.title}</title>
        ${head}
    </head>
    <body>
        ${fragment}
    </body>
</html>`;
```

That's it! You have now successfully used the Podium Document feature to define a custom document template in your Podium podlet application. This custom document template will be used when serving the podlet content, ensuring consistent styling and structure across both development and production environments.

To learn more about Podium Document and how it can be used in podlet applications, refer to the official Podium documentation site: [https://podium-lib.io/docs/api/document](https://podium-lib.io/docs/api/document)%