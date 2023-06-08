import { Server, DevServer, TestServer } from "../core/index.js";

export class PodletServer extends Server {
    extensionLoadPaths = [process.cwd(), new URL("../extensions", import.meta.url).pathname];
}
export class PodletDevServer extends DevServer {
    extensionLoadPaths = [process.cwd(), new URL("../extensions", import.meta.url).pathname];
}
export class PodletTextServer extends TestServer {
    extensionLoadPaths = [process.cwd(), new URL("../extensions", import.meta.url).pathname];
}