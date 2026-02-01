// Webhook server for automatic deployment from GitHub
const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');
const path = require('path');

const PORT = process.env.WEBHOOK_PORT || 3002;
const SECRET = process.env.WEBHOOK_SECRET || 'your-secret-key-change-this';
const PROJECT_DIR = process.env.PROJECT_DIR || '/var/www/pump-landing';

// Verify GitHub webhook signature
function verifySignature(payload, signature) {
  const hmac = crypto.createHmac('sha256', SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// Execute git pull and restart PM2
function deploy() {
  return new Promise((resolve, reject) => {
    const commands = [
      `cd ${PROJECT_DIR}`,
      'git fetch origin',
      'git reset --hard origin/main',
      'pm2 restart all'
    ].join(' && ');

    exec(commands, (error, stdout, stderr) => {
      if (error) {
        console.error(`Deployment error: ${error.message}`);
        reject(error);
        return;
      }
      console.log(`Deployment output: ${stdout}`);
      if (stderr) {
        console.error(`Deployment stderr: ${stderr}`);
      }
      resolve(stdout);
    });
  });
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  let body = '';
  
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      const signature = req.headers['x-hub-signature-256'];
      
      // Verify signature if provided
      if (signature && !verifySignature(body, signature)) {
        console.error('Invalid signature');
        res.writeHead(401);
        res.end('Unauthorized');
        return;
      }

      const payload = JSON.parse(body);
      
      // Only deploy on push to main branch
      if (payload.ref === 'refs/heads/main' && payload.repository) {
        console.log('Deployment triggered by push to main');
        
        deploy()
          .then(() => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Deployment completed' }));
          })
          .catch((error) => {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
          });
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'No deployment needed' }));
      }
    } catch (error) {
      console.error('Webhook error:', error);
      res.writeHead(400);
      res.end('Bad Request');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Webhook server running on port ${PORT}`);
  console.log(`Project directory: ${PROJECT_DIR}`);
  console.log(`Webhook URL: http://your-server:${PORT}/webhook`);
});
