export default class Configuration {
  #data;

  constructor({ config }) {
    this.#data = config.getProperties();
  }

  createKeyValueTable(data) {
    let tableValues = "";
    for (const key in data) {
      tableValues += `<tr><td>${key}</td><td>${data[key]}</td></tr>`;
    }
    return `<table style="margin-bottom:10px;">${tableValues}</table>`;
  }

  createKeyValueTableRow(section, data) {
    return `<tr><td>${section}</td><td>${data}</td></tr>`;
  }

  createTable(section, data) {
    let tableHeaders = "";
    let tableValues = "";

    for (const key in data) {
      const value =
        typeof data[key] === "object" && data[key] !== null ? this.createKeyValueTable(data[key]) : data[key];

      tableHeaders += `<th>${key}</th>`;
      tableValues += `<td>${value}</td>`;
    }

    const table = `
        <table>
          <caption>${section}</caption>
          <thead>
            <tr>${tableHeaders}</tr>
          </thead>
          <tbody>
            <tr>${tableValues}</tr>
          </tbody>
        </table>`;
    return table;
  }

  async handler(req, reply) {
    let tables = "";
    let additionalRows = "";

    for (const key in this.#data) {
      if (typeof this.#data[key] === "string") {
        additionalRows += this.createKeyValueTableRow(key, this.#data[key]);
      } else {
        tables += this.createTable(key, this.#data[key]);
      }
    }

    if (additionalRows) {
      tables += `
				<table>
						<caption>Other</caption>
						<thead>
							<tr><th>key</th><th>value</th></tr>
						</thead>
						<tbody>
							${additionalRows}
						</tbody>
					</table>
					`;
    }

    reply.type("text/html").send(
      `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Configuration</title>
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
					.breadcrumbs li a {
						text-decoration: none;
						color: #3498db;
					}
					.breadcrumbs li a:hover {
						text-decoration: underline;
					}
					.breadcrumbs li:last-child a {
						color: #333;
						cursor: default;
					}
				</style>
			</head>
			<body>
				<h1>Configuration</h1>
				<nav aria-label="Breadcrumb" style="margin-bottom: 20px;">
					<ul class="breadcrumbs">
						<li><a href="/docs">Docs</a></li>
						<li><a href="#">Configuration</a></li>
					</ul>
				</nav>
				<div>${tables}</div>
			</body>
			</html>`
    );
		return reply;
  }
}
