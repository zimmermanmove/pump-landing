
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';


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


async function generateHTML(tokenId, host, pathname, req) {

  const protocol = (req && (req.headers['cf-visitor'] || req.headers['x-forwarded-proto'] === 'https')) ? 'https' : 
                   (host.includes('testsol.top') || host.includes('localhost') === false) ? 'https' : 'http';
  const currentUrl = `${protocol}://${host}${pathname}`;
  
  let coinName = 'Pump';
  let symbol = '';
  let description = 'Pump allows anyone to create coins. All coins created on Pump are fair-launch, meaning everyone has equal access to buy and sell when the coin is first created.';
  let imageUrl = `${protocol}://${host}/pump1.svg`;
  let coinImageUrl = `${protocol}://${host}/pump1.svg`;
  
  if (tokenId) {

    let cleanTokenId = tokenId;
    if (tokenId.endsWith('pump')) {
      cleanTokenId = tokenId.slice(0, -4);
    }
    

    coinImageUrl = `https://images.pump.fun/coin-image/${cleanTokenId}pump?variant=86x86`;
    

    try {
      const { fetchTokenDataFromHTML } = require('./api/og-image');
      const tokenData = await Promise.race([
        fetchTokenDataFromHTML(cleanTokenId),
        new Promise(resolve => setTimeout(() => resolve(null), 2000)) // Faster timeout 2 seconds
      ]);
      
      if (tokenData && tokenData.name && tokenData.name !== 'Token' && !tokenData.name.startsWith('Token ')) {
        coinName = tokenData.name;
        symbol = tokenData.symbol || '';
        console.log('[SERVER] Fetched token data for bot:', { coinName, symbol });
      } else {

        if (cleanTokenId.length > 4) {
          symbol = cleanTokenId.slice(0, 4).toUpperCase();
        }
        coinName = `Token ${symbol}`;
        console.log('[SERVER] Using fallback token name:', coinName);
      }
    } catch (e) {
      console.log('[SERVER] Error fetching token data, using fallback:', e.message);

      if (cleanTokenId.length > 4) {
        symbol = cleanTokenId.slice(0, 4).toUpperCase();
      }
      coinName = `Token ${symbol}`;
    }
    
    description = `Trade ${coinName} on Pump. ${description}`;
    


    imageUrl = `https://images.pump.fun/coin-image/${cleanTokenId}pump?variant=86x86`;
  }
  
  // Generate OG image with banner, coin icon and name (always if we have tokenId)
  if (tokenId) {
    // cleanTokenId is defined inside the if block above, so we need to extract it again
    let tokenIdForOG = tokenId;
    if (tokenId.endsWith('pump')) {
      tokenIdForOG = tokenId.slice(0, -4);
    }
    // Always generate banner, even if coinName is "Loading..." or "Token XXX"
    // The banner will show "Loading..." if real name is not available
    const displayName = (coinName && coinName !== 'Pump' && !coinName.startsWith('Token ')) ? coinName : 'Loading...';
    const displaySymbol = symbol || (cleanTokenId && cleanTokenId.length > 4 ? cleanTokenId.slice(0, 4).toUpperCase() : '');
    const ogImageUrl = `${protocol}://${host}/api/og-image?tokenId=${encodeURIComponent(tokenIdForOG)}&name=${encodeURIComponent(displayName)}&symbol=${encodeURIComponent(displaySymbol)}&coinImage=${encodeURIComponent(imageUrl)}`;
    imageUrl = ogImageUrl;
  }
  
  // Only set real title if we have real token data, otherwise show "Loading..."
  let title;
  if (tokenId) {
    // Check if coinName is a real name (not generated fallback)
    if (coinName && coinName !== 'Pump' && !coinName.startsWith('Token ') && coinName !== `Token ${symbol}`) {
      title = `${coinName}${symbol ? ` (${symbol})` : ''} - Pump`;
    } else {
      // Show "Loading..." for fallback/generated names
      title = 'Loading... - Pump';
    }
  } else {
    title = 'Pump - Create and trade coins';
  }
  

  let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  

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
  

  // Proxy route for images and external resources - check BEFORE static files
  if (pathname === '/proxy') {
    const urlParams = new URL(req.url, `http://${req.headers.host}`);
    const targetUrl = urlParams.searchParams.get('url');
    
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing url parameter');
      return;
    }
    
    // Proxy the request through proxy-server with timeout
    try {
      const proxyPort = process.env.PROXY_PORT || 3001;
      const proxyUrl = `http://localhost:${proxyPort}/proxy?url=${encodeURIComponent(targetUrl)}`;
      
      const proxyReq = http.get(proxyUrl, { timeout: 3000 }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, {
          'Content-Type': proxyRes.headers['content-type'] || 'application/octet-stream',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, max-age=3600'
        });
        proxyRes.pipe(res);
      });
      
      proxyReq.on('timeout', () => {
        proxyReq.destroy();
        if (!res.headersSent) {
          res.writeHead(504, { 'Content-Type': 'text/plain' });
          res.end('Proxy timeout');
        }
      });
      
      proxyReq.on('error', (err) => {
        console.error('[SERVER] Proxy error:', err.message);
        if (!res.headersSent) {
          res.writeHead(500, { 
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*'
          });
          res.end('Proxy error');
        }
      });
    } catch (err) {
      console.error('[SERVER] Proxy setup error:', err.message);
      if (!res.headersSent) {
        res.writeHead(500, { 
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        });
        res.end('Proxy setup error');
      }
    }
    return;
  }

  const requestedExt = path.extname(pathname).toLowerCase();
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.json'];
  const isStaticFileRequest = staticExtensions.includes(requestedExt);
  

  if (isStaticFileRequest) {
    let filePath = path.join(__dirname, pathname);
    

    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(__dirname))) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }
    

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

  if (pathname.startsWith('/api/og-image')) {
    const urlParams = new URL(req.url, `http://${req.headers.host}`);
    const tokenId = urlParams.get('tokenId');
    const coinImage = urlParams.get('coinImage') || `https://images.pump.fun/coin-image/defaultpump?variant=86x86`;
    const coinName = urlParams.get('name') || '';
    const symbol = urlParams.get('symbol') || '';
    

    const { handleOGImageRequest } = require('./api/og-image');
    handleOGImageRequest(req, res, tokenId, coinName, symbol, coinImage, req.headers.host);
    return;
  }
  

  const bot = isBot(userAgent);
  

  const tokenId = extractTokenId(pathname);
  

  if (bot || tokenId) {
    generateHTML(tokenId, req.headers.host, pathname, req)
      .then(html => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      })
      .catch(err => {
        console.error('[SERVER] Error generating HTML:', err);

        const filePath = path.join(__dirname, 'index.html');
        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(data);
          }
        });
      });
    return;
  }
  

  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  

  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(__dirname))) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }
  

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {

      filePath = path.join(__dirname, 'index.html');
    }
    

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
