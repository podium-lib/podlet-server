# Advanced Usage Guide: Route Validation

This guide assumes you have already completed the beginner's guide and are familiar with the basics of setting up and running a Podium podlet server. In this advanced guide, we will cover how to add route validation to your Podium podlet application using JSON Schema and the AJV library.

## Step 1: Create the schemas directory

Create a new directory named schemas in the root of your project. This is where you will store your JSON Schema validation files.

```sh
mkdir schemas
```

## Step 2: Create JSON Schema validation files

For each route that requires validation (e.g., content.js and fallback.js), create a corresponding JSON file in the schemas directory.

For example, to add validations for the content.js route, create a file called schemas/content.json. Likewise, create a schemas/fallback.json file for validations related to the fallback.js route.

Example: schemas/content.json
Here's an example of a validation schema for the content.js route:

```json
{
  "querystring": {
    "type": "object",
    "properties": {
      "id": { "type": "integer" }
    },
    "required": ["id"]
  }
}
```

Example: schemas/fallback.json
Here's an example of a validation schema for the fallback.js route:

```json
{
  "querystring": {
    "type": "object",
    "properties": {
      "lang": { "type": "string", "enum": ["en", "no"] }
    },
    "required": ["lang"]
  }
}
```
## Step 3: Update your server.js file

In your server.js file, you can now access the validated query parameters, route parameters, and request headers using the setContentState and setFallbackState hooks. If a schema file is not provided, any query parameters, route parameters, or request headers will be silently stripped/removed and will not be available to access.

Here's an example of how you might use a validated query parameter in your setContentState hook:

```javascript
export default async function server(app) {
  app.setContentState(async ({ query }) => {
    const { id } = query;

    // Fetch data using the validated `id` query parameter
    const data = await fetchData(id);

    // Return the data to be used in your content component
    return { data };
  });
}
```

That's it! You have now successfully added route validation to your Podium podlet application using JSON Schema and the AJV library.