import http, { type IncomingMessage, type ServerResponse } from "node:http";
import https from "node:https";
import net from "node:net";
import { URL } from "node:url";
import { handleInspectorApi, PROXY_PORT } from "./inspectorApi.js";
import { captureConnect, captureHttp } from "./sessions.js";

function collectBody(stream: IncomingMessage, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    stream.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size <= limit * 2) {
        chunks.push(chunk);
      }
    });
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

function parseAbsoluteUrl(req: IncomingMessage): { target: URL; host: string } | null {
  const raw = req.url ?? "/";
  if (/^https?:\/\//i.test(raw)) {
    try {
      const target = new URL(raw);
      return { target, host: target.host };
    } catch {
      return null;
    }
  }
  const hostHeader = req.headers.host;
  if (hostHeader) {
    try {
      const target = new URL(`http://${hostHeader}${raw}`);
      return { target, host: hostHeader };
    } catch {
      return null;
    }
  }
  return null;
}

function proxyHttp(req: IncomingMessage, res: ServerResponse) {
  const started = Date.now();
  const startedAt = new Date();
  const parsed = parseAbsoluteUrl(req);
  if (!parsed) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Bad request: absolute-form URL required (use curl -x)");
    return;
  }

  const { target, host } = parsed;
  const isHttps = target.protocol === "https:";
  const lib = isHttps ? https : http;

  const reqChunks: Buffer[] = [];
  req.on("data", (c: Buffer) => reqChunks.push(c));

  const headers = { ...req.headers };
  delete headers["proxy-connection"];
  delete headers["connection"];
  delete headers["keep-alive"];
  delete headers["transfer-encoding"];
  delete headers["te"];
  delete headers["trailer"];
  delete headers["upgrade"];
  headers.host = target.host;

  const upstream = lib.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (isHttps ? 443 : 80),
      method: req.method,
      path: target.pathname + target.search,
      headers,
    },
    (upRes) => {
      const resChunks: Buffer[] = [];
      upRes.on("data", (c: Buffer) => resChunks.push(c));
      res.writeHead(upRes.statusCode ?? 502, upRes.headers);
      upRes.pipe(res);
      upRes.on("end", () => {
        captureHttp({
          method: req.method ?? "GET",
          url: target.toString(),
          host,
          reqHeaders: req.headers,
          resHeaders: upRes.headers,
          status: upRes.statusCode ?? 0,
          reqBody: Buffer.concat(reqChunks),
          resBody: Buffer.concat(resChunks),
          durationMs: Date.now() - started,
          startedAt,
        });
      });
    }
  );

  upstream.on("error", (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "text/plain" });
      res.end(`Upstream error: ${err.message}`);
    } else {
      res.end();
    }
    captureHttp({
      method: req.method ?? "GET",
      url: target.toString(),
      host,
      reqHeaders: req.headers,
      resHeaders: {},
      status: 502,
      reqBody: Buffer.concat(reqChunks),
      resBody: Buffer.from(err.message),
      durationMs: Date.now() - started,
      startedAt,
    });
  });

  req.pipe(upstream);
}

function handleConnect(req: IncomingMessage, clientSocket: net.Socket, head: Buffer) {
  const started = Date.now();
  const target = req.url ?? "";
  const [hostname, portStr] = target.split(":");
  const port = Number(portStr) || 443;

  if (!hostname) {
    clientSocket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
    clientSocket.end();
    captureConnect({ url: target, status: 400, error: "missing host", durationMs: Date.now() - started });
    return;
  }

  const serverSocket = net.connect(port, hostname, () => {
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head && head.length) serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
    captureConnect({ url: target, status: 200, durationMs: Date.now() - started });
  });

  serverSocket.on("error", (err) => {
    try {
      clientSocket.write("HTTP/1.1 502 Bad Gateway\r\n\r\n");
      clientSocket.end();
    } catch {
      /* ignore */
    }
    captureConnect({ url: target, status: 502, error: err.message, durationMs: Date.now() - started });
  });

  clientSocket.on("error", () => {
    serverSocket.destroy();
  });
}

export function createProxyServer(): http.Server {
  const server = http.createServer((req, res) => {
    if (handleInspectorApi(req, res)) return;
    proxyHttp(req, res);
  });
  server.on("connect", handleConnect);
  return server;
}

export { PROXY_PORT };
