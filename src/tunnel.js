import net from "node:net";
import localtunnel from "localtunnel";

export async function isPortActive(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    const done = (ok) => {
      try {
        socket.destroy();
      } catch {}
      resolve(ok);
    };

    socket.setTimeout(800);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));

    socket.connect(port, host);
  });
}

export async function createTunnel({ port }) {
  const tunnel = await localtunnel({ port });
  return {
    url: tunnel.url,
    close: () => tunnel.close(),
    onError: (fn) => tunnel.on("error", fn),
  };
}

