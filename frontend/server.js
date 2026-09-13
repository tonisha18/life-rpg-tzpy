const { createServer } = require('http');
const { parse } = require('url');
const path = require('path');
const fs = require('fs');

// Detect directory context (root vs frontend subfolder)
const isFrontendDir = fs.existsSync(path.join(__dirname, 'src')) && fs.existsSync(path.join(__dirname, 'next.config.ts'));
const frontendDir = isFrontendDir ? __dirname : path.join(__dirname, '..', 'frontend');

// Resolve Next.js module
let next;
try {
  next = require('next');
} catch (err) {
  try {
    next = require(path.join(frontendDir, 'node_modules', 'next'));
  } catch (err2) {
    console.error('Failed to load "next" module. Please run "npm install".');
    process.exit(1);
  }
}

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || '0.0.0.0';
const port = parseInt(process.env.PORT || process.env.SERVER_PORT || '3000', 10);

const app = next({ dev, dir: frontendDir, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`==================================================`);
    console.log(`🚀 Rekindle Public Node Server Started`);
    console.log(`📡 Bound to: http://${hostname}:${port}`);
    console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`==================================================`);
  });

  const shutdown = () => {
    console.log('Stopping server gracefully...');
    server.close(() => {
      console.log('Server stopped.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}).catch((err) => {
  console.error('Error starting Next.js server:', err);
  process.exit(1);
});
