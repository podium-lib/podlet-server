// EXTENSIONS
// properties of the extension object that can be used to extend the app

// extension name
export const name = "";

// esbuild plugins and entry points for files to be bundled during client side production build
export const build = {
    plugins: [],
    entryPoints: [],
}

// additional schema and convict formats to use
export const config = {
    schema: {},
    formats: [],
}

// Fastify plugin
export async function server(app) {}

// additional files for the server to watch and load, cwd will automatically be prepended to relative paths
export const files = {
    watch: [],
    load: [],
}

// any extra meta data that can be shared between extensions and app files
export const meta = {}