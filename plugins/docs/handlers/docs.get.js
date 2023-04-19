export default class Docs {
  constructor({ config, extensions }) {
    this.config = config;
    this.extensions = extensions;
  }
  async handler(req, reply) {
    console.log("docs handler")
    reply.type("text/html").send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Documentation</title>
        <style>
        body {
          font-family: Arial, sans-serif;
          margin: 30px;
        }
        a {
          text-decoration: none;
          color: #3498db;
        }
        a:hover {
          text-decoration: underline;
        }
        </style>
      </head>
      <body>
        <h1>Documentation</h1>
        <ul>
        <li><a href="/docs/configuration">Configuration</a></li>
        <li><a href="/docs/routes">Routes</a></li>
        </ul>
      </body>
      </html>
    `);
    return reply;
  }
}
