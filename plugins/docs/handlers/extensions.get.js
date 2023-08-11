export default class Extensions {
  #data;

  constructor({ extensions }) {
    this.#data = extensions;
  }

  createTables(data) {
    let tables = '';

    for (const [key, value] of data) {
      tables += `
          <table>
            <caption>${key}</caption>
            <thead>
              <tr>
                <th>server</th>
                <th>config</th>
                <th>build</th>
                <th>document</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${value.server ? '✔' : '✘'}</td>
                <td>${value.config ? '✔' : '✘'}</td>
                <td>${value.build ? '✔' : '✘'}</td>
                <td>${value.document ? '✔' : '✘'}</td>
              </tr>
            </tbody>
          </table>`;
    }

    return tables;
  }

  async handler(req, reply) {
    reply.type('text/html').send(
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
				<h1>Extensions</h1>
				<nav aria-label="Breadcrumb" style="margin-bottom: 20px;">
					<ul class="breadcrumbs">
						<li><a href="/docs">Docs</a></li>
						<li><a href="#">Configuration</a></li>
					</ul>
				</nav>
				<div>${this.createTables(this.#data.extensions.entries())}</div>
			</body>
			</html>`,
    );
    return reply;
  }
}
