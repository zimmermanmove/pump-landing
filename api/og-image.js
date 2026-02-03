
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
            
            // Try to extract description from meta tags or content
            let description = null;
            const ogDescriptionMatch = data.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
            if (ogDescriptionMatch) {
              description = ogDescriptionMatch[1].trim();
            } else {
              // Try meta name="description"
              const metaDescriptionMatch = data.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
              if (metaDescriptionMatch) {
                description = metaDescriptionMatch[1].trim();
              }
            }
            
            if (coinName || coinSymbol) {
              console.log('[OG IMAGE] Parsed token data:', { coinName, coinSymbol, description });
              resolve({
                name: coinName,
                symbol: coinSymbol,
                description: description
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

async function generateOGImage(tokenId, coinName, symbol, coinImageUrl, host, description) {
  console.log('[OG IMAGE] generateOGImage: Starting, tokenId:', tokenId);
  console.log('[OG IMAGE] generateOGImage: Sharp available:', !!sharp);

  try {
    if (sharp) {
      console.log('[OG IMAGE] generateOGImage: Using Sharp to generate image');
      const result = await generateWithSharp(tokenId, coinImageUrl, coinName, symbol, description);
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

async function generateWithSharp(tokenId, coinImageUrl, coinName, symbol, description) {
  try {
    console.log('[OG IMAGE] generateWithSharp: Starting generation');
    console.log('[OG IMAGE] generateWithSharp: Parameters:', { tokenId, coinImageUrl, coinName, symbol, description });
    
    // Use banner2.png as template (user provided)
    let bannerBuffer = null;
    const bannerPath = path.join(__dirname, '..', 'assets', 'banner2.png');
    
    if (fs.existsSync(bannerPath)) {
      console.log('[OG IMAGE] generateWithSharp: Using banner2.png from assets');
      try {
        bannerBuffer = fs.readFileSync(bannerPath);
        console.log('[OG IMAGE] generateWithSharp: Loaded banner template, size:', bannerBuffer.length);
      } catch (e) {
        console.log('[OG IMAGE] generateWithSharp: Error reading banner2.png:', e.message);
      }
    }
    
    // If no banner found, create blank gradient banner
    if (!bannerBuffer) {
      console.log('[OG IMAGE] generateWithSharp: No banner found, will create blank gradient banner');
    }
    
    // Use banner in original size (no resizing)
    let bannerSharp;
    let width, height;
    let circleCoords = null; // Will store circle coordinates from banner
    
    if (bannerBuffer) {
      bannerSharp = sharp(bannerBuffer);
      const bannerMetadata = await bannerSharp.metadata();
      width = bannerMetadata.width;
      height = bannerMetadata.height;
      console.log('[OG IMAGE] generateWithSharp: Using banner in original size:', { width, height });
      
      // Calculate image coordinates based on banner dimensions
      // Image is typically on the right side, centered vertically
      // Use fixed dimensions: 420x409 with corner radius 17
      const imageWidth = 420;
      const imageHeight = 409;
      const cornerRadius = 17;
      const imageX = width - imageWidth - Math.floor(width * 0.066); // 7.2% margin from right (slightly right)
      const imageY = Math.floor((height - imageHeight) / 2) + 3; // Slightly below center (5px down)
      
      circleCoords = {
        width: imageWidth,
        height: imageHeight,
        diameter: Math.max(imageWidth, imageHeight), // Keep for compatibility
        x: imageX,
        y: imageY,
        cornerRadius: cornerRadius
      };
      
      console.log('[OG IMAGE] generateWithSharp: Calculated image coordinates:', circleCoords);
    } else {
      // Create a blank banner with gradient background if no banner available
      console.log('[OG IMAGE] generateWithSharp: Creating blank banner with gradient');
      width = 1200;
      height = 630;
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
      bannerSharp = sharp(gradientSVG);
    }
    

    let coinImageBuffer = null;
    try {
      console.log('[OG IMAGE] generateWithSharp: Fetching coin image from:', coinImageUrl);
      
      // Try to get higher quality image - replace variant=86x86 with larger variant or remove it
      let highQualityUrl = coinImageUrl;
      if (coinImageUrl.includes('variant=86x86')) {
        // Try larger variant first (200x200 or 400x400)
        highQualityUrl = coinImageUrl.replace('variant=86x86', 'variant=400x400');
        console.log('[OG IMAGE] generateWithSharp: Trying high quality variant:', highQualityUrl);
      } else if (coinImageUrl.includes('images.pump.fun/coin-image/') && !coinImageUrl.includes('variant=')) {
        // If no variant, try to add larger variant
        const baseUrl = coinImageUrl.split('?')[0];
        highQualityUrl = `${baseUrl}?variant=400x400`;
        console.log('[OG IMAGE] generateWithSharp: Trying high quality variant:', highQualityUrl);
      }
      
      // Try high quality first, fallback to original URL
      let fetchPromise = fetchImage(highQualityUrl);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000)); // 3 second timeout for larger image
      
      try {
        coinImageBuffer = await Promise.race([fetchPromise, timeoutPromise]);
        if (coinImageBuffer) {
          console.log('[OG IMAGE] generateWithSharp: Successfully fetched high quality coin image, size:', coinImageBuffer.length);
        }
      } catch (e) {
        console.log('[OG IMAGE] generateWithSharp: High quality fetch failed, trying original URL:', e.message);
        // Fallback to original URL
        fetchPromise = fetchImage(coinImageUrl);
        const fallbackTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000));
        coinImageBuffer = await Promise.race([fetchPromise, fallbackTimeout]);
        if (coinImageBuffer) {
          console.log('[OG IMAGE] generateWithSharp: Successfully fetched coin image (fallback), size:', coinImageBuffer.length);
        }
      }
      
      if (!coinImageBuffer) {
        console.log('[OG IMAGE] generateWithSharp: Coin image fetch returned null/empty');
      }
    } catch (e) {
      console.log('[OG IMAGE] generateWithSharp: Could not fetch coin image (timeout or error):', e.message);
      // Continue without coin image - banner will still be generated with text only
    }
    

    const composites = [];
    

    if (coinImageBuffer && circleCoords) {
      try {
        console.log('[OG IMAGE] generateWithSharp: Processing coin image...');
        const coinImage = sharp(coinImageBuffer);

        // Use exact dimensions from banner analysis: 420x409
        const coinWidth = circleCoords.width;
        const coinHeight = circleCoords.height;
        const cornerRadius = circleCoords.cornerRadius || 17;
        
        // Get original image dimensions to check if we need to upscale
        const coinMetadata = await coinImage.metadata();
        console.log('[OG IMAGE] generateWithSharp: Original coin image size:', { width: coinMetadata.width, height: coinMetadata.height });
        console.log('[OG IMAGE] generateWithSharp: Target size:', { width: coinWidth, height: coinHeight });
        
        // Resize coin image to exactly match the size of the original image in the banner
        // Use maximum quality settings for best image quality
        // If upscaling, use best algorithm; if downscaling, also use best algorithm
        const coinResized = await coinImage
          .resize(coinWidth, coinHeight, { 
            fit: 'cover', // Use cover to fill completely, cropping if needed
            kernel: coinMetadata.width < coinWidth ? 'lanczos3' : 'lanczos3', // Always use lanczos3 for best quality
            background: { r: 0, g: 0, b: 0, alpha: 0 },
            withoutEnlargement: false, // Allow upscaling if needed
            fastShrinkOnLoad: false // Disable fast shrink for better quality
          })
          .png({ 
            quality: 100, 
            compressionLevel: 0, // 0 = no compression (best quality, larger file)
            palette: false, // Disable palette for better quality
            effort: 10 // Maximum effort for compression (best quality)
          })
          .toBuffer();

        // Create rounded rectangle mask to match the shape of the original image area
        // Use high resolution for smooth edges
        const roundedRectMaskSVG = Buffer.from(`
          <svg width="${coinWidth}" height="${coinHeight}" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="blur">
                <feGaussianBlur in="SourceAlpha" stdDeviation="0.5"/>
              </filter>
            </defs>
            <rect width="${coinWidth}" height="${coinHeight}" rx="${cornerRadius}" ry="${cornerRadius}" fill="white" filter="url(#blur)"/>
          </svg>
        `);
        
        // Apply rounded rectangle mask to coin image with maximum quality
        const coinWithRoundedMask = await sharp(coinResized)
          .composite([{ input: roundedRectMaskSVG, blend: 'dest-in' }])
          .png({ 
            quality: 100, 
            compressionLevel: 0, // 0 = no compression (best quality)
            palette: false, // Disable palette for better quality
            effort: 10 // Maximum effort for compression (best quality)
          })
          .toBuffer();

        // Use exact coordinates from banner analysis - replace the original image completely
        const coinX = circleCoords.x;
        const coinY = circleCoords.y;
        
        console.log('[OG IMAGE] generateWithSharp: Coin image position (replacing original image):', { 
          coinX, 
          coinY, 
          coinWidth, 
          coinHeight,
          cornerRadius,
          bannerWidth: width, 
          bannerHeight: height 
        });
        
        // Use 'over' blend mode to completely replace the original image
        // The coin image will completely cover the original image in that area
        composites.push({
          input: coinWithRoundedMask,
          top: coinY,
          left: coinX,
          blend: 'over' // Replace the original image completely
        });
        console.log('[OG IMAGE] generateWithSharp: Coin image added to composites (replacing original)');
      } catch (e) {
        console.log('[OG IMAGE] generateWithSharp: Error processing coin image:', e.message);
        console.log('[OG IMAGE] generateWithSharp: Error stack:', e.stack);
      }
    } else {
      if (!coinImageBuffer) {
        console.log('[OG IMAGE] generateWithSharp: No coin image buffer, skipping coin composite');
      }
      if (!circleCoords) {
        console.log('[OG IMAGE] generateWithSharp: No circle coordinates, skipping coin composite');
      }
    }
    

    // Text positioning - left side like in original pump.fun
    // Order: 1. Symbol (top, very large), 2. Name (below symbol, smaller but still large), 3. Description (if exists, smallest)
    const textCenterY = Math.floor(height / 2);
    
    // 1. Symbol (very large white, top) - like "SATu" in original (much larger)
    const symbolFontSize = 110; // Very large like in original
    const symbolY = textCenterY - 50; // Positioned above center
    
    // 2. Name (smaller white, below symbol, but still large) - like "Satu Wallet" in original
    const nameLines = splitTextIntoLines(coinName || 'Token', 25);
    const nameFontSize = 64; // Smaller than symbol but still quite large
    const nameLineHeight = 75; // Line height for name
    const nameStartY = symbolY + symbolFontSize + 25; // Below symbol with more spacing
    
    // 3. Description (smallest, below name, if exists)
    // Limit description to prevent overlapping with BUY button at bottom
    let descriptionY = null;
    let descriptionLines = [];
    let descriptionSVG = '';
    if (description && description.trim() && description !== 'Token' && !description.startsWith('Trade')) {
      // Calculate max height for description (leave space for BUY button at bottom)
      // BUY button is typically around 60-80px from bottom, so limit description to not exceed that
      const maxDescriptionHeight = height - (nameStartY + nameLines.length * nameLineHeight + 25) - 100; // 100px margin for button
      const descriptionFontSize = 28; // Smallest font for description
      const descriptionLineHeight = 36;
      const maxDescriptionLines = Math.floor(maxDescriptionHeight / descriptionLineHeight);
      
      // Split description into lines with more characters per line for compactness
      descriptionLines = splitTextIntoLines(description, 45); // More characters per line for compact display
      
      // Limit number of lines to prevent overlapping with button
      if (descriptionLines.length > maxDescriptionLines) {
        descriptionLines = descriptionLines.slice(0, maxDescriptionLines);
        // Add ellipsis to last line if truncated
        if (descriptionLines.length > 0) {
          const lastLine = descriptionLines[descriptionLines.length - 1];
          if (lastLine.length > 40) {
            descriptionLines[descriptionLines.length - 1] = lastLine.substring(0, 37) + '...';
          } else {
            descriptionLines[descriptionLines.length - 1] = lastLine + '...';
          }
        }
      }
      
      descriptionY = nameStartY + nameLines.length * nameLineHeight + 25; // Below name with spacing
      
      descriptionLines.forEach((line, index) => {
        const yPos = descriptionY + index * descriptionLineHeight;
        descriptionSVG += `<tspan x="60" y="${yPos}" dominant-baseline="middle">${escapeXml(line)}</tspan>`;
      });
      
      console.log('[OG IMAGE] generateWithSharp: Description limited to', descriptionLines.length, 'lines to prevent button overlap');
    }

    console.log('[OG IMAGE] generateWithSharp: Text positions:', { symbolY, nameStartY, descriptionY, nameLines, descriptionLines, coinName, symbol });

    let nameTextSVG = '';
    nameLines.forEach((line, index) => {
      const yPos = nameStartY + index * nameLineHeight;
      nameTextSVG += `<tspan x="60" y="${yPos}" dominant-baseline="middle">${escapeXml(line)}</tspan>`;
    });
    
    // Build SVG with inline styles - matching original pump.fun style
    // Order: Symbol (large), Name (smaller), Description (smallest, if exists)
    const svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
<text x="60" y="${symbolY}" font-family="Arial, sans-serif" font-size="${symbolFontSize}" font-weight="700" fill="white" dominant-baseline="middle">${escapeXml(symbol || '')}</text>
<text x="60" y="${nameStartY}" font-family="Arial, sans-serif" font-size="${nameFontSize}" font-weight="600" fill="white">
${nameTextSVG}
</text>
${descriptionSVG ? `<text x="60" y="${descriptionY}" font-family="Arial, sans-serif" font-size="32" font-weight="400" fill="white" opacity="0.9">
${descriptionSVG}
</text>` : ''}
</svg>`;
    
    const textSVG = Buffer.from(svgContent);
    
    composites.push({
      input: textSVG,
      top: 0,
      left: 0
    });
    console.log('[OG IMAGE] generateWithSharp: Text SVG added to composites, total composites:', composites.length);
    

    console.log('[OG IMAGE] generateWithSharp: Applying composites...');
    const output = await bannerSharp
      .composite(composites)
      .png({ 
        quality: 100, 
        compressionLevel: 0, // 0 = no compression (best quality, larger file)
        palette: false, // Disable palette for better quality
        effort: 10 // Maximum effort for compression (best quality)
      })
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
          console.log('[OG IMAGE] Final token data:', { coinName, symbol, description: tokenData.description });
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
    
    // Get description from token data if available
    let description = '';
    if (tokenId) {
      try {
        const tokenDataPromise = fetchTokenDataFromHTML(tokenId);
        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 1500)); // Fast timeout 1.5 seconds
        const tokenData = await Promise.race([tokenDataPromise, timeoutPromise]);
        if (tokenData && tokenData.description) {
          description = tokenData.description;
          console.log('[OG IMAGE] Using fetched description:', description);
        }
      } catch (e) {
        console.log('[OG IMAGE] Could not fetch description:', e.message);
      }
    }
    
    // Generate image with timeout to prevent hanging
    const generatePromise = generateOGImage(tokenId, displayName, displaySymbol, coinImageUrl, host, description);
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
