const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const metroPort = Number(process.env.GEOCAM_METRO_PORT || 8099);
const webPort = Number(process.env.GEOCAM_WEB_PORT || 8100);
const headers = {
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

const proxy = http.createServer((request, response) => {
  Object.entries(headers).forEach(([name, value]) => response.setHeader(name, value));

  const upstream = http.request(
    {
      hostname: '127.0.0.1',
      port: metroPort,
      method: request.method,
      path: request.url,
      headers: { ...request.headers, host: `localhost:${metroPort}` },
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
  const upstream = net.connect(metroPort, '127.0.0.1', () => {
    upstream.write(`${request.method} ${request.url} HTTP/${request.httpVersion}\r\n`);
    for (let i = 0; i < request.rawHeaders.length; i += 2) {
      const name = request.rawHeaders[i];
      const value = name.toLowerCase() === 'host' ? `localhost:${metroPort}` : request.rawHeaders[i + 1];
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

proxy.listen(webPort, '127.0.0.1', () => {
  console.log(`GeoCam web: http://localhost:${webPort}`);
  console.log(`Metro bundler: http://localhost:${metroPort}`);

  const expoCli = path.resolve('node_modules/expo/bin/cli');
  const expo = spawn(
    process.execPath,
    [expoCli, 'start', '--web', '--port', String(metroPort)],
    { stdio: 'inherit', env: { ...process.env, EXPO_NO_BROWSER: '1' } }
  );

  expo.on('error', (error) => {
    console.error(`Could not start Expo: ${error.message}`);
    proxy.close();
    process.exitCode = 1;
  });
  expo.on('exit', (code) => {
    proxy.close();
    process.exitCode = code || 0;
  });

  const stop = () => expo.kill('SIGINT');
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
});
