const http = require('http');
const https = require('https');
const { URL } = require('url');


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

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }


  let targetUrl;
  try {

    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    targetUrl = requestUrl.searchParams.get('url');
    
    console.log('Request URL:', req.url);
    console.log('Extracted targetUrl:', targetUrl);
    

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
  

  try {
    const decoded = decodeURIComponent(targetUrl);
    if (decoded !== targetUrl && decoded.includes('http')) {
      targetUrl = decoded;
    }
  } catch (e) {

    console.log('URL decode attempt failed, using as-is');
  }
  
  console.log('Final targetUrl:', targetUrl);

  try {
    const target = new URL(targetUrl);
    const proxy = getNextProxy();

    console.log(`Proxying ${targetUrl} through ${proxy.host}:${proxy.port}`);


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


          const isImage = target.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i) || 
                         target.hostname.includes('images.pump.fun');
          const acceptHeader = isImage 
            ? 'image/*,*/*;q=0.8'
            : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
          

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



            const headers = {
              'Content-Type': httpsRes.headers['content-type'] || (isImage ? 'image/png' : 'text/html'),
              'Access-Control-Allow-Origin': '*',
            };
            

            if ([301, 302, 307, 308].includes(httpsRes.statusCode)) {
              const redirectUrl = httpsRes.headers.location;
              if (redirectUrl) {
                console.log(`HTTPS redirect: ${targetUrl} -> ${redirectUrl}`);


                const redirectCount = req.redirectCount || 0;
                if (redirectCount < 5) {

                  httpsRes.destroy();
                  socket.destroy();
                  

                  const redirectTarget = new URL(redirectUrl);
                  const newTargetUrl = redirectUrl;
                  

                  const newConnectReq = http.request({
                    hostname: proxy.host,
                    port: proxy.port,
                    method: 'CONNECT',
                    path: `${redirectTarget.hostname}:${redirectTarget.port || 443}`,
                    headers: {
                      'Proxy-Authorization': 'Basic ' + Buffer.from(proxy.auth).toString('base64'),
                    },
                    timeout: 10000,
                  });
                  
                  newConnectReq.on('connect', (newProxyRes, newSocket, newHead) => {
                    if (newProxyRes.statusCode === 200) {
                      const newHttpsOptions = {
                        socket: newSocket,
                        agent: false,
                        hostname: redirectTarget.hostname,
                        port: redirectTarget.port || 443,
                        path: redirectTarget.pathname + redirectTarget.search,
                        method: 'GET',
                        headers: {
                          'Host': redirectTarget.hostname,
                          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                          'Accept': acceptHeader,
                          'Connection': 'close',
                        },
                        timeout: 10000,
                      };
                      
                      const newHttpsReq = https.request(newHttpsOptions, (newHttpsRes) => {
                        res.writeHead(newHttpsRes.statusCode, {
                          'Content-Type': newHttpsRes.headers['content-type'] || (isImage ? 'image/png' : 'text/html'),
                          'Access-Control-Allow-Origin': '*',
                        });
                        newHttpsRes.pipe(res);
                      });
                      
                      newHttpsReq.on('error', (err) => {
                        console.error(`Redirect HTTPS error: ${err.message}`);
                        if (!res.headersSent) {
                          res.writeHead(500, { 'Content-Type': 'text/plain' });
                          res.end(`Redirect error: ${err.message}`);
                        }
                      });
                      
                      if (newHead && newHead.length > 0) {
                        newSocket.unshift(newHead);
                      }
                      
                      newHttpsReq.end();
                    } else {
                      if (!res.headersSent) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end(`Redirect CONNECT failed: ${newProxyRes.statusCode}`);
                      }
                    }
                  });
                  
                  newConnectReq.on('error', (err) => {
                    console.error(`Redirect CONNECT error: ${err.message}`);
                    if (!res.headersSent) {
                      res.writeHead(500, { 'Content-Type': 'text/plain' });
                      res.end(`Redirect CONNECT error: ${err.message}`);
                    }
                  });
                  
                  newConnectReq.end();
                  return;
                }
              }
            }
            
            res.writeHead(httpsRes.statusCode, headers);
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

      if ([301, 302, 307, 308].includes(proxyRes.statusCode)) {
        const redirectUrl = proxyRes.headers.location;
        if (redirectUrl) {
          console.log(`Following redirect from ${targetUrl} to ${redirectUrl}`);

          const redirectCount = req.redirectCount || 0;
          if (redirectCount < 5) {
            req.redirectCount = redirectCount + 1;

            let finalRedirectUrl = redirectUrl;
            try {
              if (!redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://')) {
                finalRedirectUrl = new URL(redirectUrl, targetUrl).href;
              }
            } catch (e) {
              console.error(`Error resolving redirect URL: ${e.message}`);
              if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`Error resolving redirect URL: ${e.message}`);
              }
              return;
            }
            
            try {
              const redirectTarget = new URL(finalRedirectUrl);

              const redirectOptions = {
                hostname: proxy.host,
                port: proxy.port,
                path: finalRedirectUrl,
                method: 'GET',
                headers: {
                  'Host': redirectTarget.hostname,
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  'Accept': acceptHeader,
                  'Proxy-Authorization': 'Basic ' + Buffer.from(proxy.auth).toString('base64'),
                },
                timeout: 10000,
              };
              
              const redirectReq = http.request(redirectOptions, (redirectRes) => {
                const contentType = redirectRes.headers['content-type'] || 
                                  (isImage ? 'image/png' : 'text/html');
                
                const headers = {
                  'Content-Type': contentType,
                  'Access-Control-Allow-Origin': '*',
                };
                
                if (isImage && redirectRes.headers['content-length']) {
                  headers['Content-Length'] = redirectRes.headers['content-length'];
                }
                
                res.writeHead(redirectRes.statusCode, headers);
                redirectRes.pipe(res);
              });
              
              redirectReq.on('error', (err) => {
                console.error(`Redirect proxy error: ${err.message}`);
                if (!res.headersSent) {
                  res.writeHead(500, { 'Content-Type': 'text/plain' });
                  res.end(`Redirect proxy error: ${err.message}`);
                }
              });
              
              redirectReq.on('timeout', () => {
                redirectReq.destroy();
                console.error('Redirect proxy timeout');
                if (!res.headersSent) {
                  res.writeHead(504, { 'Content-Type': 'text/plain' });
                  res.end('Redirect proxy timeout');
                }
              });
              
              redirectReq.end();
              return;
            } catch (err) {
              console.error(`Error creating redirect request: ${err.message}`);
              if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`Error creating redirect request: ${err.message}`);
              }
              return;
            }
          } else {
            console.error('Too many redirects (max 5)');
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end('Too many redirects');
            }
            return;
          }
        }
      }
      

      const contentType = proxyRes.headers['content-type'] || 
                        (isImage ? 'image/png' : 'text/html');
      
      const headers = {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      };
      

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


});
