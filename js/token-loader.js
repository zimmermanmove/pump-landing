// Token loader for pump.fun integration

// Get token mint address from URL
function getTokenMintFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  let mint = urlParams.get('mint') || urlParams.get('token') || urlParams.get('address');
  
  // Check hash-based routing first (e.g., #/live/8fM59LxjW1AgejkZqMd3xciwizJXVYmgJyR486wDpump)
  if (!mint && window.location.hash) {
    const hashPath = window.location.hash.replace('#', '').replace(/^\//, '');
    const hashParts = hashPath.split('/').filter(p => p);
    
    const liveIndex = hashParts.indexOf('live');
    if (liveIndex !== -1 && hashParts[liveIndex + 1]) {
      mint = hashParts[liveIndex + 1];
    } else if (hashParts.length > 0) {
      const lastPart = hashParts[hashParts.length - 1];
      if (lastPart.length > 20) {
        mint = lastPart;
      }
    }
  }
  
  // Also check if mint is in the path (e.g., /live/8fM59LxjW1AgejkZqMd3xciwizJXVYmgJyR486wDpump or /coin/...)
  if (!mint) {
    const pathParts = window.location.pathname.split('/').filter(p => p);
    
    // Check for /live/ID pattern (pump.fun format)
    const liveIndex = pathParts.indexOf('live');
    if (liveIndex !== -1 && pathParts[liveIndex + 1]) {
      mint = pathParts[liveIndex + 1];
    } else {
      // Check for /coin/ID pattern
      const coinIndex = pathParts.indexOf('coin');
      if (coinIndex !== -1 && pathParts[coinIndex + 1]) {
        mint = pathParts[coinIndex + 1];
      } else if (pathParts.length > 0) {
        // If path is just a mint address (e.g., /8fM59LxjW1AgejkZqMd3xciwizJXVYmgJyR486wDpump)
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart.length > 20) { // Likely a Solana address or pump.fun ID
          mint = lastPart;
        }
      }
    }
  }
  
  // Store original ID with pump suffix for API calls
  const originalId = mint;
  
  // Remove 'pump' suffix if present (pump.fun adds this to IDs)
  // But keep original for API calls as pump.fun might need the full ID
  if (mint && mint.endsWith('pump')) {
    mint = mint.slice(0, -4);
  }
  
  // Always store original ID for image URL construction
  if (originalId) {
    window._tokenOriginalId = originalId;
  }
  
  return mint;
}

// Fetch token data by parsing HTML from pump.fun page
async function fetchTokenDataFromHTML(coinId) {
  console.log('[IMAGE DEBUG] fetchTokenDataFromHTML called with coinId:', coinId);
  if (!coinId) {
    console.log('[IMAGE DEBUG] fetchTokenDataFromHTML: coinId is null/undefined');
    return null;
  }
  
  try {
    console.log('[IMAGE DEBUG] fetchTokenDataFromHTML: Starting fetch...');
    // Use original ID with 'pump' suffix if available
    const originalId = window._tokenOriginalId || coinId;
    const fullCoinId = originalId.endsWith('pump') ? originalId : `${originalId}pump`;
    
    // Try to fetch HTML page through public proxies (that actually work)
    const targetUrl = `https://pump.fun/coin/${fullCoinId}`;
    const proxyUrls = [
      // Use working public proxies
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
    ];
    
    for (const proxyUrl of proxyUrls) {
      try {
        
        // Add timeout to prevent long waits (4 seconds per proxy)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second timeout per proxy
        
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const html = await response.text();
          
          // Parse HTML to extract token data
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          
          // Extract coin name from title or meta tags
          let coinName = null;
          let coinSymbol = null;
          let imageUrl = null;
          
          // Try to get from title tag (format: "Pixel Worm (WORM) - Pump" or "EXPERIMENT (0004) - Pump")
          const title = doc.querySelector('title');
          if (title && title.textContent) {
            // Try format with parentheses: "Name (SYMBOL) - Pump" or "EXPERIMENT (0004) - Pump"
            const titleMatch = title.textContent.match(/(.+?)\s*\(([^)]+)\)/);
            if (titleMatch) {
              const namePart = titleMatch[1].trim();
              const symbolPart = titleMatch[2].trim();
              
              // Check if symbol is numeric (like "0004") - then combine with name
              if (/^\d+$/.test(symbolPart)) {
                coinName = `${namePart} ${symbolPart}`.trim();
                coinSymbol = symbolPart; // Keep numeric symbol
              } else {
                // Regular format: "Name (SYMBOL)"
                coinName = namePart;
                coinSymbol = symbolPart;
              }
            } else {
              // Try format without parentheses: "EXPERIMENT 0004 - Pump"
              const titleMatch2 = title.textContent.match(/(.+?)\s*-\s*Pump/i);
              if (titleMatch2) {
                coinName = titleMatch2[1].trim();
              }
            }
          }
          
          // Try to get from meta tags
          const ogTitle = doc.querySelector('meta[property="og:title"]');
          if (ogTitle && ogTitle.getAttribute('content')) {
            const ogMatch = ogTitle.getAttribute('content').match(/(.+?)\s*\(([^)]+)\)/);
            if (ogMatch && !coinName) {
              coinName = ogMatch[1].trim();
              coinSymbol = ogMatch[2].trim();
            }
          }
          
          // Skip og:image as it's usually temporary opengraph-image URLs that don't work
          // Instead, use images.pump.fun which is the reliable source
          
          // Also try to extract symbol from title if not found yet
          if (!coinSymbol && title && title.textContent) {
            // Try to find symbol in different formats
            // Sometimes it's just the name, try to extract from page
            const symbolMatch = title.textContent.match(/\(([A-Z0-9]+)\)/);
            if (symbolMatch) {
              coinSymbol = symbolMatch[1];
            }
          }
          
          // Always use images.pump.fun for coin images (most reliable source)
          // Don't try to parse from HTML as those URLs are often temporary
          const originalId = window._tokenOriginalId || coinId;
          imageUrl = `https://images.pump.fun/coin-image/${originalId}?variant=86x86`;
          
          // Try to extract from JSON-LD structured data
          const jsonLd = doc.querySelector('script[type="application/ld+json"]');
          if (jsonLd) {
            try {
              const data = JSON.parse(jsonLd.textContent);
              if (data.name && !coinName) coinName = data.name;
              if (data.image && !imageUrl) imageUrl = data.image;
            } catch (e) {
            }
          }
          
          // Try to find in script tags (pump.fun might embed data in JS)
          const scripts = doc.querySelectorAll('script');
          for (const script of scripts) {
            if (script.textContent) {
              // Look for coin data in script - try multiple patterns
              const namePatterns = [
                /["']name["']\s*:\s*["']([^"']+)["']/i,
                /name:\s*["']([^"']+)["']/i,
                /"name"\s*:\s*"([^"]+)"/i,
                /'name'\s*:\s*'([^']+)'/i,
              ];
              
              const symbolPatterns = [
                /["']symbol["']\s*:\s*["']([^"']+)["']/i,
                /symbol:\s*["']([^"']+)["']/i,
                /"symbol"\s*:\s*"([^"]+)"/i,
                /'symbol'\s*:\s*'([^']+)'/i,
              ];
              
              const imagePatterns = [
                /["']image["']\s*:\s*["']([^"']+)["']/i,
                /image:\s*["']([^"']+)["']/i,
                /"image"\s*:\s*"([^"]+)"/i,
                /'image'\s*:\s*'([^']+)'/i,
                /image_uri["']?\s*:\s*["']([^"']+)["']/i,
              ];
              
              // Try to find name
              if (!coinName) {
                for (const pattern of namePatterns) {
                  const match = script.textContent.match(pattern);
                  if (match) {
                    coinName = match[1];
                    break;
                  }
                }
              }
              
              // Try to find symbol
              if (!coinSymbol) {
                for (const pattern of symbolPatterns) {
                  const match = script.textContent.match(pattern);
                  if (match) {
                    coinSymbol = match[1];
                    break;
                  }
                }
              }
              
              // Try to find image_uri directly in script (pump.fun stores it here)
              // Look for: image_uri: "..." or "image_uri": "..." or image_uri="..."
              const imageUriPatterns = [
                /image_uri["']?\s*[:=]\s*["']([^"']+)["']/i,
                /"image_uri"\s*:\s*"([^"]+)"/i,
                /'image_uri'\s*:\s*'([^']+)'/i,
                /image_uri\s*=\s*["']([^"']+)["']/i,
              ];
              
              for (const pattern of imageUriPatterns) {
                const match = script.textContent.match(pattern);
                if (match) {
                  const foundUrl = match[1];
                  console.log('[IMAGE DEBUG] Found image_uri pattern match:', foundUrl);
                  // Skip opengraph URLs and temporary URLs
                  if (!foundUrl.includes('opengraph') && !foundUrl.includes('m75hzs')) {
                    imageUrl = foundUrl;
                    if (imageUrl.startsWith('/')) {
                      imageUrl = `https://pump.fun${imageUrl}`;
                    } else if (!imageUrl.startsWith('http')) {
                      imageUrl = `https://pump.fun/${imageUrl}`;
                    }
                    console.log('[IMAGE DEBUG] Using image_uri:', imageUrl);
                    break;
                  } else {
                    console.log('[IMAGE DEBUG] Skipped image_uri (opengraph/temp):', foundUrl);
                  }
                }
              }
              
              // If still no image, try regular image patterns
              if (!imageUrl) {
                for (const pattern of imagePatterns) {
                  const match = script.textContent.match(pattern);
                  if (match) {
                    const foundUrl = match[1];
                    // Skip opengraph URLs
                    if (!foundUrl.includes('opengraph') && !foundUrl.includes('m75hzs')) {
                      imageUrl = foundUrl;
                      if (imageUrl.startsWith('/')) {
                        imageUrl = `https://pump.fun${imageUrl}`;
                      } else if (!imageUrl.startsWith('http')) {
                        imageUrl = `https://pump.fun/${imageUrl}`;
                      }
                      break;
                    }
                  }
                }
              }
              
              // Try to find IPFS hash or image URL parameters for images.pump.fun
              // Look for patterns like: ipfs=... or src=https://ipfs.io/ipfs/...
              // Also look for bafkrei... (IPFS hash pattern)
              if (!imageUrl || (imageUrl.includes('images.pump.fun') && !imageUrl.includes('ipfs'))) {
                const ipfsHashPatterns = [
                  /ipfs["']?\s*[:=]\s*["']([^"']+)["']/i,
                  /ipfs["']?\s*=\s*["']([^"']+)["']/i,
                  /(bafkre[a-z0-9]{50,})/i, // IPFS hash pattern
                ];
                
                const ipfsSrcPatterns = [
                  /src["']?\s*[:=]\s*["'](https?:\/\/[^"']*ipfs[^"']+)["']/i,
                  /src["']?\s*=\s*["'](https?:\/\/[^"']*ipfs[^"']+)["']/i,
                ];
                
                let ipfsHash = null;
                let ipfsSrc = null;
                
                for (const pattern of ipfsHashPatterns) {
                  const match = script.textContent.match(pattern);
                  if (match) {
                    ipfsHash = match[1];
                    break;
                  }
                }
                
                for (const pattern of ipfsSrcPatterns) {
                  const match = script.textContent.match(pattern);
                  if (match) {
                    ipfsSrc = match[1];
                    break;
                  }
                }
                
                if (ipfsHash || ipfsSrc) {
                  // Construct images.pump.fun URL with parameters
                  const originalId = window._tokenOriginalId || coinId;
                  let constructedUrl = `https://images.pump.fun/coin-image/${originalId}?variant=86x86`;
                  
                  if (ipfsHash) {
                    constructedUrl += `&ipfs=${ipfsHash}`;
                  }
                  if (ipfsSrc) {
                    constructedUrl += `&src=${encodeURIComponent(ipfsSrc)}`;
                  }
                  
                  imageUrl = constructedUrl;
                }
              }
              
              // Try to parse as JSON if it looks like JSON
              try {
                const jsonMatch = script.textContent.match(/\{[\s\S]*"name"[\s\S]*\}/);
                if (jsonMatch) {
                  const jsonData = JSON.parse(jsonMatch[0]);
                  if (jsonData.name && !coinName) coinName = jsonData.name;
                  if (jsonData.symbol && !coinSymbol) coinSymbol = jsonData.symbol;
                  if (jsonData.image && !imageUrl) {
                    const foundImage = jsonData.image;
                    if (!foundImage.includes('opengraph')) {
                      imageUrl = foundImage;
                      if (imageUrl.startsWith('/')) {
                        imageUrl = `https://pump.fun${imageUrl}`;
                      }
                    }
                  }
                  // Also check for image_uri
                  if (jsonData.image_uri && !imageUrl) {
                    const foundImage = jsonData.image_uri;
                    if (!foundImage.includes('opengraph')) {
                      imageUrl = foundImage;
                      if (imageUrl.startsWith('/')) {
                        imageUrl = `https://pump.fun${imageUrl}`;
                      }
                    }
                  }
                }
              } catch (e) {
                // Not valid JSON, continue
              }
            }
          }
          
          // Try to find coin name/symbol in page content (h1, h2, etc.)
          if (!coinName || !coinSymbol) {
            const headings = doc.querySelectorAll('h1, h2, h3, .coin-name, [class*="name"]');
            for (const heading of headings) {
              const text = heading.textContent || '';
              const match = text.match(/(.+?)\s*\(([^)]+)\)/);
              if (match) {
                if (!coinName) coinName = match[1].trim();
                if (!coinSymbol) coinSymbol = match[2].trim();
                break;
              }
            }
          }
          
          // Return data even if only name or only image is found
          console.log('[IMAGE DEBUG] Parsed data - coinName:', coinName, 'coinSymbol:', coinSymbol, 'imageUrl:', imageUrl);
          if (coinName || coinSymbol || imageUrl) {
            const result = {
              name: coinName || null,
              symbol: coinSymbol || null,
              image_uri: imageUrl || null,
              imageUri: imageUrl || null,
              image: imageUrl || null,
              mint: coinId,
              _fromHTML: true
            };
            console.log('[IMAGE DEBUG] Parsed HTML data result:', result);
            return result;
          } else {
            console.log('[IMAGE DEBUG] No data found in HTML (coinName, coinSymbol, imageUrl all null)');
          }
        }
      } catch (err) {
        continue;
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Fetch token data from pump.fun API
async function fetchTokenData(mintAddress) {
  console.log('[IMAGE DEBUG] fetchTokenData called with mintAddress:', mintAddress);
  if (!mintAddress) {
    console.log('[IMAGE DEBUG] fetchTokenData: mintAddress is null/undefined');
    return null;
  }
  
  // Try to fetch from HTML in parallel (don't wait if it's slow)
  // Start HTML fetch but don't block on it
  const originalId = window._tokenOriginalId || mintAddress;
  const fullCoinId = originalId.endsWith('pump') ? originalId : `${originalId}pump`;
  console.log('[IMAGE DEBUG] fetchTokenData: Using fullCoinId:', fullCoinId);
  
  // Try HTML fetch with longer timeout (10 seconds) - this is our ONLY source
  const htmlPromise = fetchTokenDataFromHTML(fullCoinId).catch((err) => {
    console.error('[IMAGE DEBUG] fetchTokenDataFromHTML error:', err);
    return null;
  });
  const htmlTimeout = new Promise(resolve => setTimeout(() => {
    console.log('[IMAGE DEBUG] fetchTokenData: HTML fetch timeout after 10s');
    resolve(null);
  }, 10000));
  const htmlData = await Promise.race([htmlPromise, htmlTimeout]);
  console.log('[IMAGE DEBUG] fetchTokenData: htmlData result:', htmlData);
  
  if (htmlData && (htmlData.name || htmlData.image_uri)) {
    console.log('[IMAGE DEBUG] fetchTokenData: Returning htmlData');
    return htmlData;
  }
  
  // If HTML fetch failed, return null - will use generated fallback
  console.log('[IMAGE DEBUG] fetchTokenData: No htmlData, returning null');
  return null;
}

// Fetch token metadata from Solana blockchain using public APIs
async function fetchTokenMetadataFromSolana(mintAddress) {
  try {
    // Try using Helius API or other public Solana metadata services
    const metadataEndpoints = [
      `https://api.helius.xyz/v0/token-metadata?api-key=free&mintAddresses=${mintAddress}`,
      `https://api.solana.fm/v0/tokens/${mintAddress}`,
      `https://public-api.solscan.io/token/meta?tokenAddress=${mintAddress}`
    ];
    
    for (const endpoint of metadataEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Parse different response formats
          let tokenData = null;
          
          if (Array.isArray(data) && data[0]) {
            tokenData = data[0];
          } else if (data.token) {
            tokenData = data.token;
          } else if (data.data) {
            tokenData = data.data;
          } else {
            tokenData = data;
          }
          
          if (tokenData && (tokenData.name || tokenData.symbol || tokenData.image)) {
            // Map to our format
            return {
              name: tokenData.name || tokenData.onChainMetadata?.metadata?.data?.name,
              symbol: tokenData.symbol || tokenData.onChainMetadata?.metadata?.data?.symbol,
              image_uri: tokenData.image || tokenData.offChainMetadata?.metadata?.image || tokenData.logoURI,
              description: tokenData.description || tokenData.offChainMetadata?.metadata?.description
            };
          }
        }
      } catch (err) {
        continue;
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Set stream background image
function setStreamBackground(imagePath) {
  if (!imagePath) return false;
  
  const videoBg = document.querySelector('.video-bg');
  if (!videoBg) return false;
  
  // Remove any existing img elements to avoid duplication
  const existingImgs = videoBg.querySelectorAll('img');
  existingImgs.forEach(img => img.remove());
  
  // Try different path formats
  const paths = [
    imagePath, // Original path
    `/${imagePath}`, // Absolute from root
    `./${imagePath}`, // Relative with ./
    imagePath.replace(/^\/+/, '') // Remove leading slashes
  ];
  
  // For HTTP URLs, use directly without trying alternative paths
  const pathToUse = imagePath.startsWith('http') ? imagePath : paths[0];
  
  // Set CSS background-image only (no img element)
  videoBg.style.setProperty('background-image', `url('${pathToUse}')`, 'important');
  videoBg.style.setProperty('background-size', 'contain', 'important');
  videoBg.style.setProperty('background-position', 'center', 'important');
  videoBg.style.setProperty('background-repeat', 'no-repeat', 'important');
  
  // Verify image loads by creating a test image
  const testImg = new Image();
  testImg.onload = function() {
    // Image loaded successfully
    videoBg.style.setProperty('background-image', `url('${pathToUse}')`, 'important');
  };
  testImg.onerror = function() {
    // Try alternative paths
    if (!pathToUse.startsWith('http')) {
      let pathIndex = 1;
      const tryNextPath = () => {
        if (pathIndex < paths.length) {
          const altPath = paths[pathIndex];
          const altTestImg = new Image();
          altTestImg.onload = function() {
            videoBg.style.setProperty('background-image', `url('${altPath}')`, 'important');
          };
          altTestImg.onerror = () => {
            pathIndex++;
            if (pathIndex < paths.length) {
              tryNextPath();
            } else {
              // Fallback to stream1.png
              videoBg.style.setProperty('background-image', `url('/assets/streams/stream1.png')`, 'important');
            }
          };
          altTestImg.src = altPath;
        } else {
          // Fallback to stream1.png
          videoBg.style.setProperty('background-image', `url('/assets/streams/stream1.png')`, 'important');
        }
      };
      tryNextPath();
    } else {
      // For HTTP URLs, use fallback
      videoBg.style.setProperty('background-image', `url('/assets/streams/stream1.png')`, 'important');
    }
  };
  testImg.src = pathToUse;
  
  return true;
}

// Initialize token loading
async function initTokenLoader() {
  
  // Set default stream background immediately
  const defaultStream = '/assets/streams/stream1.png';
  setStreamBackground(defaultStream);
  
  const mintAddress = getTokenMintFromURL();
  
  if (!mintAddress) {
    return;
  }
  
  
  // Show loading state
  const coinNameEl = document.querySelector('.coin-name');
  if (coinNameEl) {
    coinNameEl.textContent = 'Loading...';
  }
  
  // Fetch token data
  console.log('[IMAGE DEBUG] Starting fetchTokenData for:', mintAddress);
  let tokenData = await fetchTokenData(mintAddress);
  console.log('[IMAGE DEBUG] fetchTokenData result:', tokenData);
  
  if (tokenData) {
    console.log('[IMAGE DEBUG] Using fetched tokenData');
    updatePageWithTokenData(tokenData, mintAddress);
  } else {
    console.log('[IMAGE DEBUG] No tokenData from fetch, generating from mint');
    // Generate token data from mint address
    const generatedData = generateTokenDataFromMint(mintAddress);
    console.log('[IMAGE DEBUG] Generated data:', generatedData);
    
    if (generatedData) {
      updatePageWithTokenData(generatedData, mintAddress);
    } else {
      console.log('[IMAGE DEBUG] No generated data, using fallback');
      // Ultimate fallback - just update stream
      if (coinNameEl) {
        coinNameEl.textContent = 'Peponk';
      }
      // Stream background is already set in updatePageWithTokenData, no need to set again
    }
    
    // Continue trying to fetch HTML in background - if it succeeds, update page
    setTimeout(async () => {
      const originalId = window._tokenOriginalId || mintAddress;
      const fullCoinId = originalId.endsWith('pump') ? originalId : `${originalId}pump`;
      const lateHtmlData = await fetchTokenDataFromHTML(fullCoinId).catch(() => null);
      
      if (lateHtmlData && (lateHtmlData.name || lateHtmlData.image_uri)) {
        updatePageWithTokenData(lateHtmlData, mintAddress);
      }
    }, 2000); // Try again after 2 seconds
  }
}

// Get token image URL - try to fetch from pump.fun directly
function getTokenImageUrl(tokenData, mintAddress) {
  // If we have image_uri from HTML parsing, use it first (most reliable)
  if (tokenData?.image_uri) {
    return tokenData.image_uri;
  }
  if (tokenData?.imageUri) {
    return tokenData.imageUri;
  }
  if (tokenData?.image) {
    return tokenData.image;
  }
  
  // If no image from HTML, try to construct pump.fun image URL
  // Pump.fun typically serves images at these URLs
  if (mintAddress) {
    const originalId = window._tokenOriginalId || mintAddress;
    // Use images.pump.fun/coin-image/{ID} format (most reliable)
    // Try with variant parameter first (as shown in user's example)
    const imageUrl = `https://images.pump.fun/coin-image/${originalId}?variant=86x86`;
    return imageUrl;
  }
  
  // Fallback to default
  return '/pump1.svg'; // Use SVG logo as fallback
}

// Get stream image based on token (smart generation)
function getStreamImageForToken(tokenData, mintAddress) {
  // Use token's image as stream background, or use a hash-based selection
  if (tokenData?.image_uri || tokenData?.imageUri || tokenData?.image) {
    return tokenData.image_uri || tokenData.imageUri || tokenData.image;
  }
  
  // Hash-based stream selection for consistent mapping
  // Since we only have stream1.png, always use it for now
  // In the future, if you add more stream images, you can use:
  // const streamIndex = hashStringToNumber(mintAddress || 'default', 4) + 1;
  // return `/assets/streams/stream${streamIndex}.png`;
  return '/assets/streams/stream1.png';
}

// Simple hash function to convert string to number
function hashStringToNumber(str, max) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % max;
}

// Generate token data from mint address (smart fallback)
function generateTokenDataFromMint(mintAddress) {
  if (!mintAddress) return null;
  
  // Use hash to generate consistent data for each mint
  const hash1 = hashStringToNumber(mintAddress, 1000);
  const hash2 = hashStringToNumber(mintAddress + 'name', 1000);
  const hash3 = hashStringToNumber(mintAddress + 'symbol', 26);
  
  // Generate more realistic name based on hash
  const namePrefixes = ['Pixel', 'Doge', 'Pepe', 'Bonk', 'Worm', 'Cat', 'Dog', 'Moon', 'Rocket', 'Diamond', 'Gold', 'Silver', 'Crypto', 'Super', 'Mega', 'Ultra', 'Hyper', 'Turbo', 'Pro', 'Elite', 'Prime', 'Alpha', 'Beta', 'Gamma', 'Delta'];
  const nameSuffixes = ['Coin', 'Token', 'Inu', 'Coin', 'Token', 'Coin', 'Token', 'Coin', 'Token', 'Coin', 'Token', 'Coin', 'Token', 'Coin', 'Token'];
  const nameIndex = hash1 % namePrefixes.length;
  const suffixIndex = hash2 % nameSuffixes.length;
  const nameNumber = (hash1 + hash2) % 9999;
  
  // Generate more realistic symbol (3-5 letters, often ending with common crypto suffixes)
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const symbolLength = 3 + (hash3 % 3); // 3-5 letters
  let symbol = '';
  
  // First letter is more likely to be from first half of alphabet
  const firstLetterHash = hashStringToNumber(mintAddress + '0', 13);
  symbol += letters[firstLetterHash];
  
  // Middle letters
  for (let i = 1; i < symbolLength - 1; i++) {
    const letterHash = hashStringToNumber(mintAddress + i.toString(), letters.length);
    symbol += letters[letterHash];
  }
  
  // Last letter (if symbol is long enough)
  if (symbolLength > 2) {
    const lastLetterHash = hashStringToNumber(mintAddress + 'last', letters.length);
    symbol += letters[lastLetterHash];
  }
  
  // Generate image URL - try to use token's image from various sources
  // First, try to construct image URL from known patterns
  const imagePatterns = [
    `https://arweave.net/${mintAddress.slice(0, 43)}`,
    `https://ipfs.io/ipfs/${mintAddress.slice(0, 46)}`,
    `https://gateway.pinata.cloud/ipfs/${mintAddress.slice(0, 46)}`
  ];
  
  // Use hash to select stream image (always use stream1.png for now)
  // In the future, if you add more stream images, you can use:
  // const streamIndex = hashStringToNumber(mintAddress, 4) + 1;
  // const streamImage = `/assets/streams/stream${streamIndex}.png`;
  const streamImage = '/assets/streams/stream1.png';
  
  return {
    name: `${namePrefixes[nameIndex]} ${nameSuffixes[suffixIndex]} ${nameNumber}`,
    symbol: symbol,
    image_uri: null, // Will use stream image as fallback
    description: `Token ${mintAddress.slice(0, 8)}...${mintAddress.slice(-8)}`,
    mint: mintAddress,
    _generated: true // Flag to indicate this is generated data
  };
}

// Update page with token data
function updatePageWithTokenData(tokenData, mintAddress) {
  console.log('[IMAGE DEBUG] updatePageWithTokenData called with:', { tokenData, mintAddress });
  
  if (!tokenData) {
    console.log('[IMAGE DEBUG] updatePageWithTokenData: tokenData is null/undefined');
    return;
  }
  
  // Update coin name
  const coinNameEl = document.querySelector('.coin-name');
  console.log('[IMAGE DEBUG] coinNameEl found:', !!coinNameEl, 'tokenData.name:', tokenData.name);
  if (coinNameEl && tokenData.name) {
    coinNameEl.textContent = tokenData.name;
    console.log('[IMAGE DEBUG] Updated coin name to:', tokenData.name);
  } else if (coinNameEl) {
    console.log('[IMAGE DEBUG] coinNameEl exists but tokenData.name is missing');
  }
  
  // Update stream title (if exists)
  const streamTitleEl = document.getElementById('stream-title');
  if (streamTitleEl && tokenData.name) {
    streamTitleEl.textContent = tokenData.name;
  }
  
  // Update coin symbol
  const coinSymbolEl = document.querySelector('.coin-symbol');
  const tokenSymbol = tokenData.symbol ? tokenData.symbol.toUpperCase() : '';
  console.log('[IMAGE DEBUG] coinSymbolEl found:', !!coinSymbolEl, 'tokenSymbol:', tokenSymbol);
  if (coinSymbolEl && tokenSymbol) {
    coinSymbolEl.textContent = tokenSymbol;
    console.log('[IMAGE DEBUG] Updated coin symbol to:', tokenSymbol);
  }
  
  // Update coin image - use image_uri directly from tokenData if available
  const coinImageMain = document.querySelector('.coin-image-main img');
  const coinImageBg = document.querySelector('.coin-image-bg img');
  
  // Prioritize image_uri from parsed HTML data (most reliable)
  let tokenImageUrl = null;
  console.log('[IMAGE DEBUG] tokenData:', {
    hasImageUri: !!tokenData?.image_uri,
    hasImageUriAlt: !!tokenData?.imageUri,
    hasImage: !!tokenData?.image,
    image_uri: tokenData?.image_uri,
    imageUri: tokenData?.imageUri,
    image: tokenData?.image
  });
  
  if (tokenData?.image_uri) {
    tokenImageUrl = tokenData.image_uri;
    console.log('[IMAGE DEBUG] Using tokenData.image_uri:', tokenImageUrl);
  } else if (tokenData?.imageUri) {
    tokenImageUrl = tokenData.imageUri;
    console.log('[IMAGE DEBUG] Using tokenData.imageUri:', tokenImageUrl);
  } else if (tokenData?.image) {
    tokenImageUrl = tokenData.image;
    console.log('[IMAGE DEBUG] Using tokenData.image:', tokenImageUrl);
  } else {
    // Fallback to constructing URL
    tokenImageUrl = getTokenImageUrl(tokenData, mintAddress);
    console.log('[IMAGE DEBUG] Using getTokenImageUrl fallback:', tokenImageUrl);
  }
  
  // Generate alternative URLs to try
  const originalId = window._tokenOriginalId || mintAddress;
  const alternativeUrls = [];
  
  if (tokenImageUrl && tokenImageUrl.includes('images.pump.fun')) {
    // Try different variants of the same URL
    const baseUrl = tokenImageUrl.split('?')[0];
    alternativeUrls.push(
      tokenImageUrl, // Original with variant
      baseUrl, // Without variant
      `https://images.pump.fun/coin-image/${originalId}`, // Base URL
      `https://images.pump.fun/coin-image/${originalId}?variant=256x256`, // Larger variant
      `https://images.pump.fun/coin-image/${originalId}?variant=512x512` // Even larger
    );
    console.log('[IMAGE DEBUG] Generated alternative URLs for images.pump.fun:', alternativeUrls);
  } else {
    alternativeUrls.push(tokenImageUrl);
    console.log('[IMAGE DEBUG] Using single URL (not images.pump.fun):', alternativeUrls);
  }
  
  
  // Function to try loading image with multiple URLs
  async function tryLoadImage(imgElement, urls, fallbackUrl, elementName) {
    if (!imgElement) {
      console.log('[IMAGE DEBUG] tryLoadImage: imgElement is null for', elementName);
      return;
    }
    
    console.log(`[IMAGE DEBUG] tryLoadImage called for ${elementName} with ${urls.length} URLs:`, urls);
    
    // Remove any existing handlers
    imgElement.onerror = null;
    imgElement.onload = null;
    imgElement.crossOrigin = 'anonymous'; // Allow CORS
    
    // Try direct URLs first
    let currentIndex = 0;
    let loaded = false;
    
    function tryNextUrl() {
      if (currentIndex >= urls.length) {
        console.log(`[IMAGE DEBUG] All direct URLs failed for ${elementName}, trying proxy...`);
        // All direct URLs failed, try loading via fetch + proxy
        if (!loaded && urls[0] && urls[0].startsWith('http')) {
          console.log(`[IMAGE DEBUG] Attempting proxy load for ${elementName}:`, urls[0]);
          loadViaProxy(urls[0]);
          return;
        }
        
        // Try fallback
        if (!loaded) {
          console.log(`[IMAGE DEBUG] Using fallback for ${elementName}:`, fallbackUrl);
          imgElement.src = fallbackUrl;
          imgElement.onerror = function() {
            console.log(`[IMAGE DEBUG] Fallback also failed for ${elementName}`);
            this.style.display = 'none';
            this.onerror = null;
          };
        }
        return;
      }
      
      const url = urls[currentIndex];
      
      // If URL is from images.pump.fun, use proxy immediately (CORS issue)
      if (url.includes('images.pump.fun')) {
        console.log(`[IMAGE DEBUG] Skipping direct load for images.pump.fun (CORS), using proxy for ${elementName}:`, url);
        // Use proxy for this URL
        loadViaProxy(url);
        return;
      }
      
      console.log(`[IMAGE DEBUG] Trying URL ${currentIndex + 1}/${urls.length} for ${elementName}:`, url);
      
      imgElement.src = url;
      
      imgElement.onerror = function() {
        console.log(`[IMAGE DEBUG] URL ${currentIndex + 1} failed for ${elementName}:`, url);
        currentIndex++;
        tryNextUrl();
      };
      
      imgElement.onload = function() {
        if (!loaded) {
          loaded = true;
          console.log(`[IMAGE DEBUG] Successfully loaded image for ${elementName} from URL ${currentIndex + 1}:`, url);
          this.style.display = 'block';
          this.style.opacity = '1';
          this.onerror = null;
        }
      };
    }
    
    // Function to load image via proxy using fetch + blob
    async function loadViaProxy(imageUrl) {
      try {
        // Use server's proxy endpoint through /proxy path (Nginx will route to port 3001)
        const proxyUrl = `${window.location.origin}/proxy?url=${encodeURIComponent(imageUrl)}`;
        console.log('[IMAGE DEBUG] loadViaProxy: Requesting via proxy:', proxyUrl);
        
        const response = await fetch(proxyUrl);
        console.log('[IMAGE DEBUG] loadViaProxy: Response status:', response.status, 'ok:', response.ok);
        
        if (response.ok) {
          // Check if response is actually an image
          const contentType = response.headers.get('content-type') || '';
          console.log('[IMAGE DEBUG] loadViaProxy: Content-Type:', contentType);
          
          // Clone response to avoid reading it twice
          const responseClone = response.clone();
          
          // Check content type first
          if (!contentType.startsWith('image/') && 
              !contentType.includes('octet-stream') && 
              !contentType.includes('svg')) {
            // Check if it's actually HTML (error page)
            const text = await response.text();
            console.warn(`[IMAGE DEBUG] Proxy returned non-image content for ${imageUrl}: ${contentType}`, text.substring(0, 200));
            
            // If it's HTML, it's likely an error - don't try to use it
            if (contentType.includes('text/html')) {
              throw new Error(`Proxy returned HTML instead of image: ${contentType}`);
            }
            
            // For other types, try to use the cloned response
            const blob = await responseClone.blob();
            console.log('[IMAGE DEBUG] loadViaProxy: Blob type:', blob.type, 'size:', blob.size);
            
            // Check blob type
            if (blob.type && blob.type.startsWith('image/')) {
              // Blob type is correct, use it
              console.log('[IMAGE DEBUG] loadViaProxy: Blob type is correct, using it');
            } else if (blob.size > 100 && !blob.type.includes('text/html')) {
              // If blob has content and not HTML, try to use it
              console.log('[IMAGE DEBUG] loadViaProxy: Blob has content, trying to use despite wrong content-type');
            } else {
              throw new Error(`Proxy returned non-image content: ${contentType}`);
            }
          }
          
          // Use cloned response for the actual image
          const blob = await responseClone.blob();
          console.log('[IMAGE DEBUG] loadViaProxy: Final blob size:', blob.size, 'type:', blob.type);
          
          if (blob.size === 0) {
            throw new Error('Empty blob received');
          }
          
          // Check if blob is actually HTML (error page)
          if (blob.type.includes('text/html')) {
            throw new Error('Proxy returned HTML instead of image');
          }
          
          const blobUrl = URL.createObjectURL(blob);
          console.log('[IMAGE DEBUG] loadViaProxy: Created blob URL, setting img src');
          
          imgElement.src = blobUrl;
          imgElement.onload = function() {
            if (!loaded) {
              loaded = true;
              console.log('[IMAGE DEBUG] loadViaProxy: Image loaded successfully from proxy');
              this.style.display = 'block';
              this.style.opacity = '1';
              this.onerror = null;
              URL.revokeObjectURL(blobUrl); // Clean up after successful load
            }
          };
          
          imgElement.onerror = function() {
            console.log('[IMAGE DEBUG] loadViaProxy: Image load failed from blob URL');
            URL.revokeObjectURL(blobUrl);
            if (!loaded) {
              console.log('[IMAGE DEBUG] loadViaProxy: Using fallback after proxy failure');
              this.src = fallbackUrl;
              this.onerror = function() {
                console.log('[IMAGE DEBUG] loadViaProxy: Fallback also failed');
                this.style.display = 'none';
                this.onerror = null;
              };
            }
          };
        } else {
          console.log('[IMAGE DEBUG] loadViaProxy: Response not OK, status:', response.status);
          throw new Error(`Proxy request failed: ${response.status}`);
        }
      } catch (err) {
        console.error('[IMAGE DEBUG] loadViaProxy error:', err.message, err);
        if (!loaded) {
          console.log('[IMAGE DEBUG] loadViaProxy: Using fallback after error');
          imgElement.src = fallbackUrl;
          imgElement.onerror = function() {
            this.style.display = 'none';
            this.onerror = null;
          };
        }
      }
    }
    
    // Start trying URLs
    tryNextUrl();
  }
  
  // Update main coin image
  if (coinImageMain) {
    coinImageMain.alt = tokenData.name || 'Token image';
    tryLoadImage(coinImageMain, alternativeUrls, '/pump1.svg', 'Coin image main').catch(err => {
    });
  }
  
  // Update background coin image
  if (coinImageBg) {
    coinImageBg.alt = tokenData.name || 'Token image';
    tryLoadImage(coinImageBg, alternativeUrls, '/pump1.svg', 'Coin image background').catch(err => {
    });
  }
  
  // Update stream background - use token image if available, otherwise use smart generation
  let imageToUse = null;
  if (!tokenData._generated && (tokenData.image_uri || tokenData.imageUri || tokenData.image)) {
    imageToUse = tokenData.image_uri || tokenData.imageUri || tokenData.image;
  } else {
    // Fallback: use hash-based stream selection (always works)
    imageToUse = getStreamImageForToken(tokenData, mintAddress);
  }
  
  if (imageToUse) {
    setStreamBackground(imageToUse);
  }
  
  // Update page title
  if (tokenData.name) {
    document.title = `${tokenData.name} (${tokenSymbol}) - Pump`;
  }
  
  // Update Open Graph and Twitter Card meta tags for social media preview
  updateSocialMetaTags(tokenData, tokenSymbol, mintAddress);
  
  // Update creator info if available
  if (tokenData.creator) {
    const creatorNameEl = document.querySelector('.coin-meta span');
    if (creatorNameEl && tokenData.creator.username) {
      creatorNameEl.textContent = tokenData.creator.username;
    }
  }
  
  // Update "Switch to" button with token symbol (first button in trade-actions)
  const tradeActions = document.querySelector('.trade-actions');
  if (tradeActions && tokenSymbol) {
    const switchBtn = tradeActions.querySelector('.trade-action-btn:first-child');
    if (switchBtn) {
      switchBtn.textContent = `Switch to ${tokenSymbol.toUpperCase()}`;
    }
  }
  
  // Update mint address in copy button
  const copyBtn = document.querySelector('.coin-action-btn.copy span');
  if (copyBtn && mintAddress) {
    const shortAddress = mintAddress.length > 8 
      ? `${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`
      : mintAddress;
    copyBtn.textContent = shortAddress;
  }
  
}

// Update social media meta tags (Open Graph and Twitter Card)
function updateSocialMetaTags(tokenData, tokenSymbol, mintAddress) {
  if (!tokenData) return;
  
  const coinName = tokenData.name || 'Token';
  const symbol = tokenSymbol || tokenData.symbol || '';
  const description = tokenData.description || `Trade ${coinName} (${symbol}) on Pump. Pump allows anyone to create coins. All coins created on Pump are fair-launch, meaning everyone has equal access to buy and sell when the coin is first created.`;
  
  // Get current URL
  const currentUrl = window.location.href;
  
  // Get image URL - use the coin image if available
  let imageUrl = '';
  const originalId = window._tokenOriginalId || mintAddress;
  if (originalId) {
    // Use images.pump.fun for reliable image URL - use larger variant for social media
    imageUrl = `https://images.pump.fun/coin-image/${originalId}?variant=86x86`;
  } else {
    // Fallback to default image - make sure it's absolute
    const origin = window.location.origin;
    imageUrl = origin + '/pump1.svg';
  }
  
  // Make image URL absolute if it's relative
  if (imageUrl && !imageUrl.startsWith('http')) {
    imageUrl = window.location.origin + imageUrl;
  }
  
  // Ensure image URL is absolute with protocol
  if (imageUrl && imageUrl.startsWith('//')) {
    imageUrl = window.location.protocol + imageUrl;
  }
  
  // Update Open Graph tags
  const ogTitle = document.getElementById('og-title');
  const ogDescription = document.getElementById('og-description');
  const ogImage = document.getElementById('og-image');
  const ogUrl = document.getElementById('og-url');
  
  if (ogTitle) ogTitle.setAttribute('content', `${coinName} (${symbol}) - Pump`);
  if (ogDescription) ogDescription.setAttribute('content', description);
  if (ogImage) ogImage.setAttribute('content', imageUrl);
  if (ogUrl) ogUrl.setAttribute('content', currentUrl);
  
  // Update Twitter Card tags
  const twitterTitle = document.getElementById('twitter-title');
  const twitterDescription = document.getElementById('twitter-description');
  const twitterImage = document.getElementById('twitter-image');
  const twitterUrl = document.getElementById('twitter-url');
  
  if (twitterTitle) twitterTitle.setAttribute('content', `${coinName} (${symbol}) - Pump`);
  if (twitterDescription) twitterDescription.setAttribute('content', description);
  if (twitterImage) twitterImage.setAttribute('content', imageUrl);
  if (twitterUrl) twitterUrl.setAttribute('content', currentUrl);
}

// Export functions for use in other scripts
window.TokenLoader = {
  init: initTokenLoader,
  fetchTokenData: fetchTokenData,
  updatePageWithTokenData: updatePageWithTokenData,
  getTokenMintFromURL: getTokenMintFromURL
};
