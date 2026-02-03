function getTokenMintFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  let mint = urlParams.get('mint') || urlParams.get('token') || urlParams.get('address');
  
  if (!mint && window.location.hash) {
    const hashPath = window.location.hash.replace('#', '').replace(/^\/+/, '');
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
  
  if (!mint) {
    const pathParts = window.location.pathname.split('/').filter(p => p);
    const liveIndex = pathParts.indexOf('live');
    if (liveIndex !== -1 && pathParts[liveIndex + 1]) {
      mint = pathParts[liveIndex + 1];
    } else {
      const coinIndex = pathParts.indexOf('coin');
      if (coinIndex !== -1 && pathParts[coinIndex + 1]) {
        mint = pathParts[coinIndex + 1];
      } else if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart.length > 20) {
          mint = lastPart;
        }
      }
    }
  }
  
  const originalId = mint;
  
  if (mint && mint.endsWith('pump')) {
    mint = mint.slice(0, -4);
  }
  
  if (originalId) {
    window._tokenOriginalId = originalId;
  }
  
  return mint;
}

async function fetchTokenDataFromHTML(coinId) {
  if (!coinId) {
    return null;
  }
  
  const originalId = window._tokenOriginalId || coinId;
  const fullCoinId = originalId.endsWith('pump') ? originalId : `${originalId}pump`;
  
  const targetUrl = `https://pump.fun/coin/${fullCoinId}`;
  
  // Use ONLY local proxy - no external services to avoid CORS
  const proxyUrl = `${window.location.origin}/proxy?url=${encodeURIComponent(targetUrl)}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    }, 3000); // Increased timeout to 3 seconds for more reliable loading
    
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
      cache: 'no-store' // Don't use cache for fresh data
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
          const html = await response.text();
          

          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          

          let coinName = null;
          let coinSymbol = null;
          let imageUrl = null;
          

          const title = doc.querySelector('title');
          if (title && title.textContent) {

            const titleMatch = title.textContent.match(/(.+?)\s*\(([^)]+)\)/);
            if (titleMatch) {
              const namePart = titleMatch[1].trim();
              const symbolPart = titleMatch[2].trim();
              

              if (/^\d+$/.test(symbolPart)) {
                coinName = `${namePart} ${symbolPart}`.trim();
                coinSymbol = symbolPart; 
              } else {

                coinName = namePart;
                coinSymbol = symbolPart;
              }
            } else {

              const titleMatch2 = title.textContent.match(/(.+?)\s*-\s*Pump/i);
              if (titleMatch2) {
                coinName = titleMatch2[1].trim();
              }
            }
          }
          

          const ogTitle = doc.querySelector('meta[property="og:title"]');
          if (ogTitle && ogTitle.getAttribute('content')) {
            const ogMatch = ogTitle.getAttribute('content').match(/(.+?)\s*\(([^)]+)\)/);
            if (ogMatch && !coinName) {
              coinName = ogMatch[1].trim();
              coinSymbol = ogMatch[2].trim();
            }
          }
          


          

          if (!coinSymbol && title && title.textContent) {


            const symbolMatch = title.textContent.match(/\(([A-Z0-9]+)\)/);
            if (symbolMatch) {
              coinSymbol = symbolMatch[1];
            }
          }
          


          const originalId = window._tokenOriginalId || coinId;
          const coinIdForImage = originalId.endsWith('pump') ? originalId : `${originalId}pump`;
          imageUrl = `https://images.pump.fun/coin-image/${coinIdForImage}?variant=86x86`;
          

          const jsonLd = doc.querySelector('script[type="application/ld+json"]');
          if (jsonLd) {
            try {
              const data = JSON.parse(jsonLd.textContent);
              if (data.name && !coinName) coinName = data.name;
              if (data.image && !imageUrl) imageUrl = data.image;
            } catch (e) {
            }
          }
          

          // Try to find JSON data in window.__NEXT_DATA__ or similar
          const nextDataScript = doc.querySelector('script#__NEXT_DATA__');
          if (nextDataScript) {
            try {
              const nextData = JSON.parse(nextDataScript.textContent);
              if (nextData.props?.pageProps?.coin) {
                const coin = nextData.props.pageProps.coin;
                if (coin.name && !coinName) coinName = coin.name;
                if (coin.symbol && !coinSymbol) coinSymbol = coin.symbol;
                if (coin.image_uri && !imageUrl) imageUrl = coin.image_uri;
                if (coin.image && !imageUrl) imageUrl = coin.image;
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
          
          const scripts = doc.querySelectorAll('script');
          for (const script of scripts) {
            if (script.textContent) {
              // Try to parse as JSON first (faster and more reliable)
              try {
                // Look for JSON objects with coin data
                const jsonMatches = script.textContent.match(/\{[^{}]*"name"[^{}]*\}/g);
                if (jsonMatches) {
                  for (const jsonStr of jsonMatches) {
                    try {
                      const jsonData = JSON.parse(jsonStr);
                      if (jsonData.name && !coinName) coinName = jsonData.name;
                      if (jsonData.symbol && !coinSymbol) coinSymbol = jsonData.symbol;
                      if (jsonData.image && !imageUrl) {
                        const foundImage = jsonData.image;
                        if (!foundImage.includes('opengraph') && !foundImage.includes('m75hzs')) {
                          imageUrl = foundImage;
                        }
                      }
                      if (jsonData.image_uri && !imageUrl) {
                        const foundImage = jsonData.image_uri;
                        if (!foundImage.includes('opengraph') && !foundImage.includes('m75hzs')) {
                          imageUrl = foundImage;
                        }
                      }
                    } catch (e) {
                      // Continue to next match
                    }
                  }
                }
              } catch (e) {
                // Fall back to regex patterns
              }

              const namePatterns = [
                /["']name["']\s*:\s*["']([^"']+)["']/i,
                /name:\s*["']([^"']+)["']/i,
                /"name"\s*:\s*"([^"]+)"/i,
                /'name'\s*:\s*'([^']+)'/i,
                /const\s+name\s*=\s*["']([^"']+)["']/i,
                /let\s+name\s*=\s*["']([^"']+)["']/i,
                /var\s+name\s*=\s*["']([^"']+)["']/i,
              ];
              
              const symbolPatterns = [
                /["']symbol["']\s*:\s*["']([^"']+)["']/i,
                /symbol:\s*["']([^"']+)["']/i,
                /"symbol"\s*:\s*"([^"]+)"/i,
                /'symbol'\s*:\s*'([^']+)'/i,
                /const\s+symbol\s*=\s*["']([^"']+)["']/i,
                /let\s+symbol\s*=\s*["']([^"']+)["']/i,
                /var\s+symbol\s*=\s*["']([^"']+)["']/i,
              ];
              
              const imagePatterns = [
                /["']image["']\s*:\s*["']([^"']+)["']/i,
                /image:\s*["']([^"']+)["']/i,
                /"image"\s*:\s*"([^"]+)"/i,
                /'image'\s*:\s*'([^']+)'/i,
                /image_uri["']?\s*:\s*["']([^"']+)["']/i,
              ];
              
              if (!coinName) {
                for (const pattern of namePatterns) {
                  const match = script.textContent.match(pattern);
                  if (match) {
                    coinName = match[1];
                    break;
                  }
                }
              }
              
              if (!coinSymbol) {
                for (const pattern of symbolPatterns) {
                  const match = script.textContent.match(pattern);
                  if (match) {
                    coinSymbol = match[1];
                    break;
                  }
                }
              }
              

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

                  if (!foundUrl.includes('opengraph') && !foundUrl.includes('m75hzs')) {
                    imageUrl = foundUrl;
                    if (imageUrl.startsWith('/')) {
                      imageUrl = `https://images.pump.fun/coin-image/${originalId}pump?variant=86x86`;//pump.fun${imageUrl}`;
                    } else if (!imageUrl.startsWith('http')) {
                      imageUrl = `https://images.pump.fun/coin-image/${originalId}pump?variant=86x86`;//pump.fun/${imageUrl}`;
                    }
                    break;
                  }
                }
              }
              
              if (!imageUrl) {
                for (const pattern of imagePatterns) {
                  const match = script.textContent.match(pattern);
                  if (match) {
                    const foundUrl = match[1];

                    if (!foundUrl.includes('opengraph') && !foundUrl.includes('m75hzs')) {
                      imageUrl = foundUrl;
                      if (imageUrl.startsWith('/')) {
                        imageUrl = `https://pump.fun${imageUrl}`;//images.pump.fun/coin-image/${originalId}pump?variant=86x86`;//pump.fun${imageUrl}`;
                      } else if (!imageUrl.startsWith('http')) {
                        imageUrl = `https://pump.fun${imageUrl}`;//images.pump.fun/coin-image/${originalId}pump?variant=86x86`;//pump.fun/${imageUrl}`;
                      }
                      break;
                    }
                  }
                }
              }
              
              if (!imageUrl || (imageUrl.includes('images.pump.fun') && !imageUrl.includes('ipfs'))) {
                const ipfsHashPatterns = [
                  /ipfs["']?\s*[:=]\s*["']([^"']+)["']/i,
                  /ipfs["']?\s*=\s*["']([^"']+)["']/i,
                  /(bafkre[a-z0-9]{50,})/i, 
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

                  const originalId = window._tokenOriginalId || coinId;
                  const coinIdForImage = originalId.endsWith('pump') ? originalId : `${originalId}pump`;
                  let constructedUrl = `https://images.pump.fun/coin-image/${coinIdForImage}?variant=86x86`;
                  
                  if (ipfsHash) {
                    constructedUrl += `&ipfs=${ipfsHash}`;
                  }
                  if (ipfsSrc) {
                    constructedUrl += `&src=${encodeURIComponent(ipfsSrc)}`;
                  }
                  
                  imageUrl = constructedUrl;
                }
              }
              
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
                        imageUrl = `https://pump.fun${imageUrl}`;//images.pump.fun/coin-image/${originalId}pump?variant=86x86`;
                      }
                    }
                  }
                  if (jsonData.image_uri && !imageUrl) {
                    const foundImage = jsonData.image_uri;
                    if (!foundImage.includes('opengraph')) {
                      imageUrl = foundImage;
                      if (imageUrl.startsWith('/')) {
                        imageUrl = `https://pump.fun${imageUrl}`;//images.pump.fun/coin-image/${originalId}pump?variant=86x86`;//pump.fun${imageUrl}`;
                      }
                    }
                  }
                }
              } catch (e) {
              }
            }
          }
          
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
            return result;
          }
        }
    } catch (error) {
      // Error with proxy setup, return null
      // Don't log AbortError as it's expected when timeout occurs
      if (error.name !== 'AbortError' && error.message !== 'signal is aborted without reason') {
        console.warn('[TOKEN LOADER] Error fetching token data:', error.message);
      }
      return null;
    }
    
    return null;
}


async function fetchTokenData(mintAddress) {
  if (!mintAddress) {
    return null;
  }
  
  const originalId = window._tokenOriginalId || mintAddress;
  const fullCoinId = originalId.endsWith('pump') ? originalId : `${originalId}pump`;
  // Faster timeout - 1.5 seconds
  const htmlPromise = fetchTokenDataFromHTML(fullCoinId).catch(() => null);
  const htmlTimeout = new Promise(resolve => setTimeout(() => resolve(null), 1500));
  const htmlData = await Promise.race([htmlPromise, htmlTimeout]);
  
  if (htmlData && (htmlData.name || htmlData.image_uri)) {
    return htmlData;
  }
  
  return null;
}


async function fetchTokenMetadataFromSolana(mintAddress) {
  try {

    const metadataEndpoints = [
      `https://api.mainnet-beta.solana.com/v1/token/${mintAddress}`,
      `https://public-api.solscan.io/token/meta?tokenAddress=${mintAddress}`,
      `https://api.solana.fm/v0/tokens/${mintAddress}`
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


function setStreamBackground(imagePath) {
  if (!imagePath) return false;
  
  const videoBg = document.querySelector('.video-bg');
  if (!videoBg) return false;
  

  const existingImgs = videoBg.querySelectorAll('img');
  existingImgs.forEach(img => img.remove());
  
  const paths = [
    imagePath, 
    `/${imagePath}`, 
    `./${imagePath}`, 
    imagePath.replace(/^\/+/, '') 
  ];
  
  const pathToUse = imagePath.startsWith('http') ? imagePath : paths[0];
  

  videoBg.style.setProperty('background-image', `url('${pathToUse}')`, 'important');
  videoBg.style.setProperty('background-size', 'contain', 'important');
  videoBg.style.setProperty('background-position', 'center', 'important');
  videoBg.style.setProperty('background-repeat', 'no-repeat', 'important');
  

  const testImg = new Image();
  testImg.onload = function() {

    videoBg.style.setProperty('background-image', `url('${pathToUse}')`, 'important');
  };
  testImg.onerror = function() {
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
              // Don't set background image if all paths fail
              videoBg.style.removeProperty('background-image');
            }
          };
          altTestImg.src = altPath;
        } else {
          // Don't set background image if all paths fail
          videoBg.style.removeProperty('background-image');
        }
      };
      tryNextPath();
    } else {
      // Don't set background image on error
      videoBg.style.removeProperty('background-image');
    }
  };
  testImg.src = pathToUse;
  
  return true;
}


async function initTokenLoader() {
  // Don't set default stream background - let video or token image handle it
  const mintAddress = getTokenMintFromURL();
  
  if (!mintAddress) {
    return;
  }
  
  

  // Set loading state for all token-related elements
  const coinNameEl = document.querySelector('.coin-name');
  if (coinNameEl) {
    coinNameEl.textContent = 'Loading...';
  }
  
  const coinSymbolEl = document.querySelector('.coin-symbol');
  if (coinSymbolEl) {
    coinSymbolEl.textContent = 'Loading...';
  }
  
  const streamTitleEl = document.getElementById('stream-title');
  if (streamTitleEl) {
    streamTitleEl.textContent = 'Loading...';
  }
  
  // Set title to "Loading..." immediately
  document.title = 'Loading... - Pump';
  
  // Show loading state for images
  const coinImageMain = document.querySelector('.coin-image-main img');
  const coinImageBg = document.querySelector('.coin-image-bg img');
  if (coinImageMain) {
    coinImageMain.style.opacity = '0.5';
    coinImageMain.style.filter = 'grayscale(100%)';
  }
  if (coinImageBg) {
    coinImageBg.style.opacity = '0.5';
    coinImageBg.style.filter = 'grayscale(100%)';
  }

  // Mark that we've started loading
  window._tokenLoaderHasTriedLoading = true;
  window._tokenLoaderHasRealData = false; // Reset flag to prevent showing generated data early
  
  // Ensure "Loading..." is shown immediately and stays until real data arrives
  // (Elements are already set to "Loading..." in initTokenLoader function above)
  
  // Try to fetch real token data with fast retries
  const originalId = window._tokenOriginalId || mintAddress;
  const fullCoinId = originalId.endsWith('pump') ? originalId : `${originalId}pump`;
  
  // Improved retry function with better error handling
  async function tryFetchWithRetries(maxRetries = 4, delay = 300) {
    let lastError = null;
    let bestResult = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const htmlData = await fetchTokenDataFromHTML(fullCoinId);
        
        // If we got complete data (both name and image), return immediately
        if (htmlData && htmlData.name && htmlData.image_uri) {
          return htmlData;
        }
        
        // If we got partial data, save it as best result
        if (htmlData && (htmlData.name || htmlData.image_uri)) {
          // Update best result if this one is better
          if (!bestResult || 
              (htmlData.name && !bestResult.name) || 
              (htmlData.image_uri && !bestResult.image_uri)) {
            bestResult = htmlData;
          }
          
          // If we have both name and image now, return
          if (bestResult.name && bestResult.image_uri) {
            return bestResult;
          }
        }
        
        // Wait before next retry (except for last attempt)
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (err) {
        lastError = err;
        // Wait before next retry (except for last attempt)
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // Return best result we got, even if incomplete
    return bestResult;
  }
  
  // Start fetching with improved retries
  const htmlData = await tryFetchWithRetries(4, 300); // 4 attempts with 300ms delay
  
  if (htmlData && (htmlData.name || htmlData.image_uri)) {
    // Real data found, update immediately
    window._tokenLoaderHasRealData = true;
    updatePageWithTokenData(htmlData, mintAddress);
    
    // If we got partial data (only name or only image), try one more fetch in background
    if ((htmlData.name && !htmlData.image_uri) || (!htmlData.name && htmlData.image_uri)) {
      // Don't wait, fetch in background for missing data
      tryFetchWithRetries(2, 200).then(additionalData => {
        if (additionalData) {
          const updatedData = {
            ...htmlData,
            name: additionalData.name || htmlData.name,
            symbol: additionalData.symbol || htmlData.symbol,
            image_uri: additionalData.image_uri || htmlData.image_uri,
            imageUri: additionalData.image_uri || htmlData.image_uri,
            image: additionalData.image_uri || htmlData.image_uri
          };
          updatePageWithTokenData(updatedData, mintAddress);
        }
      }).catch(() => {
        // Ignore errors in background fetch
      });
    }
    
    return;
  }
  
  // If still no data after all retries, show generated data after delay
  setTimeout(() => {
    if (!window._tokenLoaderHasRealData) {
      window._tokenLoaderFinishedLoading = true;
      const generatedData = generateTokenDataFromMint(mintAddress);
      if (generatedData) {
        updatePageWithTokenData(generatedData, mintAddress);
      }
    }
  }, 10000); // Show generated data after 10 seconds if no real data
}

function getTokenImageUrl(tokenData, mintAddress) {
  if (tokenData?.image_uri) {
    return tokenData.image_uri;
  }
  if (tokenData?.imageUri) {
    return tokenData.imageUri;
  }
  if (tokenData?.image) {
    return tokenData.image;
  }
  


  if (mintAddress) {
    const originalId = window._tokenOriginalId || mintAddress;
    // Ensure we don't add "pump" twice
    const coinId = originalId.endsWith('pump') ? originalId : `${originalId}pump`;
    const imageUrl = `https://images.pump.fun/coin-image/${coinId}?variant=86x86`;
    return imageUrl;
  }
  
  return '/pump1.svg';
}


function getStreamImageForToken(tokenData, mintAddress) {

  if (tokenData?.image_uri || tokenData?.imageUri || tokenData?.image) {
    return tokenData.image_uri || tokenData.imageUri || tokenData.image;
  }
  
  // Don't return default stream image - return null instead
  return null;
}


function hashStringToNumber(str, max) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; 
  }
  return Math.abs(hash) % max;
}

function generateTokenDataFromMint(mintAddress) {
  if (!mintAddress) return null;
  
  const hash1 = hashStringToNumber(mintAddress, 1000);
  const hash2 = hashStringToNumber(mintAddress + 'name', 1000);
  const hash3 = hashStringToNumber(mintAddress + 'symbol', 26);
  
  const namePrefixes = ['Pixel', 'Doge', 'Pepe', 'Bonk', 'Worm', 'Cat', 'Dog', 'Moon', 'Rocket', 'Diamond', 'Gold', 'Silver', 'Crypto', 'Super', 'Mega', 'Ultra', 'Hyper', 'Turbo', 'Pro', 'Elite', 'Prime', 'Alpha', 'Beta', 'Gamma', 'Delta'];
  const nameSuffixes = ['Coin', 'Token', 'Inu', 'Coin', 'Token', 'Coin', 'Token', 'Coin', 'Token', 'Coin', 'Token', 'Coin', 'Token', 'Coin', 'Token'];
  const nameIndex = hash1 % namePrefixes.length;
  const suffixIndex = hash2 % nameSuffixes.length;
  const nameNumber = (hash1 + hash2) % 9999;
  
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const symbolLength = 3 + (hash3 % 3); 
  let symbol = '';
  
  const firstLetterHash = hashStringToNumber(mintAddress + '0', 13);
  symbol += letters[firstLetterHash];
  
  for (let i = 1; i < symbolLength - 1; i++) {
    const letterHash = hashStringToNumber(mintAddress + i.toString(), letters.length);
    symbol += letters[letterHash];
  }
  
  if (symbolLength > 2) {
    const lastLetterHash = hashStringToNumber(mintAddress + 'last', letters.length);
    symbol += letters[lastLetterHash];
  }
  
  // mintAddress doesn't contain "pump", so we need to add it
  const coinId = mintAddress.endsWith('pump') ? mintAddress : `${mintAddress}pump`;
  const imagePatterns = [
    `https://images.pump.fun/coin-image/${coinId}?variant=86x86`,
    `https://images.pump.fun/coin-image/${coinId}`,
    `https://pump.fun/coin-image/${coinId}`
  ];
  
  return {
    name: `${namePrefixes[nameIndex]} ${nameSuffixes[suffixIndex]} ${nameNumber}`,
    symbol: symbol,
    image_uri: null,
    description: `Token ${mintAddress.slice(0, 8)}...${mintAddress.slice(-8)}`,
    mint: mintAddress,
    _generated: true
  };
}

function updatePageWithTokenData(tokenData, mintAddress) {
  if (!tokenData) {
    return;
  }
  
  // Don't update if it's generated data and we're still loading real data
  if (tokenData._generated) {
    // Only show generated data if we've finished trying to load
    const hasFinishedLoading = window._tokenLoaderFinishedLoading;
    if (!hasFinishedLoading) {
      return; // Keep showing "Loading..." instead of generated data
    }
    // Don't update title for generated data - always show "Loading..."
    tokenData._skipTitleUpdate = true;
    document.title = 'Loading... - Pump';
    // Don't update page elements with generated data if we're still trying to load
    if (!window._tokenLoaderFinishedLoading) {
      return;
    }
  } else {
    // Mark that we have real data
    window._tokenLoaderHasRealData = true;
    
    // Mark token data as loaded
    if (window._loadingState) {
      if (tokenData.name) {
        window._loadingState.tokenName = true;
        // Immediately check if we can hide overlay (don't wait for image)
        if (window.checkAllResourcesLoaded) {
          window.checkAllResourcesLoaded();
        }
      }
      if (tokenData.image_uri || tokenData.imageUri || tokenData.image) {
        window._loadingState.tokenImage = true;
      }
    }
  }

  const coinNameEl = document.querySelector('.coin-name');
  if (coinNameEl && tokenData.name) {
    coinNameEl.textContent = tokenData.name;
  } else if (coinNameEl && !tokenData.name) {
    coinNameEl.textContent = 'Loading...';
  }
  

  const streamTitleEl = document.getElementById('stream-title');
  if (streamTitleEl && tokenData.name) {
    streamTitleEl.textContent = tokenData.name;
  } else if (streamTitleEl && !tokenData.name) {
    streamTitleEl.textContent = 'Loading...';
  }
  
  const coinSymbolEl = document.querySelector('.coin-symbol');
  const tokenSymbol = tokenData.symbol ? tokenData.symbol.toUpperCase() : '';
  if (coinSymbolEl) {
    if (tokenSymbol) {
      coinSymbolEl.textContent = tokenSymbol;
    } else {
      coinSymbolEl.textContent = 'Loading...';
    }
  }
  
  const coinImageMain = document.querySelector('.coin-image-main img');
  const coinImageBg = document.querySelector('.coin-image-bg img');
  
  // Reset image styles from loading state
  if (coinImageMain) {
    coinImageMain.style.opacity = '1';
    coinImageMain.style.filter = 'none';
  }
  if (coinImageBg) {
    coinImageBg.style.opacity = '1';
    coinImageBg.style.filter = 'none';
  }
  
  let tokenImageUrl = null;
  
  if (tokenData?.image_uri) {
    tokenImageUrl = tokenData.image_uri;
  } else if (tokenData?.imageUri) {
    tokenImageUrl = tokenData.imageUri;
  } else if (tokenData?.image) {
    tokenImageUrl = tokenData.image;
  } else {
    tokenImageUrl = getTokenImageUrl(tokenData, mintAddress);
  }
  
  const originalId = window._tokenOriginalId || mintAddress;
  const coinId = originalId.endsWith('pump') ? originalId : `${originalId}pump`;
  const alternativeUrls = [];
  
  // Multiple fallback URLs for better reliability
  if (tokenImageUrl && tokenImageUrl.includes('images.pump.fun')) {
    alternativeUrls.push(
      tokenImageUrl,
      `https://images.pump.fun/coin-image/${coinId}?variant=86x86`,
      `https://images.pump.fun/coin-image/${coinId}?variant=200x200`,
      `https://images.pump.fun/coin-image/${coinId}`
    );
  } else if (tokenImageUrl) {
    alternativeUrls.push(tokenImageUrl);
    // Add fallbacks even if we have a custom URL
    alternativeUrls.push(
      `https://images.pump.fun/coin-image/${coinId}?variant=86x86`,
      `https://images.pump.fun/coin-image/${coinId}`
    );
  } else {
    // Multiple fallback URLs
    alternativeUrls.push(
      `https://images.pump.fun/coin-image/${coinId}?variant=86x86`,
      `https://images.pump.fun/coin-image/${coinId}?variant=200x200`,
      `https://images.pump.fun/coin-image/${coinId}`
    );
  }
  
  
  async function tryLoadImage(imgElement, urls, fallbackUrl, elementName) {
    if (!imgElement) {
      return;
    }
    
    imgElement.onerror = null;
    imgElement.onload = null;
    imgElement.crossOrigin = 'anonymous';
    
    // Load all URLs in parallel for faster loading
    async function loadViaProxy(imageUrl) {
      try {
        const proxyUrl = `${window.location.origin}/proxy?url=${encodeURIComponent(imageUrl)}`;
        
        const response = await fetch(proxyUrl);
        
        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          
          // Check content type first without cloning
          if (!contentType.startsWith('image/') && 
              !contentType.includes('octet-stream') && 
              !contentType.includes('svg')) {
            // Only read text if needed (for debugging)
            if (contentType.includes('text/html')) {
              throw new Error(`Proxy returned HTML instead of image: ${contentType}`);
            }
          }
          
          // Clone only once when we know it's an image
          const blob = await response.blob();
          
          // Limit blob size to prevent memory issues (max 2MB)
          if (blob.size > 2 * 1024 * 1024) {
            throw new Error('Image too large (>2MB)');
          }
          
          if (blob.size === 0) {
            throw new Error('Empty blob received');
          }
          
          if (blob.type.includes('text/html')) {
            throw new Error('Proxy returned HTML instead of image');
          }
          
          const blobUrl = URL.createObjectURL(blob);
          
          // Store blob URL for cleanup
          if (!window._blobUrls) {
            window._blobUrls = new Set();
          }
          window._blobUrls.add(blobUrl);
          
          // Clean up old blob URLs if too many (max 3)
          if (window._blobUrls.size > 3) {
            const urlsToRemove = Array.from(window._blobUrls).slice(0, window._blobUrls.size - 3);
            urlsToRemove.forEach(url => {
              try {
                URL.revokeObjectURL(url);
                window._blobUrls.delete(url);
              } catch (e) {
                // Ignore errors
              }
            });
          }
          
          return blobUrl;
        } else {
          throw new Error(`Proxy request failed: ${response.status}`);
        }
      } catch (err) {
        throw err;
      }
    }
    
    // Load all URLs in parallel for faster loading
    const loadPromises = urls.map(async (url) => {
      try {
        if (url.includes('images.pump.fun')) {
          return await loadViaProxy(url);
        } else {
          // Test direct URL loading
          return new Promise((resolve, reject) => {
            const testImg = new Image();
            testImg.crossOrigin = 'anonymous';
            const timeout = setTimeout(() => reject(new Error('Timeout')), 3000);
            testImg.onload = () => {
              clearTimeout(timeout);
              resolve(url);
            };
            testImg.onerror = () => {
              clearTimeout(timeout);
              reject(new Error('Failed to load'));
            };
            testImg.src = url;
          });
        }
      } catch (err) {
        throw err;
      }
    });
    
    // Try all URLs in parallel, use first successful one
    try {
      const results = await Promise.allSettled(loadPromises);
      let loadedUrl = null;
      
      for (let i = 0; i < results.length; i++) {
        if (results[i].status === 'fulfilled') {
          loadedUrl = results[i].value || urls[i];
          break;
        }
      }
      
      if (loadedUrl) {
        imgElement.src = loadedUrl;
        imgElement.style.display = 'block';
        imgElement.style.opacity = '1';
        imgElement.style.filter = 'none';
        
        // Clean up blob URL after image loads
        if (loadedUrl.startsWith('blob:')) {
          imgElement.onload = function() {
            setTimeout(() => {
              if (window._blobUrls && window._blobUrls.has(loadedUrl)) {
                URL.revokeObjectURL(loadedUrl);
                window._blobUrls.delete(loadedUrl);
              }
            }, 1000);
          };
        }
      } else {
        // Fallback if all failed
        imgElement.src = fallbackUrl;
        imgElement.onerror = function() {
          this.style.display = 'none';
          this.onerror = null;
        };
      }
    } catch (error) {
      // Fallback on error
      imgElement.src = fallbackUrl;
      imgElement.onerror = function() {
        this.style.display = 'none';
        this.onerror = null;
      };
    }
  }
  
  // Load both images in parallel for faster loading
  const imageLoadPromises = [];
  
  if (coinImageMain) {
    coinImageMain.alt = tokenData.name || 'Token image';
    imageLoadPromises.push(
      tryLoadImage(coinImageMain, alternativeUrls, '/pump1.svg', 'Coin image main').then(() => {
        // Mark image as loaded
        if (window._loadingState) {
          window._loadingState.tokenImage = true;
          if (window.checkAllResourcesLoaded) {
            window.checkAllResourcesLoaded();
          }
        }
      }).catch(err => {
        // Error handled in tryLoadImage
      })
    );
  }
  
  if (coinImageBg) {
    coinImageBg.alt = tokenData.name || 'Token image';
    imageLoadPromises.push(
      tryLoadImage(coinImageBg, alternativeUrls, '/pump1.svg', 'Coin image background').catch(err => {
        // Error handled in tryLoadImage
      })
    );
  }
  
  // Wait for all images to load in parallel (don't block, just track)
  Promise.allSettled(imageLoadPromises).then(() => {
    // All images loaded or failed
  });
  
          let imageToUse = null;
          if (!tokenData._generated && (tokenData.image_uri || tokenData.imageUri || tokenData.image)) {
            imageToUse = tokenData.image_uri || tokenData.imageUri || tokenData.image;
          } else {
            imageToUse = getStreamImageForToken(tokenData, mintAddress);
          }
  
  if (imageToUse) {
    setStreamBackground(imageToUse);
  }
  
          // Only update title if we have real data (not generated) and not skipped
          // Never update title with generated data - always show "Loading..." until real data arrives
          if (!tokenData._generated && !tokenData._skipTitleUpdate && tokenData.name && tokenData.name !== 'Token' && !tokenData.name.startsWith('Token ')) {
            document.title = `${tokenData.name}${tokenSymbol ? ` (${tokenSymbol})` : ''} - Pump`;
          } else if (tokenData._generated || tokenData.name === 'Token' || tokenData.name.startsWith('Token ')) {
            // Keep "Loading..." for generated data or fallback tokens
            document.title = 'Loading... - Pump';
          }
          
          updateSocialMetaTags(tokenData, tokenSymbol, mintAddress);
          
          // Check if all resources are loaded after updating
          if (window.checkAllResourcesLoaded) {
            window.checkAllResourcesLoaded();
          }
          
  if (tokenData.creator) {
    const creatorNameEl = document.querySelector('.coin-meta span');
    if (creatorNameEl && tokenData.creator.username) {
      creatorNameEl.textContent = tokenData.creator.username;
    }
  }
  
  const tradeActions = document.querySelector('.trade-actions');
  if (tradeActions && tokenSymbol) {
    const switchBtn = tradeActions.querySelector('.trade-action-btn:first-child');
    if (switchBtn) {
      switchBtn.textContent = `Switch to ${tokenSymbol.toUpperCase()}`;
    }
  }
  
  const copyBtn = document.querySelector('.coin-action-btn.copy span');
  if (copyBtn && mintAddress) {
    const shortAddress = mintAddress.length > 8 
      ? `${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`
      : mintAddress;
    copyBtn.textContent = shortAddress;
  }
  
}

function updateSocialMetaTags(tokenData, tokenSymbol, mintAddress) {
  if (!tokenData) return;
  
          const coinName = tokenData.name || 'Token';
          const symbol = tokenSymbol || tokenData.symbol || '';
          // Format description like original: "{NAME} is... Ticker: ${SYMBOL}"
          let description = tokenData.description || '';
          if (description && !description.includes('Ticker:')) {
            if (symbol) {
              description = `${description} Ticker: $${symbol}`;
            }
          } else if (!description && symbol) {
            description = `${coinName} Ticker: $${symbol}`;
          } else if (!description) {
            description = coinName;
          }
          
          const currentUrl = window.location.href;
          let imageUrl = '';
          const originalId = window._tokenOriginalId || mintAddress;
          let coinImageUrl = '';
          
          if (originalId) {
            const coinIdForImage = originalId.endsWith('pump') ? originalId : `${originalId}pump`;
            coinImageUrl = `https://images.pump.fun/coin-image/${coinIdForImage}?variant=86x86`;
          } else {
            const origin = window.location.origin;
            coinImageUrl = origin + '/pump1.svg';
          }
          
          if (coinImageUrl && !coinImageUrl.startsWith('http')) {
            coinImageUrl = window.location.origin + coinImageUrl;
          }
          
          if (coinImageUrl && coinImageUrl.startsWith('//')) {
            coinImageUrl = window.location.protocol + coinImageUrl;
          }
          
          // Use OG image API with banner, coin icon and name (always generate banner if we have tokenId)
          if (originalId) {
            const cleanTokenId = originalId.endsWith('pump') ? originalId.slice(0, -4) : originalId;
            // Always generate banner, even if coinName is "Loading..." or empty
            const displayName = (coinName && coinName !== 'Token' && !coinName.startsWith('Token ')) ? coinName : 'Loading...';
            const displaySymbol = symbol || '';
            imageUrl = `${window.location.origin}/api/og-image?tokenId=${encodeURIComponent(cleanTokenId)}&name=${encodeURIComponent(displayName)}&symbol=${encodeURIComponent(displaySymbol)}&coinImage=${encodeURIComponent(coinImageUrl)}`;
          } else {
            imageUrl = coinImageUrl;
          }
  const ogTitle = document.getElementById('og-title');
  const ogDescription = document.getElementById('og-description');
  const ogImage = document.getElementById('og-image');
  const ogUrl = document.getElementById('og-url');
  
  if (ogTitle) ogTitle.setAttribute('content', `${coinName} (${symbol}) - Pump`);
  if (ogDescription) ogDescription.setAttribute('content', description);
  if (ogImage) ogImage.setAttribute('content', imageUrl);
  if (ogUrl) ogUrl.setAttribute('content', currentUrl);
  
  const twitterTitle = document.getElementById('twitter-title');
  const twitterDescription = document.getElementById('twitter-description');
  const twitterImage = document.getElementById('twitter-image');
  const twitterUrl = document.getElementById('twitter-url');
  
  if (twitterTitle) twitterTitle.setAttribute('content', `${coinName} (${symbol}) - Pump`);
  if (twitterDescription) twitterDescription.setAttribute('content', description);
  if (twitterImage) twitterImage.setAttribute('content', imageUrl);
  if (twitterUrl) twitterUrl.setAttribute('content', currentUrl);
  
  // Add twitter:image:type, twitter:image:width, twitter:image:height (like original)
  let twitterImageType = document.querySelector('meta[name="twitter:image:type"]');
  if (!twitterImageType) {
    twitterImageType = document.createElement('meta');
    twitterImageType.setAttribute('name', 'twitter:image:type');
    document.head.appendChild(twitterImageType);
  }
  twitterImageType.setAttribute('content', 'image/png');
  
  let twitterImageWidth = document.querySelector('meta[name="twitter:image:width"]');
  if (!twitterImageWidth) {
    twitterImageWidth = document.createElement('meta');
    twitterImageWidth.setAttribute('name', 'twitter:image:width');
    document.head.appendChild(twitterImageWidth);
  }
  twitterImageWidth.setAttribute('content', '1200');
  
  let twitterImageHeight = document.querySelector('meta[name="twitter:image:height"]');
  if (!twitterImageHeight) {
    twitterImageHeight = document.createElement('meta');
    twitterImageHeight.setAttribute('name', 'twitter:image:height');
    document.head.appendChild(twitterImageHeight);
  }
  twitterImageHeight.setAttribute('content', '630');
  
  // Track OG image loading
  if (imageUrl) {
    const ogImg = new Image();
    ogImg.onload = function() {
      if (window._loadingState) {
        window._loadingState.ogImage = true;
        if (window.checkAllResourcesLoaded) {
          window.checkAllResourcesLoaded();
        }
      }
    };
    ogImg.onerror = function() {
      // Even if OG image fails, mark as ready (optional resource)
      if (window._loadingState) {
        window._loadingState.ogImage = true;
        if (window.checkAllResourcesLoaded) {
          window.checkAllResourcesLoaded();
        }
      }
    };
    ogImg.src = imageUrl;
  } else if (window._loadingState) {
    // No OG image to load, mark as ready
    window._loadingState.ogImage = true;
    if (window.checkAllResourcesLoaded) {
      window.checkAllResourcesLoaded();
    }
  }
}


window.TokenLoader = {
  init: initTokenLoader,
  fetchTokenData: fetchTokenData,
  updatePageWithTokenData: updatePageWithTokenData,
  getTokenMintFromURL: getTokenMintFromURL
};
