import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import https from 'https'
import http from 'http'

// Custom plugin to proxy OneDrive data with proper redirect-following & error handling
function oneDriveProxy() {
  return {
    name: 'onedrive-proxy',
    configureServer(server) {
      server.middlewares.use('/api/data', (req, res) => {
        const url = 'https://onedrive.live.com/:x:/g/personal/fe8dbd7e587260d6/IQBLWQOk1DJnTZQbJzkq2sFeAbNyRF8DL8-6c7jnH9Fxh7A?rtime=_9q6F56M3kg&redeem=aHR0cHM6Ly8xZHJ2Lm1zL3gvYy9mZThkYmQ3ZTU4NzI2MGQ2L0lRQkxXUU9rMURKblRaUWJKemtxMnNGZUFiTnlSRjhETDgtNmM3am5IOUZ4aDdBP2U9TmZObXBO&download=1';
        let headersSent = false;

        function follow(targetUrl, redirectCount = 0) {
          if (redirectCount > 10) {
            if (!headersSent) { res.writeHead(502); res.end('Too many redirects'); }
            return;
          }

          const protocol = targetUrl.startsWith('https') ? https : http;
          const request = protocol.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (proxyRes) => {
            if ([301, 302, 303, 307, 308].includes(proxyRes.statusCode) && proxyRes.headers.location) {
              proxyRes.resume(); // consume the response body
              follow(proxyRes.headers.location, redirectCount + 1);
            } else {
              headersSent = true;
              res.writeHead(proxyRes.statusCode, {
                'Content-Type': proxyRes.headers['content-type'] || 'application/octet-stream',
                'Access-Control-Allow-Origin': '*',
              });
              proxyRes.pipe(res);
            }
          });
          
          request.on('error', (err) => {
            console.error('Proxy error:', err.message);
            if (!headersSent) {
              headersSent = true;
              res.writeHead(502);
              res.end('Proxy error');
            }
          });

          request.setTimeout(15000, () => {
            request.destroy();
            if (!headersSent) {
              headersSent = true;
              res.writeHead(504);
              res.end('Proxy timeout');
            }
          });
        }

        follow(url);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), oneDriveProxy()],
})
