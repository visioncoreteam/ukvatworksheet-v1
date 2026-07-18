/**
 * CRA dev-server proxy configuration.
 * This file is automatically picked up by react-scripts — no import needed.
 *
 * Purpose:
 *  - Forwards all /api/* requests from the React dev server to the Express
 *    backend, bypassing the browser's same-origin / CORS restrictions.
 *  - `secure: false`  → accepts self-signed SSL certs on localhost:5002 (dev, HTTPS only).
 *  - `changeOrigin`   → rewrites the Host header so Express sees itself as
 *    the origin, preventing CORS rejections on the server side.
 *
 * In PRODUCTION this file has no effect; Caddy handles routing.
 */

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // NOTE: REACT_APP_* vars are NOT available here (this runs in Node, not webpack).
  // Hardcode the Express backend URL for dev. Change if your backend port differs.
  const target = 'http://localhost:5002';

  console.log(`[setupProxy] Proxying /api/* → ${target}`);

  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      secure: false,       // allow self-signed certs in dev
      logLevel: 'debug',   // temporarily verbose to diagnose proxy issues
      on: {
        error: (err, req, res) => {
          console.error('[setupProxy] Proxy error:', err.message, '| Target:', target, '| Path:', req.url);
          res.status(502).json({ error: 'Proxy error', message: err.message, target });
        },
      },
    })
  );
};
