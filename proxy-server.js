const http = require('http');
const https = require('https');
const { URL } = require('url');

// Proxy list
const proxies = [
  { host: 'res.proxy-seller.com', port: 10255, auth: '474d9e084208332f:QsYn3Fvt' },
  { host: 'res.proxy-seller.com', port: 10256, auth: '474d9e084208332f:QsYn3Fvt' },
  { host: 'res.proxy-seller.com', port: 10257, auth: '474d9e084208332f:QsYn3Fvt' },
  { host: 'res.proxy-seller.com', port: 10258, auth: '474d9e084208332f:QsYn3Fvt' },
  { host: 'res.proxy-seller.com', port: 10259, auth: '474d9e084208332f:QsYn3Fvt' },
  { host: 'res.proxy-seller.com', port: 10260, auth: '474d9e084208332f:QsYn3Fvt' },
  { host: 'res.proxy-seller.com', port: 10261, auth: '474d9e084208332f:QsYn3Fvt' },
  { host: 'res.proxy-seller.com', port: 10262, auth: '474d9e084208332f:QsYn3Fvt' },
  { host: 'res.proxy-seller.com', port: 10263, auth: '474d9e084208332f:QsYn3Fvt' },
  { host: 'res.proxy-seller.com', port: 10264, auth: '474d9e084208332f:QsYn3Fvt' },
  { host: 'res.proxy-seller.com', port: 10265, auth: '474d9e084208332f:QsYn3Fvt' },
  { host: 'res.proxy-seller.com', port: 10266, auth: '474d9e084208332f:QsYn3Fvt' },
  { host: 'res.proxy-seller.com', port: 10267, auth: '474d9e084208332f:QsYn3Fvt' },
  { host: 'res.proxy-seller.com', port: 10268, auth: '474d9e084208332f:QsYn3Fvt' },
  { host: 'res.proxy-seller.com', port: 10269, auth: '474d9e084208332f:QsYn3Fvt' },
];

let currentProxyIndex = 0;

function getNextProxy() {
  const proxy = proxies[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % proxies.length;
  return proxy;
}

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Get target URL from query parameter
  let targetUrl;
  try {
    // Parse the request URL
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    targetUrl = requestUrl.searchParams.get('url');
    
    console.log('Request URL:', req.url);
    console.log('Extracted targetUrl:', targetUrl);
    
    // If no url param, try to extract from path manually
    if (!targetUrl) {
      const urlMatch = req.url.match(/[?&]url=([^&]+)/);
      if (urlMatch) {
        targetUrl = decodeURIComponent(urlMatch[1]);
        console.log('Extracted from regex:', targetUrl);
      }
    }
  } catch (err) {
    console.error('Error parsing URL:', err.message, req.url);
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end(`Invalid URL format: ${err.message}`);
    return;
  }

  if (!targetUrl) {
    console.error('Missing url parameter in request:', req.url);
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Missing url parameter');
    return;
  }
  
  // Decode URL if needed (may be double-encoded)
  try {
    const decoded = decodeURIComponent(targetUrl);
    if (decoded !== targetUrl && decoded.includes('http')) {
      targetUrl = decoded;
    }
  } catch (e) {
    // Already decoded or invalid, use as is
    console.log('URL decode attempt failed, using as-is');
  }
  
  console.log('Final targetUrl:', targetUrl);

  try {
    const target = new URL(targetUrl);
    const proxy = getNextProxy();

    console.log(`Proxying ${targetUrl} through ${proxy.host}:${proxy.port}`);

    // Use HTTP CONNECT method for HTTPS through HTTP proxy
    if (target.protocol === 'https:') {
      const options = {
        hostname: proxy.host,
        port: proxy.port,
        method: 'CONNECT',
        path: `${target.hostname}:${target.port || 443}`,
        headers: {
          'Proxy-Authorization': 'Basic ' + Buffer.from(proxy.auth).toString('base64'),
        },
        timeout: 10000,
      };

      const connectReq = http.request(options);
      
      connectReq.on('connect', (proxyRes, socket, head) => {
        if (proxyRes.statusCode === 200) {
          // Create HTTPS request through the tunnel using Node.js https module
          // Determine Accept header based on URL (images need image/*)
          const isImage = target.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i) || 
                         target.hostname.includes('images.pump.fun');
          const acceptHeader = isImage 
            ? 'image/*,*/*;q=0.8'
            : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
          
          // Use https.request with the socket from CONNECT tunnel
          const httpsOptions = {
            socket: socket,
            agent: false,
            hostname: target.hostname,
            port: target.port || 443,
            path: target.pathname + target.search,
            method: 'GET',
            headers: {
              'Host': target.hostname,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': acceptHeader,
              'Connection': 'close',
            },
            timeout: 10000,
          };
          
          const httpsReq = https.request(httpsOptions, (httpsRes) => {
            // Set CORS headers
            res.writeHead(httpsRes.statusCode, {
              ...httpsRes.headers,
              'Access-Control-Allow-Origin': '*',
            });
            
            // Pipe response to client
            httpsRes.pipe(res);
          });
          
          httpsReq.on('error', (err) => {
            console.error(`HTTPS request error: ${err.message}`);
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end(`HTTPS request error: ${err.message}`);
            } else {
              res.end();
            }
          });
          
          httpsReq.on('timeout', () => {
            httpsReq.destroy();
            console.error('HTTPS request timeout');
            if (!res.headersSent) {
              res.writeHead(504, { 'Content-Type': 'text/plain' });
              res.end('HTTPS request timeout');
            }
          });
          
          // Handle any data that came before the request (shouldn't happen, but just in case)
          if (head && head.length > 0) {
            socket.unshift(head);
          }
          
          httpsReq.end();
        } else {
          console.error(`Proxy CONNECT failed with status: ${proxyRes.statusCode}`);
          res.writeHead(proxyRes.statusCode, { 'Content-Type': 'text/plain' });
          res.end(`Proxy CONNECT failed: ${proxyRes.statusCode}`);
        }
      });

      connectReq.on('error', (err) => {
        console.error(`CONNECT error: ${err.message}`);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`CONNECT error: ${err.message}`);
      });

      connectReq.end();
      return;
    }

    // For HTTP requests, use regular proxy
    // Determine Accept header based on URL (images need image/*)
    const isImage = target.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i) || 
                   target.hostname.includes('images.pump.fun') ||
                   target.pathname.includes('coin-image') ||
                   target.searchParams.has('variant');
    const acceptHeader = isImage 
      ? 'image/*,*/*;q=0.8'
      : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
    
    const options = {
      hostname: proxy.host,
      port: proxy.port,
      path: targetUrl,
      method: 'GET',
      headers: {
        'Host': target.hostname,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': acceptHeader,
        'Proxy-Authorization': 'Basic ' + Buffer.from(proxy.auth).toString('base64'),
      },
      timeout: 10000,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      // Preserve original Content-Type, especially for images
      const contentType = proxyRes.headers['content-type'] || 
                        (isImage ? 'image/png' : 'text/html');
      
      const headers = {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      };
      
      // Preserve other important headers for images
      if (isImage && proxyRes.headers['content-length']) {
        headers['Content-Length'] = proxyRes.headers['content-length'];
      }
      
      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error(`Proxy error: ${err.message}`);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Proxy error: ${err.message}`);
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      res.writeHead(504, { 'Content-Type': 'text/plain' });
      res.end('Proxy timeout');
    });

    proxyReq.end();
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end(`Invalid URL: ${err.message}`);
  }
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  // console.log(`Proxy server running on http://${HOST}:${PORT}`);
  // console.log(`Use: http://${HOST}:${PORT}/?url=https://pump.fun/coin/...`);
});
