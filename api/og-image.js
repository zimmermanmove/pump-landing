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
      
      http.get(proxyUrl, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            // Parse HTML
            const titleMatch = data.match(/<title>(.+?)<\/title>/i);
            if (titleMatch) {
              const titleText = titleMatch[1];
              const nameMatch = titleText.match(/(.+?)\s*\(([^)]+)\)/);
              if (nameMatch) {
                resolve({
                  name: nameMatch[1].trim(),
                  symbol: nameMatch[2].trim()
                });
                return;
              }
            }
          } catch (e) {
            console.log('Error parsing HTML:', e.message);
          }
          resolve(null);
        });
        res.on('error', () => resolve(null));
      }).on('error', () => resolve(null));
    } catch (error) {
      resolve(null);
    }
  });
}

async function generateOGImage(tokenId, coinName, symbol, coinImageUrl, host) {
  const bannerPath = path.join(__dirname, '..', 'assets', 'twitter-banner.png');
  
  // Check if banner exists
  if (!fs.existsSync(bannerPath)) {
    console.log('[OG IMAGE] Banner not found at:', bannerPath);
    console.log('[OG IMAGE] Using coin image as fallback');
    // Fallback to coin image
    return coinImageUrl;
  }

  try {
    // If sharp is available, use it for image generation
    if (sharp) {
      console.log('[OG IMAGE] Using Sharp to generate image');
      return await generateWithSharp(bannerPath, coinImageUrl, coinName, symbol);
    } else {
      // Fallback: return banner URL
      console.log('[OG IMAGE] Sharp not available, using banner URL');
      return `https://${host}/assets/twitter-banner.png`;
    }
  } catch (error) {
    console.error('[OG IMAGE] Error generating OG image:', error);
    return coinImageUrl;
  }
}

async function generateWithSharp(bannerPath, coinImageUrl, coinName, symbol) {
  try {
    // Load banner
    const banner = sharp(bannerPath);
    const bannerMetadata = await banner.metadata();
    const width = bannerMetadata.width || 1200;
    const height = bannerMetadata.height || 630;
    
    // Download coin image
    let coinImageBuffer = null;
    try {
      coinImageBuffer = await fetchImage(coinImageUrl);
    } catch (e) {
      console.log('Could not fetch coin image:', e.message);
    }
    
    // Prepare composites array
    const composites = [];
    
    // If we have coin image, add it to composites
    if (coinImageBuffer) {
      try {
        const coinImage = sharp(coinImageBuffer);
        // Resize coin image to 200x200, center it horizontally, position at top
        const coinResized = await coinImage
          .resize(200, 200, { 
            fit: 'contain', 
            background: { r: 0, g: 0, b: 0, alpha: 0 } 
          })
          .toBuffer();
        
        // Center horizontally, position at top (adjust as needed)
        const coinX = Math.floor((width - 200) / 2);
        const coinY = 50;
        
        composites.push({
          input: coinResized,
          top: coinY,
          left: coinX
        });
      } catch (e) {
        console.log('Error processing coin image:', e.message);
      }
    }
    
    // Add text overlay using SVG
    // Position text in center-bottom area
    const textY = height - 150; // Position from bottom
    const symbolY = height - 100;
    
    const textSVG = Buffer.from(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .coin-name { font-family: Arial, sans-serif; font-size: 56px; font-weight: bold; fill: white; }
            .coin-symbol { font-family: Arial, sans-serif; font-size: 40px; fill: #86EFAC; }
          </style>
        </defs>
        <text x="50%" y="${textY}" class="coin-name" text-anchor="middle" dominant-baseline="middle">
          ${escapeXml(coinName || 'Token')}
        </text>
        <text x="50%" y="${symbolY}" class="coin-symbol" text-anchor="middle" dominant-baseline="middle">
          ${escapeXml(symbol || '')}
        </text>
      </svg>
    `);
    
    composites.push({
      input: textSVG,
      top: 0,
      left: 0
    });
    
    // Apply all composites
    const output = await banner
      .composite(composites)
      .png()
      .toBuffer();
    
    return output;
  } catch (error) {
    console.error('Error in generateWithSharp:', error);
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

function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch image: ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Handler for OG image generation
async function handleOGImageRequest(req, res, tokenId, coinName, symbol, coinImageUrl, host) {
  try {
    console.log('[OG IMAGE] Request received:', { tokenId, coinName, symbol, coinImageUrl });
    
    // If coinName or symbol not provided, try to fetch from HTML
    if (tokenId && (!coinName || coinName === 'Token' || coinName.startsWith('Token ') || !symbol)) {
      try {
        console.log('[OG IMAGE] Fetching token data from HTML...');
        const tokenData = await fetchTokenDataFromHTML(tokenId);
        if (tokenData) {
          coinName = tokenData.name || coinName;
          symbol = tokenData.symbol || symbol;
          console.log('[OG IMAGE] Fetched token data:', { coinName, symbol });
        }
      } catch (e) {
        console.log('[OG IMAGE] Could not fetch token data:', e.message);
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

module.exports = { generateOGImage, handleOGImageRequest };
