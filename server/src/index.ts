import { createProxyServer, PROXY_PORT } from "./proxy.js";
import { loadFromDisk } from "./sessions.js";

loadFromDisk();

const server = createProxyServer();

server.listen(PROXY_PORT, "127.0.0.1", () => {
  console.log(`[aether-inspector] HTTP proxy listening on http://127.0.0.1:${PROXY_PORT}`);
  console.log(`[aether-inspector] Inspector API at http://127.0.0.1:${PROXY_PORT}/__inspector__/status`);
  console.log(`[aether-inspector] Phase: 1-http (no HTTPS decrypt)`);
});

function shutdown() {
  console.log("[aether-inspector] shutting down…");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 3000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
