
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
  console.log('[OG IMAGE] generateOGImage: Starting, tokenId:', tokenId);
  console.log('[OG IMAGE] generateOGImage: Sharp available:', !!sharp);

  try {
    if (sharp) {
      console.log('[OG IMAGE] generateOGImage: Using Sharp to generate image');
      const result = await generateWithSharp(tokenId, coinImageUrl, coinName, symbol);
      if (result) {
        console.log('[OG IMAGE] generateOGImage: Image generated successfully');
      } else {
        console.log('[OG IMAGE] generateOGImage: Image generation returned null, using fallback');
      }
      return result;
    } else {
      console.log('[OG IMAGE] generateOGImage: Sharp not available, using coin image as fallback');
      return coinImageUrl;
    }
  } catch (error) {
    console.error('[OG IMAGE] generateOGImage: Error generating OG image:', error.message);
    console.error('[OG IMAGE] generateOGImage: Error stack:', error.stack);
    return coinImageUrl;
  }
}

async function generateWithSharp(tokenId, coinImageUrl, coinName, symbol) {
  try {
    console.log('[OG IMAGE] generateWithSharp: Starting generation');
    console.log('[OG IMAGE] generateWithSharp: Parameters:', { tokenId, coinImageUrl, coinName, symbol });
    
    // Fetch banner from API
    let bannerBuffer = null;
    try {
      const fullCoinId = tokenId && tokenId.endsWith('pump') ? tokenId : `${tokenId || ''}pump`;
      const bannerUrl = `https://frontend-api-v3.pump.fun/coins/add-banner?coinId=${encodeURIComponent(fullCoinId)}`;
      console.log('[OG IMAGE] generateWithSharp: Fetching banner from API:', bannerUrl);
      
      // Try to fetch banner - API might return JSON with image URL or the image itself
      const bannerResponse = await fetchBannerFromAPI(bannerUrl);
      
      if (bannerResponse && bannerResponse.buffer) {
        bannerBuffer = bannerResponse.buffer;
        console.log('[OG IMAGE] generateWithSharp: Successfully fetched banner from API, size:', bannerBuffer.length, 'Content-Type:', bannerResponse.contentType);
      } else if (bannerResponse && bannerResponse.imageUrl) {
        // API returned JSON with image URL, fetch the actual image
        console.log('[OG IMAGE] generateWithSharp: API returned image URL, fetching:', bannerResponse.imageUrl);
        try {
          const fetchPromise = fetchImage(bannerResponse.imageUrl);
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Banner image fetch timeout')), 3000));
          bannerBuffer = await Promise.race([fetchPromise, timeoutPromise]);
          if (bannerBuffer) {
            console.log('[OG IMAGE] generateWithSharp: Successfully fetched banner image from URL, size:', bannerBuffer.length);
          }
        } catch (e) {
          console.log('[OG IMAGE] generateWithSharp: Could not fetch banner image from URL:', e.message);
        }
      } else {
        console.log('[OG IMAGE] generateWithSharp: Banner fetch returned null/empty');
      }
    } catch (e) {
      console.log('[OG IMAGE] generateWithSharp: Could not fetch banner from API (timeout or error):', e.message);
      console.log('[OG IMAGE] generateWithSharp: Error stack:', e.stack);
      // Fallback to local banner if API fails
      const bannerPath = path.join(__dirname, '..', 'assets', 'twitter-banner.png');
      if (fs.existsSync(bannerPath)) {
        console.log('[OG IMAGE] generateWithSharp: Using local banner as fallback');
        bannerBuffer = fs.readFileSync(bannerPath);
      } else {
        console.log('[OG IMAGE] generateWithSharp: No local banner found, will create blank banner');
      }
    }
    
    // Resize banner to standard OG image size (1200x630)
    const width = 1200;
    const height = 630;
    
    let resizedBanner;
    if (bannerBuffer) {
      const banner = sharp(bannerBuffer);
      resizedBanner = await banner.resize(width, height, { fit: 'cover' });
      console.log('[OG IMAGE] generateWithSharp: Banner dimensions:', { width, height });
    } else {
      // Create a blank banner with gradient background if no banner available
      console.log('[OG IMAGE] generateWithSharp: Creating blank banner with gradient');
      const gradientSVG = Buffer.from(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#1a1a1a;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#0a0a0a;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="${width}" height="${height}" fill="url(#grad)"/>
        </svg>
      `);
      resizedBanner = sharp(gradientSVG).resize(width, height);
    }
    

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

        // Resize coin image - larger size like in original (about 55% of height)
        const coinSize = Math.min(350, Math.floor(height * 0.55)); // 55% of height, max 350px
        const coinResized = await coinImage
          .resize(coinSize, coinSize, { 
            fit: 'contain', 
            background: { r: 0, g: 0, b: 0, alpha: 0 } 
          })
          .toBuffer();
        
        // Create rounded corners mask using SVG
        const borderRadius = 24; // Rounded corners radius
        const roundedMaskSVG = Buffer.from(`
          <svg width="${coinSize}" height="${coinSize}" xmlns="http://www.w3.org/2000/svg">
            <rect width="${coinSize}" height="${coinSize}" rx="${borderRadius}" ry="${borderRadius}" fill="white"/>
          </svg>
        `);
        
        // Apply rounded corners mask to coin image
        const coinWithRoundedCorners = await sharp(coinResized)
          .composite([{ input: roundedMaskSVG, blend: 'dest-in' }])
          .toBuffer();

        // Position coin image on the right side (like in original)
        const coinX = width - coinSize - 50; // 50px margin from right
        const coinY = Math.floor((height - coinSize) / 2); 
        
        console.log('[OG IMAGE] generateWithSharp: Coin image position:', { coinX, coinY, coinSize });
        
        composites.push({
          input: coinWithRoundedCorners,
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
    

    // Text positioning - left side like in original
    const nameLines = splitTextIntoLines(coinName || 'Token', 20);
    const lineHeight = 70; // Smaller line height for compact look
    const nameStartY = textCenterY - (nameLines.length - 1) * lineHeight / 2 - 20; // Adjust for symbol
    

    // Symbol below name (closer to name)
    const symbolY = nameStartY + nameLines.length * lineHeight + 15;
    
    console.log('[OG IMAGE] generateWithSharp: Text positions:', { nameStartY, symbolY, nameLines, coinName, symbol });
    

    let nameTextSVG = '';
    nameLines.forEach((line, index) => {
      const yPos = nameStartY + index * lineHeight;
      nameTextSVG += `<tspan x="60" y="${yPos}" dominant-baseline="middle">${escapeXml(line)}</tspan>`;
    });
    
    // Build SVG with inline styles to avoid parsing issues (smaller fonts like original)
    const svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
<text x="60" y="${nameStartY}" font-family="Arial, sans-serif" font-size="64" font-weight="700" fill="white">
${nameTextSVG}
</text>
<text x="60" y="${symbolY}" font-family="Arial, sans-serif" font-size="40" font-weight="600" fill="#86EFAC" dominant-baseline="middle">${escapeXml(symbol || '')}</text>
</svg>`;
    
    const textSVG = Buffer.from(svgContent);
    
    composites.push({
      input: textSVG,
      top: 0,
      left: 0
    });
    console.log('[OG IMAGE] generateWithSharp: Text SVG added to composites, total composites:', composites.length);
    

    console.log('[OG IMAGE] generateWithSharp: Applying composites...');
    const output = await resizedBanner
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

async function fetchBannerFromAPI(url) {
  return new Promise((resolve) => {
    console.log('[OG IMAGE] fetchBannerFromAPI: Starting fetch for', url);
    
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json,image/*,*/*'
      },
      timeout: 3000
    }, (res) => {
      console.log('[OG IMAGE] fetchBannerFromAPI: Response status:', res.statusCode, 'Content-Type:', res.headers['content-type']);
      
      // Handle error status codes
      if (res.statusCode !== 200) {
        console.log('[OG IMAGE] fetchBannerFromAPI: API returned error status:', res.statusCode);
        res.resume(); // Consume response to free up memory
        resolve(null);
        return;
      }
      
      const contentType = res.headers['content-type'] || '';
      const chunks = [];
      
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log('[OG IMAGE] fetchBannerFromAPI: Received data, size:', buffer.length);
        
        if (buffer.length === 0) {
          console.log('[OG IMAGE] fetchBannerFromAPI: Empty response');
          resolve(null);
          return;
        }
        
        // Check if response is JSON
        if (contentType.includes('application/json') || contentType.includes('text/json')) {
          try {
            const jsonData = JSON.parse(buffer.toString());
            console.log('[OG IMAGE] fetchBannerFromAPI: API returned JSON:', JSON.stringify(jsonData).substring(0, 200));
            
            // Try to find image URL in JSON response
            const imageUrl = jsonData.banner || jsonData.image || jsonData.url || jsonData.bannerUrl || jsonData.imageUrl;
            if (imageUrl) {
              console.log('[OG IMAGE] fetchBannerFromAPI: Found image URL in JSON:', imageUrl);
              resolve({ imageUrl });
              return;
            } else {
              console.log('[OG IMAGE] fetchBannerFromAPI: No image URL found in JSON response');
              resolve(null);
              return;
            }
          } catch (e) {
            console.log('[OG IMAGE] fetchBannerFromAPI: Error parsing JSON:', e.message);
            resolve(null);
            return;
          }
        }
        
        // Check if response is an image
        if (contentType.includes('image/')) {
          console.log('[OG IMAGE] fetchBannerFromAPI: Response is an image (Content-Type)');
          resolve({ buffer, contentType });
          return;
        }
        
        // Try to validate it's actually an image by checking magic bytes
        if (buffer.length > 2) {
          const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8;
          const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
          const isGIF = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
          
          if (isJPEG || isPNG || isGIF) {
            console.log('[OG IMAGE] fetchBannerFromAPI: Response is an image (magic bytes detected)');
            resolve({ buffer, contentType: isJPEG ? 'image/jpeg' : isPNG ? 'image/png' : 'image/gif' });
            return;
          }
        }
        
        console.log('[OG IMAGE] fetchBannerFromAPI: Response is not an image or JSON with URL, Content-Type:', contentType);
        resolve(null);
      });
      res.on('error', (err) => {
        console.log('[OG IMAGE] fetchBannerFromAPI: Response error:', err.message);
        resolve(null);
      });
    });
    
    request.on('error', (err) => {
      console.log('[OG IMAGE] fetchBannerFromAPI: Request error:', err.message);
      resolve(null);
    });
    
    request.setTimeout(3000, () => {
      request.destroy();
      console.log('[OG IMAGE] fetchBannerFromAPI: Request timeout');
      resolve(null);
    });
  });
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
              redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
            } else {
              redirectUrl = `${urlObj.protocol}//${urlObj.host}/${redirectUrl}`;
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
            const proxyUrl = `http://localhost:3001/proxy?url=${encodeURIComponent(currentUrl)}`;
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
          const proxyUrl = `http://localhost:3001/proxy?url=${encodeURIComponent(currentUrl)}`;
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
