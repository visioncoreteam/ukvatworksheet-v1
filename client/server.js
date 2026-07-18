// Ensure OpenSSL (bundled with Git for Windows) is on PATH so that
// firs-einvoicing can call 'openssl pkeyutl' via execSync.
const GIT_OPENSSL_PATH = 'C:\\Program Files\\Git\\usr\\bin';
if (process.platform === 'win32' && !process.env.PATH.includes(GIT_OPENSSL_PATH)) {
  process.env.PATH = GIT_OPENSSL_PATH + ';' + process.env.PATH;
}

const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.SERVER_PORT || 5002;
const isProduction = process.env.NODE_ENV === 'production';

// Route Imports
const qrcodeRoutes = require('./routes/qrcode.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const irnRoutes = require('./routes/irn.routes');
const mraRoutes = require('./routes/mra.routes');
const businessRoutes = require('./routes/business.routes');
const managerRoutes = require('./routes/manager.routes');

// Security Middleware
// frameguard is disabled so the React app can be embedded in the parent
// Jofotara accounting system iframe (X-Frame-Options: SAMEORIGIN would block it).
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  frameguard: false,           // removes X-Frame-Options header — required for iframe embedding
}));

// CORS Configuration
// Production: Caddy reverse-proxies everything — same origin, no CORS needed
// Dev: allow React dev server (port 3000)
const corsOptions = isProduction
  ? { origin: false }
  : {
      origin: function (origin, callback) {
        const allowed = [
          'https://localhost:3000',
          'http://localhost:3000',
          `https://localhost:${PORT}`,
          `http://localhost:${PORT}`,
          'null',  // iframes from cross-origin parents send Origin: null
        ];
        // Allow requests with no origin (Postman, curl) or matched origins
        if (!origin || allowed.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    };
// Handle preflight for all routes
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// Body Parser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Trust proxy headers forwarded by Caddy
app.set('trust proxy', 1);

// Iframe embedding headers — allow parent Jofotara system to embed this app
app.use((req, res, next) => {
  const clientUrl = process.env.CLIENT_URL || '*';
  // X-Frame-Options: ALLOW-FROM is deprecated and ignored by all modern browsers
  // (Chrome, Firefox, Edge). Helmet's frameguard:false already prevents it being set.
  // We rely solely on Content-Security-Policy frame-ancestors which IS supported.
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', `frame-ancestors 'self' ${clientUrl}`);
  next();
});

// Request Logging Middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============== ROUTES ==============

// GET endpoint - Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Server is running',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// GET endpoint - Get data example
app.get('/api/data', (req, res) => {
  try {
    const sampleData = {
      status: 'success',
      data: [
        { id: 1, name: 'Item 1', description: 'First item' },
        { id: 2, name: 'Item 2', description: 'Second item' },
        { id: 3, name: 'Item 3', description: 'Third item' }
      ]
    };
    res.json(sampleData);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch data'
    });
  }
});

// GET endpoint with parameters
app.get('/api/data/:id', (req, res) => {
  try {
    const { id } = req.params;
    res.json({
      status: 'success',
      data: {
        id: id,
        name: `Item ${id}`,
        description: `Details for item ${id}`
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch data'
    });
  }
});

// POST endpoint - Create data
app.post('/api/data', (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Validation
    if (!name || !description) {
      return res.status(400).json({
        status: 'error',
        message: 'Name and description are required'
      });
    }

    // Simulate data creation
    const newItem = {
      id: Date.now(),
      name,
      description,
      createdAt: new Date().toISOString()
    };

    res.status(201).json({
      status: 'success',
      message: 'Data created successfully',
      data: newItem
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to create data'
    });
  }
});

// POST endpoint - User authentication example
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;

    // Basic validation
    if (!username || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Username and password are required'
      });
    }

    // Example authentication (replace with real auth logic)
    if (username === 'demo' && password === 'password') {
      res.json({
        status: 'success',
        message: 'Login successful',
        user: {
          id: 1,
          username: username,
          token: 'sample-jwt-token-' + Date.now()
        }
      });
    } else {
      res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Authentication failed'
    });
  }
});

app.get('/api/business', async (req, res) => {
  try {
    // Make direct HTTP request to Manager.io
    const response = await fetch('http://localhost:8089/api3/business-details-form', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Manager.io API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    res.json({
      status: 'success',
      data: data
    });
  } catch (error) {
    console.error('Business API Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch business details',
      error: error.message
    });
  }
});

// QR Code Routes (FIRS e-Invoicing)
app.use('/api/qrcode', qrcodeRoutes);

// Invoice Routes (FIRS e-Invoicing)
app.use('/api/invoice', invoiceRoutes);

// IRN Routes (FIRS e-Invoicing)
app.use('/api/irn', irnRoutes);

// MRA EBS Routes (authentication + invoice transmission)
app.use('/api/mra', mraRoutes);

// Business Logic Routes (Manager.io proxied data-fetch, conversion, patch)
app.use('/api/business', businessRoutes);
console.log('Business routes registered at /api/business');

// Manager Proxy Routes (generic Manager.io API pass-through)
app.use('/api/manager', managerRoutes);
console.log('Manager proxy routes registered at /api/manager');

// Protect src/serverjs/ from direct browser access
app.use('/serverjs', (req, res) => res.status(404).json({ status: 'error', message: 'Not found' }));

// ============== SERVE REACT IN PRODUCTION ==============
// Serve the React build whenever the /build folder is present.
// This covers: `npm run prod` (NODE_ENV=production) AND
// direct `node server.js` runs on a web server where the build already exists.
const buildPath = path.join(__dirname, 'build');
if (fs.existsSync(buildPath)) {
  // Serve static assets: JS, CSS, images, etc.
  app.use(express.static(buildPath, { index: false }));

  // SPA catch-all — return index.html for every non-API route so React Router works.
  // API routes registered above will already have matched; this is a final fallback.
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ status: 'error', message: 'API route not found' });
    }
    res.sendFile(path.join(buildPath, 'index.html'));
  });
  console.log(`✅ Serving React build from: ${buildPath}`);
} else {
  if (isProduction) {
    console.warn('⚠️  /build folder not found. Run: npm run build');
  } else {
    console.log('ℹ️  No /build folder — React is served by the CRA dev server (port 3000).');
  }
}

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

// ============== START SERVER ==============
// Production : plain HTTP on 127.0.0.1 — Caddy handles HTTPS externally
// Development: optional HTTPS via self-signed certs

const useHttps = !isProduction && process.env.USE_HTTPS_BACKEND === 'true';

if (useHttps) {
  try {
    const keyPath = path.join(__dirname, process.env.SSL_KEY_FILE || 'server.key');
    const certPath = path.join(__dirname, process.env.SSL_CRT_FILE || 'server.cert');

    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };
      https.createServer(httpsOptions, app).listen(PORT, () => {
        console.log(`🚀 [DEV] HTTPS server running on https://localhost:${PORT}`);
        console.log(`📡 API: https://localhost:${PORT}/api`);
      });
    } else {
      console.warn('SSL certs not found. Falling back to HTTP...');
      console.warn('Generate certs with: node generate-cert.js');
      app.listen(PORT, () => {
        console.log(`🚀 [DEV] HTTP server running on http://localhost:${PORT}`);
      });
    }
  } catch (error) {
    console.error('HTTPS startup error:', error);
    app.listen(PORT, () => {
      console.log(`🚀 HTTP server running on http://localhost:${PORT}`);
    });
  }
} else {
  // Production: bind to 127.0.0.1 only — Caddy connects internally
  const host = isProduction ? '127.0.0.1' : 'localhost';
  app.listen(PORT, host, () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🚀 Server   : http://${host}:${PORT}`);
    console.log(`📡 API      : http://${host}:${PORT}/api`);
    console.log(`🌍 Env      : ${process.env.NODE_ENV || 'development'}`);
    if (isProduction) {
      console.log('🔒 HTTPS    : handled externally by Caddy');
      console.log('🌐 React    : served from /build folder');
    } else {
      console.log('💡 Tip: Set USE_HTTPS_BACKEND=true in .env to enable dev HTTPS');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  });
}
