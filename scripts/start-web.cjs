const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

let metroPort;
let webPort;
let expoPort;
const headers = {
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

function findAvailablePort(startingPort) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startingPort + 1));
      } else {
        reject(error);
      }
    });
    probe.listen(startingPort, '127.0.0.1', () => {
      probe.close((error) => (error ? reject(error) : resolve(startingPort)));
    });
  });
}

function createProxy(targetPort) {
  const proxy = http.createServer((request, response) => {
    Object.entries(headers).forEach(([name, value]) => response.setHeader(name, value));

    const upstream = http.request(
      {
        hostname: '127.0.0.1',
        port: targetPort,
        method: request.method,
        path: request.url,
        headers: { ...request.headers, host: `localhost:${targetPort}` },
      },
      (upstreamResponse) => {
        response.writeHead(upstreamResponse.statusCode || 502, {
          ...upstreamResponse.headers,
          ...headers,
        });
        upstreamResponse.pipe(response);
      }
    );

    upstream.on('error', (error) => {
      if (!response.headersSent) response.writeHead(502, headers);
      response.end(`GeoCam web proxy could not reach Metro: ${error.message}`);
    });
    request.pipe(upstream);
  });

  proxy.on('upgrade', (request, socket, head) => {
    const upstream = net.connect(targetPort, '127.0.0.1', () => {
      upstream.write(`${request.method} ${request.url} HTTP/${request.httpVersion}\r\n`);
      for (let i = 0; i < request.rawHeaders.length; i += 2) {
        const name = request.rawHeaders[i];
        const value = name.toLowerCase() === 'host' ? `localhost:${targetPort}` : request.rawHeaders[i + 1];
        upstream.write(`${name}: ${value}\r\n`);
      }
      upstream.write('\r\n');
      if (head.length) upstream.write(head);
      upstream.pipe(socket);
      socket.pipe(upstream);
    });

    upstream.on('error', () => socket.destroy());
    socket.on('error', () => upstream.destroy());
  });

  return proxy;
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    const onError = (error) => reject(error);
    server.once('error', onError);
    server.listen(port, '127.0.0.1', () => {
      server.removeListener('error', onError);
      resolve();
    });
  });
}

async function start() {
  metroPort = await findAvailablePort(Number(process.env.GEOCAM_METRO_PORT || 8099));
  webPort = await findAvailablePort(Math.max(Number(process.env.GEOCAM_WEB_PORT || 8100), metroPort + 1));
  expoPort = await findAvailablePort(Math.max(metroPort, webPort) + 1);

  const proxies = [createProxy(expoPort), createProxy(expoPort)];
  try {
    await Promise.all([listen(proxies[0], metroPort), listen(proxies[1], webPort)]);
  } catch (error) {
    proxies.forEach((proxy) => {
      if (proxy.listening) proxy.close();
    });
    throw error;
  }

  console.log(`GeoCam web (con SharedArrayBuffer): http://localhost:${metroPort}`);
  console.log(`GeoCam web (con SharedArrayBuffer): http://localhost:${webPort}`);
  console.log(`Puerto interno de Metro (no abrir en el navegador): ${expoPort}`);

  const expoCli = path.resolve('node_modules/expo/bin/cli');
  const expo = spawn(
    process.execPath,
    [expoCli, 'start', '--web', '--port', String(expoPort)],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        EXPO_NO_BROWSER: '1',
        EXPO_PACKAGER_PROXY_URL: `http://localhost:${webPort}`,
      },
    }
  );

  expo.on('error', (error) => {
    console.error(`Could not start Expo: ${error.message}`);
    proxies.forEach((proxy) => proxy.close());
    process.exitCode = 1;
  });
  expo.on('exit', (code) => {
    proxies.forEach((proxy) => proxy.close());
    process.exitCode = code || 0;
  });

  const stop = () => expo.kill('SIGINT');
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

start().catch((error) => {
  console.error(`Could not start GeoCam web: ${error.message}`);
  process.exitCode = 1;
});
