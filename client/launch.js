/**
 * launch.js — Multi-host production launcher
 *
 * Loads the specified .env file BEFORE server.js so that SERVER_PORT
 * and all other env vars are available when server.js initialises.
 *
 * Usage:
 *   node launch.js                      → loads .env (default)
 *   node launch.js --env .env.host1     → loads .env.host1
 *   node launch.js --env .env.host2     → loads .env.host2
 *
 * PM2 examples:
 *   pm2 start launch.js --name "firs-host1" -- --env .env.host1
 *   pm2 start launch.js --name "firs-host2" -- --env .env.host2
 */

const path = require('path');

const args = process.argv.slice(2);
const envIndex = args.indexOf('--env');
const envFile = envIndex !== -1 ? args[envIndex + 1] : '.env';
const envPath = path.resolve(__dirname, envFile);

require('dotenv').config({ path: envPath });

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📦 Config  : ${envFile}`);
console.log(`🔌 Port    : ${process.env.SERVER_PORT || 5000}`);
console.log(`🌍 Env     : ${process.env.NODE_ENV || 'development'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

require('./server.js');
