// Server for handling requests and generating proper meta tags for social media bots
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Check if request is from a bot
function isBot(userAgent) {
  if (!userAgent) return false;
  const botPatterns = [
    'twitterbot',
    'facebookexternalhit',
    'linkedinbot',
    'whatsapp',
    'slackbot',
    'telegrambot',
    'discordbot',
    'googlebot',
    'bingbot',
    'crawler',
    'spider',
    'bot'
  ];
  return botPatterns.some(pattern => userAgent.toLowerCase().includes(pattern));
}

// Extract token ID from path
function extractTokenId(pathname) {
  const parts = pathname.split('/').filter(p => p);
  const liveIndex = parts.indexOf('live');
  const coinIndex = parts.indexOf('coin');
  
  if (liveIndex >= 0 && parts[liveIndex + 1]) {
    return parts[liveIndex + 1];
  } else if (coinIndex >= 0 && parts[coinIndex + 1]) {
    return parts[coinIndex + 1];
  } else if (parts.length > 0) {
    return parts[parts.length - 1];
  }
  return null;
}

// Generate HTML with meta tags
function generateHTML(tokenId, host, pathname) {
  const currentUrl = `http://${host}${pathname}`;
  
  let coinName = 'Pump';
  let symbol = '';
  let description = 'Pump allows anyone to create coins. All coins created on Pump are fair-launch, meaning everyone has equal access to buy and sell when the coin is first created.';
  let imageUrl = `http://${host}/pump1.svg`;
  let coinImageUrl = `http://${host}/pump1.svg`;
  
  if (tokenId) {
    // Remove 'pump' suffix if present
    if (tokenId.endsWith('pump')) {
      tokenId = tokenId.slice(0, -4);
    }
    
    // Use images.pump.fun for coin image
    coinImageUrl = `https://images.pump.fun/coin-image/${tokenId}pump?variant=86x86`;
    
    // Use dynamic OG image generator for Twitter/OG preview
    // Will fetch coin name and symbol automatically
    imageUrl = `http://${host}/api/og-image?tokenId=${encodeURIComponent(tokenId)}&coinImage=${encodeURIComponent(coinImageUrl)}`;
    
    // Try to extract symbol from token ID
    if (tokenId.length > 4) {
      symbol = tokenId.slice(0, 4).toUpperCase();
    }
    
    coinName = `Token ${symbol}`;
    description = `Trade ${coinName} on Pump. ${description}`;
  }
  
  const title = tokenId ? `${coinName} (${symbol}) - Pump` : 'Pump - Create and trade coins';
  
  // Read index.html
  let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  
  // Replace meta tags
  html = html.replace(
    /<meta property="og:title"[^>]*>/i,
    `<meta property="og:title" content="${title}" id="og-title" />`
  );
  html = html.replace(
    /<meta property="og:description"[^>]*>/i,
    `<meta property="og:description" content="${description}" id="og-description" />`
  );
  html = html.replace(
    /<meta property="og:image"[^>]*>/i,
    `<meta property="og:image" content="${imageUrl}" id="og-image" />`
  );
  html = html.replace(
    /<meta property="og:url"[^>]*>/i,
    `<meta property="og:url" content="${currentUrl}" id="og-url" />`
  );
  
  html = html.replace(
    /<meta name="twitter:title"[^>]*>/i,
    `<meta name="twitter:title" content="${title}" id="twitter-title" />`
  );
  html = html.replace(
    /<meta name="twitter:description"[^>]*>/i,
    `<meta name="twitter:description" content="${description}" id="twitter-description" />`
  );
  html = html.replace(
    /<meta name="twitter:image"[^>]*>/i,
    `<meta name="twitter:image" content="${imageUrl}" id="twitter-image" />`
  );
  html = html.replace(
    /<meta name="twitter:url"[^>]*>/i,
    `<meta name="twitter:url" content="${currentUrl}" id="twitter-url" />`
  );
  
  html = html.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${title}</title>`
  );
  
  return html;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const userAgent = req.headers['user-agent'] || '';
  
  // Determine if this is a static file request FIRST, before bot/token checks
  const requestedExt = path.extname(pathname).toLowerCase();
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.json'];
  const isStaticFileRequest = staticExtensions.includes(requestedExt);
  
  // For static file requests, serve them directly (skip bot/token logic)
  if (isStaticFileRequest) {
    let filePath = path.join(__dirname, pathname);
    
    // Security: prevent directory traversal
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(__dirname))) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }
    
    // Content type mapping
    const contentTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject'
    };
    
    const contentType = contentTypes[requestedExt] || 'application/octet-stream';
    
    // Check if file exists
    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': contentType });
        res.end('');
        return;
      }
      
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': contentType });
          res.end('');
          return;
        }
        
        const headers = { 
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000'
        };
        res.writeHead(200, headers);
        res.end(data);
      });
    });
    return;
  }
  
  // Handle OG image generation endpoint
  if (pathname.startsWith('/api/og-image')) {
    const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const tokenId = urlParams.get('tokenId');
    const coinImage = urlParams.get('coinImage') || `https://images.pump.fun/coin-image/${tokenId}pump?variant=86x86`;
    const coinName = urlParams.get('name') || '';
    const symbol = urlParams.get('symbol') || '';
    
    // Import and use OG image generator
    const { handleOGImageRequest } = require('./api/og-image');
    handleOGImageRequest(req, res, tokenId, coinName, symbol, coinImage, req.headers.host);
    return;
  }
  
  // Check if it's a bot request (only for non-static files)
  const bot = isBot(userAgent);
  
  // Extract token ID from path
  const tokenId = extractTokenId(pathname);
  
  // If it's a bot or we have a token ID, generate HTML with proper meta tags
  if (bot || tokenId) {
    const html = generateHTML(tokenId, req.headers.host, pathname);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }
  
  // For regular HTML requests (non-static), serve index.html (SPA routing)
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  
  // Security: prevent directory traversal
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(__dirname))) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }
  
  // Check if file exists
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // For non-static files (HTML routes), serve index.html (SPA routing)
      filePath = path.join(__dirname, 'index.html');
    }
    
    // Determine content type based on the ACTUAL file extension
    const fileExt = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject'
    };
    const contentType = contentTypes[fileExt] || 'text/html; charset=utf-8';
    
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log('Bot detection enabled - meta tags will be generated for social media bots');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
