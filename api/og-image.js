
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');


let sharp = null;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Sharp not available, will use fallback method');
}


function fetchTokenDataFromHTML(coinId) {
  return new Promise((resolve) => {
    if (!coinId) {
      resolve(null);
      return;
    }
    
    try {
      const fullCoinId = coinId.endsWith('pump') ? coinId : `${coinId}pump`;
      const targetUrl = `https://pump.fun/coin/${fullCoinId}`;
      
      // Use local proxy for faster loading
      const proxyUrl = `http://localhost:3001/proxy?url=${encodeURIComponent(targetUrl)}`;
      
      console.log('[OG IMAGE] Fetching from proxy:', proxyUrl);
      
      http.get(proxyUrl, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            let coinName = null;
            let coinSymbol = null;
            


            const titleMatch = data.match(/<title>(.+?)<\/title>/i);
            if (titleMatch) {
              const titleText = titleMatch[1];

              const nameMatch = titleText.match(/(.+?)\s*\(([^)]+)\)\s*-\s*Pump/i);
              if (nameMatch) {
                coinName = nameMatch[1].trim();
                coinSymbol = nameMatch[2].trim();
              } else {

                const nameMatch2 = titleText.match(/(.+?)\s*-\s*Pump/i);
                if (nameMatch2) {
                  coinName = nameMatch2[1].trim();
                }
              }
            }
            

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
  

  if (!fs.existsSync(bannerPath)) {
    console.log('[OG IMAGE] generateOGImage: Banner not found at:', bannerPath);
    console.log('[OG IMAGE] generateOGImage: Using coin image as fallback');

    return coinImageUrl;
  }

  console.log('[OG IMAGE] generateOGImage: Banner file exists');

  try {

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

      console.log('[OG IMAGE] generateOGImage: Sharp not available, using banner file directly');
      // Return banner file path for direct serving
      return bannerPath;
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
    

    console.log('[OG IMAGE] generateWithSharp: Loading banner from:', bannerPath);
    const banner = sharp(bannerPath);
    const bannerMetadata = await banner.metadata();
    const width = bannerMetadata.width || 1200;
    const height = bannerMetadata.height || 630;
    console.log('[OG IMAGE] generateWithSharp: Banner dimensions:', { width, height });
    

    let coinImageBuffer = null;
    try {
      console.log('[OG IMAGE] generateWithSharp: Fetching coin image from:', coinImageUrl);
      // Fast fetch with timeout
      const fetchPromise = fetchImage(coinImageUrl);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000)); // 2 second timeout
      coinImageBuffer = await Promise.race([fetchPromise, timeoutPromise]);
      if (coinImageBuffer) {
        console.log('[OG IMAGE] generateWithSharp: Successfully fetched coin image, size:', coinImageBuffer.length);
      } else {
        console.log('[OG IMAGE] generateWithSharp: Coin image fetch returned null/empty');
      }
    } catch (e) {
      console.log('[OG IMAGE] generateWithSharp: Could not fetch coin image (timeout or error):', e.message);
      // Continue without coin image - banner will still be generated with text only
    }
    

    const composites = [];
    

    if (coinImageBuffer) {
      try {
        console.log('[OG IMAGE] generateWithSharp: Processing coin image...');
        const coinImage = sharp(coinImageBuffer);

        // Resize coin image - make it larger and position on right side like in screenshot
        const coinSize = Math.min(500, Math.floor(height * 0.7)); // 70% of height, max 500px
        const coinResized = await coinImage
          .resize(coinSize, coinSize, { 
            fit: 'contain', 
            background: { r: 0, g: 0, b: 0, alpha: 0 } 
          })
          .toBuffer();
        

        // Position coin image on the right side (like in screenshot)
        const coinX = width - coinSize - 100; // More margin from right 
        const coinY = Math.floor((height - coinSize) / 2); 
        
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
    


    const textCenterY = Math.floor(height / 2);
    

    // Text positioning - left side like in screenshot
    const nameLines = splitTextIntoLines(coinName || 'Token', 20);
    const lineHeight = 90; // Slightly larger line height 
    const nameStartY = textCenterY - (nameLines.length - 1) * lineHeight / 2;
    

    // Symbol below name
    const symbolY = nameStartY + nameLines.length * lineHeight + 30;
    
    console.log('[OG IMAGE] generateWithSharp: Text positions:', { nameStartY, symbolY, nameLines, coinName, symbol });
    

    let nameTextSVG = '';
    nameLines.forEach((line, index) => {
      const yPos = nameStartY + index * lineHeight;
      nameTextSVG += `<tspan x="100" y="${yPos}" dominant-baseline="middle">${escapeXml(line)}</tspan>`;
    });
    
    const textSVG = Buffer.from(`
      <svg width="${width}" height="${height}" xmlns="http:
        <defs>
          <style>
            .coin-name { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 80px; font-weight: 700; fill: white; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
            .coin-symbol { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 52px; font-weight: 600; fill: #86EFAC; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
          </style>
        </defs>
        <text x="100" y="${nameStartY}" class="coin-name">
          ${nameTextSVG}
        </text>
        <text x="100" y="${symbolY}" class="coin-symbol" dominant-baseline="middle">
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


function splitTextIntoLines(text, maxCharsPerLine = 20) {
  if (!text) return [''];
  const words = String(text).split(/\s+/);
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }

      if (word.length > maxCharsPerLine) {

        for (let i = 0; i < word.length; i += maxCharsPerLine) {
          lines.push(word.substring(i, i + maxCharsPerLine));
        }
        currentLine = '';
      } else {
        currentLine = word;
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines.length > 0 ? lines : [''];
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
        timeout: 3000, // Fast timeout 3 seconds
        followRedirect: false 
      }, (res) => {
        console.log('[OG IMAGE] fetchImage: Response status:', res.statusCode, 'Content-Type:', res.headers['content-type'], 'Location:', res.headers['location']);
        

        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let redirectUrl = res.headers.location;
          

          if (!redirectUrl.startsWith('http')) {
            const urlObj = new URL(currentUrl);
            if (redirectUrl.startsWith('/')) {
              redirectUrl = `${urlObj.protocol}
            } else {
              redirectUrl = `${urlObj.protocol}
            }
          }
          
          console.log('[OG IMAGE] fetchImage: Following redirect to:', redirectUrl);

          res.resume();

          makeRequest(redirectUrl, redirectCount + 1);
          return;
        }
        
        if (res.statusCode !== 200) {

          if (currentUrl.includes('images.pump.fun')) {
            console.log('[OG IMAGE] fetchImage: Direct fetch failed, trying proxy...');
            const proxyUrl = `http:
            http.get(proxyUrl, (proxyRes) => {

              if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
                console.log('[OG IMAGE] fetchImage: Proxy returned redirect, following...');
                makeRequest(proxyRes.headers.location, redirectCount + 1);
                return;
              }
              
              if (proxyRes.statusCode !== 200) {
                reject(new Error(`Proxy fetch failed: ${proxyRes.statusCode}`));
                return;
              }
              

              const contentType = proxyRes.headers['content-type'] || '';
              if (contentType.includes('text/html')) {
                console.log('[OG IMAGE] fetchImage: Proxy returned HTML, trying direct with redirect...');

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

        if (currentUrl.includes('images.pump.fun')) {
          console.log('[OG IMAGE] fetchImage: Trying proxy fallback...');
          const proxyUrl = `http:
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
      
      request.setTimeout(3000, () => { // Fast timeout 3 seconds
        request.destroy();
        reject(new Error('Image fetch timeout'));
      });
    };
    
    makeRequest(url);
  });
}


async function handleOGImageRequest(req, res, tokenId, coinName, symbol, coinImageUrl, host) {
  let responseSent = false;
  
  // Helper function to send response safely
  const sendResponse = (statusCode, headers, data) => {
    if (responseSent) {
      console.warn('[OG IMAGE] Response already sent, ignoring duplicate response');
      return;
    }
    responseSent = true;
    try {
      if (res.headersSent) {
        console.warn('[OG IMAGE] Headers already sent, cannot send response');
        return;
      }
      res.writeHead(statusCode, headers);
      if (data) {
        res.end(data);
      } else {
        res.end();
      }
    } catch (err) {
      console.error('[OG IMAGE] Error sending response:', err.message);
    }
  };
  
  // Fallback function to redirect to coin image
  const redirectToCoinImage = () => {
    const fallbackUrl = coinImageUrl || 'https://images.pump.fun/coin-image/defaultpump?variant=86x86';
    console.log('[OG IMAGE] Fallback: redirecting to coin image:', fallbackUrl);
    sendResponse(302, { 
      'Location': fallbackUrl,
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*'
    });
  };
  
  try {
    console.log('[OG IMAGE] Request received:', { tokenId, coinName, symbol, coinImageUrl });
    

    // Fast fetch token data with timeout (don't wait too long)
    if (tokenId) {
      try {
        console.log('[OG IMAGE] Fetching token data from HTML for tokenId:', tokenId);
        const tokenDataPromise = fetchTokenDataFromHTML(tokenId);
        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 1500)); // Fast timeout 1.5 seconds
        const tokenData = await Promise.race([tokenDataPromise, timeoutPromise]);
        
        if (tokenData) {
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
          console.log('[OG IMAGE] No token data fetched from HTML (timeout or error)');
        }
      } catch (e) {
        console.log('[OG IMAGE] Could not fetch token data:', e.message);
      }
    }
    
    // Always generate banner, even if coinName is "Loading..." or empty
    // Use provided coinName or default to "Loading..."
    const displayName = coinName || 'Loading...';
    const displaySymbol = symbol || '';
    
    // Generate image with timeout to prevent hanging
    const generatePromise = generateOGImage(tokenId, displayName, displaySymbol, coinImageUrl, host);
    const generateTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Image generation timeout')), 5000)); // 5 second timeout
    
    let image;
    try {
      image = await Promise.race([generatePromise, generateTimeout]);
    } catch (err) {
      console.error('[OG IMAGE] Image generation failed or timed out:', err.message);
      redirectToCoinImage();
      return;
    }
    
    if (image && Buffer.isBuffer(image)) {
      console.log('[OG IMAGE] Generated image buffer, size:', image.length);
      sendResponse(200, {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      }, image);
      return;
    } else if (image && typeof image === 'string') {
      // Check if it's a file path (not starting with http)
      if (!image.startsWith('http') && fs.existsSync(image)) {
        console.log('[OG IMAGE] Serving banner file from path:', image);
        try {
          const bannerData = fs.readFileSync(image);
          sendResponse(200, {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*'
          }, bannerData);
          return;
        } catch (err) {
          console.error('[OG IMAGE] Error reading banner file:', err.message);
        }
      } else if (image.startsWith('http')) {
        console.log('[OG IMAGE] Redirecting to URL:', image);
        sendResponse(302, { 
          'Location': image,
          'Cache-Control': 'public, max-age=300',
          'Access-Control-Allow-Origin': '*'
        });
        return;
      } else {
        // Try default banner path
        const bannerPath = path.join(__dirname, '..', 'assets', 'twitter-banner.png');
        if (fs.existsSync(bannerPath)) {
          console.log('[OG IMAGE] Serving default banner file');
          try {
            const bannerData = fs.readFileSync(bannerPath);
            sendResponse(200, {
              'Content-Type': 'image/png',
              'Cache-Control': 'public, max-age=3600',
              'Access-Control-Allow-Origin': '*'
            }, bannerData);
            return;
          } catch (err) {
            console.error('[OG IMAGE] Error reading default banner file:', err.message);
          }
        } else {
          console.log('[OG IMAGE] Banner not found, redirecting to coin image');
        }
      }
    } else {
      console.log('[OG IMAGE] No image generated, using fallback');
    }
    
    // Fallback: redirect to coin image
    redirectToCoinImage();
  } catch (error) {
    console.error('[OG IMAGE] Error handling OG image request:', error);
    console.error('[OG IMAGE] Error stack:', error.stack);
    
    // Fallback: redirect to coin image
    if (!responseSent) {
      redirectToCoinImage();
    }
  }
}

module.exports = { generateOGImage, handleOGImageRequest, fetchTokenDataFromHTML };
