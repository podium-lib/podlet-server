export default class Routes {
  #data;
  #schemas;
  constructor({ data, schemas }) {
    this.#data = data;
    this.#schemas = schemas;
  }

  buildObjects(schema) {
    let obj = {};
    let required = [];
    const results = [];
    if (!schema) return results;
    if (schema.required) required = schema.required;
    // check top level for object and properties keys
    if (schema.type === "object" && schema.properties) {
      for (const [key, value] of Object.entries(schema.properties)) {
        obj[key] = value;
      }
    } else {
      obj = schema;
    }

    for (const [key, value] of Object.entries(obj)) {
      results.push({
        name: key,
        required: required.includes(key),
        description: value.description || "",
        type: value.type,
        options: value.enum || [],
      });
    }

    return results;
  }

  buildUrlPath(path) {
    return path.replaceAll(/\/+/g, "/");
  }

  createDataTable(caption, data) {
    if (!data.length) return "";
    let tableValues = "";
    for (const { name, required, description, type, options } of data) {
      tableValues += `
        <tr>
          <td>${name}</td>
          <td>${type}</td>
          <td>${required}</td>
          <td>${description}</td>
          <td>${options.length ? options.join(", ") : ""}</td>
        </tr>`;
    }
    return `
      <table>
        <caption>${caption}</caption>
        <thead>
          <th>name</th>
          <th>type</th>
          <th>required</th>
          <th>description</th>
          <th>options</th>
        </thead>
        <tbody>${tableValues}</tbody>
      </table>`;
  }

  createManifestTable({ name, version, content, fallback, css, js, proxy }) {
    return `
      <table>
        <caption>Manifest</caption>
        <thead>
          <th>Name</th>
          <th>Version</th>
          <th>Content</th>
          <th>Fallback</th>
          <th>CSS</th>
          <th>JS</th>
          <th>Proxy</th>
        </thead>
        <tbody>
          <tr>
            <td>${name}</td>
            <td>${version}</td>
            <td>${content}</td>
            <td>${fallback}</td>
            <td>${JSON.stringify(css)}</td>
            <td>${JSON.stringify(js)}</td>
            <td>${JSON.stringify(proxy)}</td>
          </tr>
        </tbody>
      </table>`;
  }

  createAssetsTable(data) {
    let tableValues = "";
    for (const key in data) {
      if (!data[key]) tableValues += `<tr><td>${key}</td><td>disabled</td></tr>`;
      else tableValues += `<tr><td>${key}</td><td><a href="${data[key]}">${data[key]}</a></td></tr>`;
    }
    return `<table><thead><th>Name</th><th>Path</th></thead><tbody>${tableValues}</tbody></table>`;
  }

  async handler(req, reply) {
    const contentSchema = this.#schemas.get(this.#data.routes.content.path);
    const fallbackSchema = this.#schemas.get(this.#data.routes.content.path);

    const contentQuerystringObject = this.buildObjects(contentSchema.querystring);
    const fallbackQuerystringObject = this.buildObjects(fallbackSchema.querystring);
    const contentHeadersObject = this.buildObjects(contentSchema.headers);
    const fallbackHeadersObject = this.buildObjects(fallbackSchema.headers);
    const contentParamsObject = this.buildObjects(contentSchema.params);
    const fallbackParamsObject = this.buildObjects(fallbackSchema.params);

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
        table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 30px;
        }
        th, td {
          vertical-align: top;
          text-align: left;
          padding: 8px;
          border-bottom: 1px solid #ddd;
        }
        th {
          background-color: #f2f2f2;
        }
        caption {
          text-align: left;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .breadcrumbs {
          font-family: Arial, sans-serif;
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-wrap: wrap;
        }
        .breadcrumbs li {
          display: flex;
          align-items: center;
        }
        .breadcrumbs li:not(:last-child)::after {
          content: '/';
          margin: 0 5px;
          color: #999;
        }
        a {
          text-decoration: none;
          color: #3498db;
        }
        a:hover {
          text-decoration: underline;
        }
        .breadcrumbs li:last-child a {
          color: #333;
          cursor: default;
        }
        </style>
      </head>
      <body>
        <h1>Routes</h1>
        <nav aria-label="Breadcrumb" style="margin-bottom: 20px;">
					<ul class="breadcrumbs">
						<li><a href="/docs">Docs</a></li>
						<li><a href="#">Routes</a></li>
					</ul>
				</nav>
        <h2>Manifest <a href="${this.#data.routes.manifest.path}">${this.#data.routes.manifest.path}</a></h2>
        ${this.createManifestTable(this.#data.routes.manifest.data)}
        
        <h2>Content <a href="${this.#data.routes.content.path}">${this.#data.routes.content.path}</a></h2>
        ${this.createDataTable("Headers", contentHeadersObject)}
        ${this.createDataTable("Query params", contentQuerystringObject)}
        ${this.createDataTable("URL params", contentParamsObject)}
        
        <h2>Fallback <a href="${this.#data.routes.fallback.path}">${this.#data.routes.fallback.path}</a></h2>
        ${this.createDataTable("Headers", fallbackHeadersObject)}
        ${this.createDataTable("Query params", fallbackQuerystringObject)}
        ${this.createDataTable("URL params", fallbackParamsObject)}

        <h2>Assets</h2>
        ${this.createAssetsTable(this.#data.assets)}
      </body>
      </html>
    `);
    return reply;
  }
}
