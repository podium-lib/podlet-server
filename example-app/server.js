export default async function server(app) {
    app.get("/test", async (request, reply) => {
        reply.send("test");
    });
}