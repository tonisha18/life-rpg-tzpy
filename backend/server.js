const http = require('http');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.url === '/health' || req.url === '/') {
    res.statusCode = 200;
    res.end(JSON.stringify({
      status: 'online',
      service: 'Rekindle RPG Backend Services',
      timestamp: new Date().toISOString(),
      database: 'Supabase PostgreSQL',
      version: '2.1'
    }));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, HOST, () => {
  console.log(`==================================================`);
  console.log(`🚀 Rekindle Backend Service Running`);
  console.log(`📡 Bound to: http://${HOST}:${PORT}`);
  console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`==================================================`);
});
