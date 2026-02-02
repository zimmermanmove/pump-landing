// Dynamic OG image generator - creates banner with coin icon and name
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Check if sharp is available (for image processing)
let sharp = null;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Sharp not available, will use fallback method');
}

// Fetch token data from pump.fun (similar to token-loader.js)
function fetchTokenDataFromHTML(coinId) {
  return new Promise((resolve) => {
    if (!coinId) {
      resolve(null);
      return;
    }
    
    try {
      const fullCoinId = coinId.endsWith('pump') ? coinId : `${coinId}pump`;
      const targetUrl = `https://pump.fun/coin/${fullCoinId}`;
      
      // Try to fetch through proxy
      const proxyUrl = `http://localhost:3001/?url=${encodeURIComponent(targetUrl)}`;
      
      console.log('[OG IMAGE] Fetching from proxy:', proxyUrl);
      
      http.get(proxyUrl, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            let coinName = null;
            let coinSymbol = null;
            
            // Parse HTML - try multiple methods
            // Method 1: Parse title tag
            const titleMatch = data.match(/<title>(.+?)<\/title>/i);
            if (titleMatch) {
              const titleText = titleMatch[1];
              // Try format with parentheses: "Name (SYMBOL) - Pump"
              const nameMatch = titleText.match(/(.+?)\s*\(([^)]+)\)\s*-\s*Pump/i);
              if (nameMatch) {
                coinName = nameMatch[1].trim();
                coinSymbol = nameMatch[2].trim();
              } else {
                // Try format without parentheses: "Name - Pump"
                const nameMatch2 = titleText.match(/(.+?)\s*-\s*Pump/i);
                if (nameMatch2) {
                  coinName = nameMatch2[1].trim();
                }
              }
            }
            
            // Method 2: Parse og:title meta tag
            if (!coinName || !coinSymbol) {
              const ogTitleMatch = data.match(/<meta\s+property=["']og:title["']\s+content=["'](.+?)["']/i);
              if (ogTitleMatch) {
                const ogTitleText = ogTitleMatch[1];
                const ogMatch = ogTitleText.match(/(.+?)\s*\(([^)]+)\)/);
                if (ogMatch) {
                  if (!coinName) coinName = ogMatch[1].trim();
                  if (!coinSymbol) coinSymbol = ogMatch[2].trim();
                }
              }
            }
            
            // Method 3: Try to find in h1, h2 tags
            if (!coinName || !coinSymbol) {
              const h1Match = data.match(/<h1[^>]*>(.+?)<\/h1>/i);
              if (h1Match) {
                const h1Text = h1Match[1].replace(/<[^>]+>/g, '').trim();
                const h1NameMatch = h1Text.match(/(.+?)\s*\(([^)]+)\)/);
                if (h1NameMatch) {
                  if (!coinName) coinName = h1NameMatch[1].trim();
                  if (!coinSymbol) coinSymbol = h1NameMatch[2].trim();
                } else if (!coinName) {
                  coinName = h1Text;
                }
              }
            }
            
            // Method 4: Try to find in JSON-LD structured data
            if (!coinName || !coinSymbol) {
              const jsonLdMatches = data.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.+?)<\/script>/gis);
              if (jsonLdMatches) {
                for (const jsonLd of jsonLdMatches) {
                  try {
                    const jsonContent = jsonLd.match(/<script[^>]*>(.+?)<\/script>/is)[1];
                    const jsonData = JSON.parse(jsonContent);
                    if (jsonData.name && !coinName) coinName = jsonData.name;
                    if (jsonData.symbol && !coinSymbol) coinSymbol = jsonData.symbol;
                  } catch (e) {
                    // Not valid JSON, continue
                  }
                }
              }
            }
            
            if (coinName || coinSymbol) {
              console.log('[OG IMAGE] Parsed token data:', { coinName, coinSymbol });
              resolve({
                name: coinName,
                symbol: coinSymbol
              });
              return;
            }
          } catch (e) {
            console.log('[OG IMAGE] Error parsing HTML:', e.message);
          }
          resolve(null);
        });
        res.on('error', (err) => {
          console.log('[OG IMAGE] Error receiving data:', err.message);
          resolve(null);
        });
      }).on('error', (err) => {
        console.log('[OG IMAGE] Error fetching from proxy:', err.message);
        resolve(null);
      });
    } catch (error) {
      console.log('[OG IMAGE] Error in fetchTokenDataFromHTML:', error.message);
      resolve(null);
    }
  });
}

async function generateOGImage(tokenId, coinName, symbol, coinImageUrl, host) {
  const bannerPath = path.join(__dirname, '..', 'assets', 'twitter-banner.png');
  
  console.log('[OG IMAGE] generateOGImage: Starting, banner path:', bannerPath);
  console.log('[OG IMAGE] generateOGImage: Sharp available:', !!sharp);
  
  // Check if banner exists
  if (!fs.existsSync(bannerPath)) {
    console.log('[OG IMAGE] generateOGImage: Banner not found at:', bannerPath);
    console.log('[OG IMAGE] generateOGImage: Using coin image as fallback');
    // Fallback to coin image
    return coinImageUrl;
  }

  console.log('[OG IMAGE] generateOGImage: Banner file exists');

  try {
    // If sharp is available, use it for image generation
    if (sharp) {
      console.log('[OG IMAGE] generateOGImage: Using Sharp to generate image');
      const result = await generateWithSharp(bannerPath, coinImageUrl, coinName, symbol);
      if (result) {
        console.log('[OG IMAGE] generateOGImage: Image generated successfully');
      } else {
        console.log('[OG IMAGE] generateOGImage: Image generation returned null, using fallback');
      }
      return result;
    } else {
      // Fallback: return banner URL
      console.log('[OG IMAGE] generateOGImage: Sharp not available, using banner URL');
      return `https://${host}/assets/twitter-banner.png`;
    }
  } catch (error) {
    console.error('[OG IMAGE] generateOGImage: Error generating OG image:', error.message);
    console.error('[OG IMAGE] generateOGImage: Error stack:', error.stack);
    return coinImageUrl;
  }
}

async function generateWithSharp(bannerPath, coinImageUrl, coinName, symbol) {
  try {
    console.log('[OG IMAGE] generateWithSharp: Starting generation');
    console.log('[OG IMAGE] generateWithSharp: Parameters:', { bannerPath, coinImageUrl, coinName, symbol });
    
    // Load banner
    console.log('[OG IMAGE] generateWithSharp: Loading banner from:', bannerPath);
    const banner = sharp(bannerPath);
    const bannerMetadata = await banner.metadata();
    const width = bannerMetadata.width || 1200;
    const height = bannerMetadata.height || 630;
    console.log('[OG IMAGE] generateWithSharp: Banner dimensions:', { width, height });
    
    // Download coin image
    let coinImageBuffer = null;
    try {
      console.log('[OG IMAGE] generateWithSharp: Fetching coin image from:', coinImageUrl);
      coinImageBuffer = await fetchImage(coinImageUrl);
      if (coinImageBuffer) {
        console.log('[OG IMAGE] generateWithSharp: Successfully fetched coin image, size:', coinImageBuffer.length);
      } else {
        console.log('[OG IMAGE] generateWithSharp: Coin image fetch returned null/empty');
      }
    } catch (e) {
      console.log('[OG IMAGE] generateWithSharp: Could not fetch coin image:', e.message);
      console.log('[OG IMAGE] generateWithSharp: Error stack:', e.stack);
    }
    
    // Prepare composites array
    const composites = [];
    
    // If we have coin image, add it to composites - position on RIGHT side
    if (coinImageBuffer) {
      try {
        console.log('[OG IMAGE] generateWithSharp: Processing coin image...');
        const coinImage = sharp(coinImageBuffer);
        // Resize coin image to 300x300 for better visibility
        const coinSize = 300;
        const coinResized = await coinImage
          .resize(coinSize, coinSize, { 
            fit: 'contain', 
            background: { r: 0, g: 0, b: 0, alpha: 0 } 
          })
          .toBuffer();
        
        // Position on RIGHT side, vertically centered
        const coinX = width - coinSize - 80; // 80px margin from right
        const coinY = Math.floor((height - coinSize) / 2); // Vertically centered
        
        console.log('[OG IMAGE] generateWithSharp: Coin image position:', { coinX, coinY, coinSize });
        
        composites.push({
          input: coinResized,
          top: coinY,
          left: coinX
        });
        console.log('[OG IMAGE] generateWithSharp: Coin image added to composites');
      } catch (e) {
        console.log('[OG IMAGE] generateWithSharp: Error processing coin image:', e.message);
        console.log('[OG IMAGE] generateWithSharp: Error stack:', e.stack);
      }
    } else {
      console.log('[OG IMAGE] generateWithSharp: No coin image buffer, skipping coin composite');
    }
    
    // Add text overlay using SVG - position on LEFT side
    // Calculate vertical center for text
    const textCenterY = Math.floor(height / 2);
    const nameY = textCenterY - 30; // Name above center
    const symbolY = textCenterY + 40; // Symbol below center
    
    console.log('[OG IMAGE] generateWithSharp: Text positions:', { nameY, symbolY, coinName, symbol });
    
    const textSVG = Buffer.from(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .coin-name { font-family: Arial, sans-serif; font-size: 72px; font-weight: bold; fill: white; }
            .coin-symbol { font-family: Arial, sans-serif; font-size: 48px; fill: #86EFAC; }
          </style>
        </defs>
        <text x="80" y="${nameY}" class="coin-name" dominant-baseline="middle">
          ${escapeXml(coinName || 'Token')}
        </text>
        <text x="80" y="${symbolY}" class="coin-symbol" dominant-baseline="middle">
          ${escapeXml(symbol || '')}
        </text>
      </svg>
    `);
    
    composites.push({
      input: textSVG,
      top: 0,
      left: 0
    });
    console.log('[OG IMAGE] generateWithSharp: Text SVG added to composites, total composites:', composites.length);
    
    // Apply all composites
    console.log('[OG IMAGE] generateWithSharp: Applying composites...');
    const output = await banner
      .composite(composites)
      .png()
      .toBuffer();
    
    console.log('[OG IMAGE] generateWithSharp: Image generated successfully, size:', output.length);
    return output;
  } catch (error) {
    console.error('[OG IMAGE] generateWithSharp: Error:', error.message);
    console.error('[OG IMAGE] generateWithSharp: Error stack:', error.stack);
    return null;
  }
}

function escapeXml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function fetchImage(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    console.log('[OG IMAGE] fetchImage: Starting fetch for', url);
    
    const protocol = url.startsWith('https') ? https : http;
    
    const makeRequest = (currentUrl, redirectCount = 0) => {
      if (redirectCount > maxRedirects) {
        reject(new Error('Too many redirects'));
        return;
      }
      
      const request = protocol.get(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*,*/*'
        },
        timeout: 10000,
        followRedirect: false // We'll handle redirects manually
      }, (res) => {
        console.log('[OG IMAGE] fetchImage: Response status:', res.statusCode, 'Content-Type:', res.headers['content-type'], 'Location:', res.headers['location']);
        
        // Handle redirects (301, 302, 307, 308)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let redirectUrl = res.headers.location;
          
          // Handle relative redirects
          if (!redirectUrl.startsWith('http')) {
            const urlObj = new URL(currentUrl);
            if (redirectUrl.startsWith('/')) {
              redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
            } else {
              redirectUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}/${redirectUrl}`;
            }
          }
          
          console.log('[OG IMAGE] fetchImage: Following redirect to:', redirectUrl);
          // Drain the response before following redirect
          res.resume();
          // Follow redirect
          makeRequest(redirectUrl, redirectCount + 1);
          return;
        }
        
        if (res.statusCode !== 200) {
          // If direct fetch fails, try through proxy
          if (currentUrl.includes('images.pump.fun')) {
            console.log('[OG IMAGE] fetchImage: Direct fetch failed, trying proxy...');
            const proxyUrl = `http://localhost:3001/?url=${encodeURIComponent(currentUrl)}`;
            http.get(proxyUrl, (proxyRes) => {
              // Handle proxy redirects too
              if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
                console.log('[OG IMAGE] fetchImage: Proxy returned redirect, following...');
                makeRequest(proxyRes.headers.location, redirectCount + 1);
                return;
              }
              
              if (proxyRes.statusCode !== 200) {
                reject(new Error(`Proxy fetch failed: ${proxyRes.statusCode}`));
                return;
              }
              
              // Check if proxy returned HTML instead of image
              const contentType = proxyRes.headers['content-type'] || '';
              if (contentType.includes('text/html')) {
                console.log('[OG IMAGE] fetchImage: Proxy returned HTML, trying direct with redirect...');
                // Try direct fetch with redirect handling
                makeRequest(currentUrl, redirectCount + 1);
                return;
              }
              
              const chunks = [];
              proxyRes.on('data', (chunk) => chunks.push(chunk));
              proxyRes.on('end', () => {
                const buffer = Buffer.concat(chunks);
                console.log('[OG IMAGE] fetchImage: Proxy fetch successful, size:', buffer.length);
                resolve(buffer);
              });
              proxyRes.on('error', reject);
            }).on('error', (err) => {
              console.log('[OG IMAGE] fetchImage: Proxy error:', err.message);
              reject(err);
            });
            return;
          }
          reject(new Error(`Failed to fetch image: ${res.statusCode}`));
          return;
        }
        
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          console.log('[OG IMAGE] fetchImage: Direct fetch successful, size:', buffer.length);
          resolve(buffer);
        });
        res.on('error', reject);
      });
      
      request.on('error', (err) => {
        console.log('[OG IMAGE] fetchImage: Request error:', err.message);
        // Try proxy as fallback
        if (currentUrl.includes('images.pump.fun')) {
          console.log('[OG IMAGE] fetchImage: Trying proxy fallback...');
          const proxyUrl = `http://localhost:3001/?url=${encodeURIComponent(currentUrl)}`;
          http.get(proxyUrl, (proxyRes) => {
            if (proxyRes.statusCode !== 200) {
              reject(new Error(`Proxy fetch failed: ${proxyRes.statusCode}`));
              return;
            }
            const chunks = [];
            proxyRes.on('data', (chunk) => chunks.push(chunk));
            proxyRes.on('end', () => {
              const buffer = Buffer.concat(chunks);
              console.log('[OG IMAGE] fetchImage: Proxy fallback successful, size:', buffer.length);
              resolve(buffer);
            });
            proxyRes.on('error', reject);
          }).on('error', reject);
        } else {
          reject(err);
        }
      });
      
      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error('Image fetch timeout'));
      });
    };
    
    makeRequest(url);
  });
}

// Handler for OG image generation
async function handleOGImageRequest(req, res, tokenId, coinName, symbol, coinImageUrl, host) {
  try {
    console.log('[OG IMAGE] Request received:', { tokenId, coinName, symbol, coinImageUrl });
    
    // Always try to fetch from HTML if we have tokenId (to get real name, not "Token XXX")
    if (tokenId) {
      try {
        console.log('[OG IMAGE] Fetching token data from HTML for tokenId:', tokenId);
        const tokenData = await fetchTokenDataFromHTML(tokenId);
        if (tokenData) {
          // Use fetched data if available, otherwise keep what was passed
          if (tokenData.name && tokenData.name !== 'Token' && !tokenData.name.startsWith('Token ')) {
            coinName = tokenData.name;
            console.log('[OG IMAGE] Using fetched coin name:', coinName);
          }
          if (tokenData.symbol) {
            symbol = tokenData.symbol;
            console.log('[OG IMAGE] Using fetched symbol:', symbol);
          }
          console.log('[OG IMAGE] Final token data:', { coinName, symbol });
        } else {
          console.log('[OG IMAGE] No token data fetched from HTML');
        }
      } catch (e) {
        console.log('[OG IMAGE] Could not fetch token data:', e.message);
        console.log('[OG IMAGE] Error stack:', e.stack);
      }
    }
    
    const image = await generateOGImage(tokenId, coinName, symbol, coinImageUrl, host);
    
    if (image && Buffer.isBuffer(image)) {
      console.log('[OG IMAGE] Generated image buffer, size:', image.length);
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(image);
      return;
    } else if (image && typeof image === 'string') {
      // If it's a URL, redirect to it
      if (image.startsWith('http')) {
        console.log('[OG IMAGE] Redirecting to URL:', image);
        res.writeHead(302, { 'Location': image });
        res.end();
        return;
      } else {
        // Serve the banner file directly
        const bannerPath = path.join(__dirname, '..', 'assets', 'twitter-banner.png');
        if (fs.existsSync(bannerPath)) {
          console.log('[OG IMAGE] Serving banner file directly');
          const bannerData = fs.readFileSync(bannerPath);
          res.writeHead(200, {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(bannerData);
          return;
        } else {
          console.log('[OG IMAGE] Banner not found, redirecting to coin image');
        }
      }
    } else {
      console.log('[OG IMAGE] No image generated, using fallback');
    }
    
    // Fallback to coin image
    console.log('[OG IMAGE] Fallback: redirecting to coin image:', coinImageUrl);
    res.writeHead(302, { 
      'Location': coinImageUrl,
      'Cache-Control': 'public, max-age=300'
    });
    res.end();
  } catch (error) {
    console.error('[OG IMAGE] Error handling OG image request:', error);
    // Fallback to coin image on error
    res.writeHead(302, { 
      'Location': coinImageUrl,
      'Cache-Control': 'public, max-age=300'
    });
    res.end();
  }
}

module.exports = { generateOGImage, handleOGImageRequest, fetchTokenDataFromHTML };
