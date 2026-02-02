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
  
  try {

    const originalId = window._tokenOriginalId || coinId;
    const fullCoinId = originalId.endsWith('pump') ? originalId : `${originalId}pump`;
    
    const targetUrl = `https:
    const proxyUrls = [
      `https:
    ];
    
    for (const proxyUrl of proxyUrls) {
      try {
        

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // Reduced from 4000 to 2000ms 
        
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
          imageUrl = `https:
          

          const jsonLd = doc.querySelector('script[type="application/ld+json"]');
          if (jsonLd) {
            try {
              const data = JSON.parse(jsonLd.textContent);
              if (data.name && !coinName) coinName = data.name;
              if (data.image && !imageUrl) imageUrl = data.image;
            } catch (e) {
            }
          }
          

          const scripts = doc.querySelectorAll('script');
          for (const script of scripts) {
            if (script.textContent) {

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
                      imageUrl = `https:
                    } else if (!imageUrl.startsWith('http')) {
                      imageUrl = `https:
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
                        imageUrl = `https:
                      } else if (!imageUrl.startsWith('http')) {
                        imageUrl = `https:
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
                  let constructedUrl = `https:
                  
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
                        imageUrl = `https:
                      }
                    }
                  }
                  if (jsonData.image_uri && !imageUrl) {
                    const foundImage = jsonData.image_uri;
                    if (!foundImage.includes('opengraph')) {
                      imageUrl = foundImage;
                      if (imageUrl.startsWith('/')) {
                        imageUrl = `https:
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
            return {
              name: coinName || null,
              symbol: coinSymbol || null,
              image_uri: imageUrl || null,
              imageUri: imageUrl || null,
              image: imageUrl || null,
              mint: coinId,
              _fromHTML: true
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


async function fetchTokenData(mintAddress) {
  if (!mintAddress) {
    return null;
  }
  
  const originalId = window._tokenOriginalId || mintAddress;
  const fullCoinId = originalId.endsWith('pump') ? originalId : `${originalId}pump`;
  const htmlPromise = fetchTokenDataFromHTML(fullCoinId).catch(() => null);
  const htmlTimeout = new Promise(resolve => setTimeout(() => resolve(null), 5000)); // Reduced from 10000 to 5000ms
  const htmlData = await Promise.race([htmlPromise, htmlTimeout]);
  
  if (htmlData && (htmlData.name || htmlData.image_uri)) {
    return htmlData;
  }
  
  return null;
}


async function fetchTokenMetadataFromSolana(mintAddress) {
  try {

    const metadataEndpoints = [
      `https:
      `https:
      `https:
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
              videoBg.style.setProperty('background-image', `url('/assets/streams/stream1.png')`, 'important');
            }
          };
          altTestImg.src = altPath;
        } else {
          videoBg.style.setProperty('background-image', `url('/assets/streams/stream1.png')`, 'important');
        }
      };
      tryNextPath();
    } else {
      videoBg.style.setProperty('background-image', `url('/assets/streams/stream1.png')`, 'important');
    }
  };
  testImg.src = pathToUse;
  
  return true;
}


async function initTokenLoader() {
  

  const defaultStream = '/assets/streams/stream1.png';
  setStreamBackground(defaultStream);
  
  const mintAddress = getTokenMintFromURL();
  
  if (!mintAddress) {
    return;
  }
  
  

  const coinNameEl = document.querySelector('.coin-name');
  if (coinNameEl) {
    coinNameEl.textContent = 'Loading...';
  }
  

  let tokenData = await fetchTokenData(mintAddress);
  
  if (tokenData) {
    updatePageWithTokenData(tokenData, mintAddress);
  } else {
    const generatedData = generateTokenDataFromMint(mintAddress);
    
    if (generatedData) {
      updatePageWithTokenData(generatedData, mintAddress);
    } else {
      if (coinNameEl) {
        coinNameEl.textContent = 'Peponk';
      }
    }
    
    // Load data in background without blocking
    setTimeout(async () => {
      const originalId = window._tokenOriginalId || mintAddress;
      const fullCoinId = originalId.endsWith('pump') ? originalId : `${originalId}pump`;
      const lateHtmlData = await fetchTokenDataFromHTML(fullCoinId).catch(() => null);
      
      if (lateHtmlData && (lateHtmlData.name || lateHtmlData.image_uri)) {
        updatePageWithTokenData(lateHtmlData, mintAddress);
      }
    }, 1000); // Reduced from 2000 to 1000ms
  }
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


    const imageUrl = `https:
    return imageUrl;
  }
  
  return '/pump1.svg';
}


function getStreamImageForToken(tokenData, mintAddress) {

  if (tokenData?.image_uri || tokenData?.imageUri || tokenData?.image) {
    return tokenData.image_uri || tokenData.imageUri || tokenData.image;
  }
  




  return '/assets/streams/stream1.png';
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
  
  const imagePatterns = [
    `https:
    `https:
    `https:
  ];
  
  const streamImage = '/assets/streams/stream1.png';
  
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
  

  const coinNameEl = document.querySelector('.coin-name');
  if (coinNameEl && tokenData.name) {
    coinNameEl.textContent = tokenData.name;
  }
  

  const streamTitleEl = document.getElementById('stream-title');
  if (streamTitleEl && tokenData.name) {
    streamTitleEl.textContent = tokenData.name;
  }
  
  const coinSymbolEl = document.querySelector('.coin-symbol');
  const tokenSymbol = tokenData.symbol ? tokenData.symbol.toUpperCase() : '';
  if (coinSymbolEl && tokenSymbol) {
    coinSymbolEl.textContent = tokenSymbol;
  }
  
  const coinImageMain = document.querySelector('.coin-image-main img');
  const coinImageBg = document.querySelector('.coin-image-bg img');
  
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
  const alternativeUrls = [];
  
  if (tokenImageUrl && tokenImageUrl.includes('images.pump.fun')) {
    const baseUrl = tokenImageUrl.split('?')[0];
    alternativeUrls.push(
      tokenImageUrl,
      baseUrl,
      `https:
      `https:
      `https:
    );
  } else {
    alternativeUrls.push(tokenImageUrl);
  }
  
  
  async function tryLoadImage(imgElement, urls, fallbackUrl, elementName) {
    if (!imgElement) {
      return;
    }
    
    imgElement.onerror = null;
    imgElement.onload = null;
    imgElement.crossOrigin = 'anonymous';
    
    let currentIndex = 0;
    let loaded = false;
    
    function tryNextUrl() {
      if (currentIndex >= urls.length) {
        if (!loaded && urls[0] && urls[0].startsWith('http')) {
          loadViaProxy(urls[0]);
          return;
        }
        if (!loaded) {
          imgElement.src = fallbackUrl;
          imgElement.onerror = function() {
            this.style.display = 'none';
            this.onerror = null;
          };
        }
        return;
      }
      
              const url = urls[currentIndex];
              
              if (url.includes('images.pump.fun')) {
                loadViaProxy(url);
                return;
              }
      
      imgElement.src = url;
      
      imgElement.onerror = function() {
        currentIndex++;
        tryNextUrl();
      };
      
      imgElement.onload = function() {
        if (!loaded) {
          loaded = true;
          this.style.display = 'block';
          this.style.opacity = '1';
          this.onerror = null;
        }
      };
    }
    
    async function loadViaProxy(imageUrl) {
      try {

        const proxyUrl = `${window.location.origin}/proxy?url=${encodeURIComponent(imageUrl)}`;
        
        const response = await fetch(proxyUrl);
        
        if (response.ok) {

          const contentType = response.headers.get('content-type') || '';
          

          const responseClone = response.clone();
          

          if (!contentType.startsWith('image/') && 
              !contentType.includes('octet-stream') && 
              !contentType.includes('svg')) {

            const text = await response.text();
            console.warn(`[IMAGE DEBUG] Proxy returned non-image content for ${imageUrl}: ${contentType}`, text.substring(0, 200));
            

            if (contentType.includes('text/html')) {
              throw new Error(`Proxy returned HTML instead of image: ${contentType}`);
            }
            

            const blob = await responseClone.blob();
            console.log('[IMAGE DEBUG] loadViaProxy: Blob type:', blob.type, 'size:', blob.size);
            

            if (blob.type && blob.type.startsWith('image/')) {

              console.log('[IMAGE DEBUG] loadViaProxy: Blob type is correct, using it');
            } else if (blob.size > 100 && !blob.type.includes('text/html')) {

              console.log('[IMAGE DEBUG] loadViaProxy: Blob has content, trying to use despite wrong content-type');
            } else {
              throw new Error(`Proxy returned non-image content: ${contentType}`);
            }
          }
          

          const blob = await responseClone.blob();
          
          if (blob.size === 0) {
            throw new Error('Empty blob received');
          }
          

          if (blob.type.includes('text/html')) {
            throw new Error('Proxy returned HTML instead of image');
          }
          
          const blobUrl = URL.createObjectURL(blob);
          
                  imgElement.src = blobUrl;
                  imgElement.onload = function() {
                    if (!loaded) {
                      loaded = true;
                      this.style.display = 'block';
                      this.style.opacity = '1';
                      this.onerror = null;
                      URL.revokeObjectURL(blobUrl);
                    }
                  };
          
          imgElement.onerror = function() {
            URL.revokeObjectURL(blobUrl);
            if (!loaded) {
              this.src = fallbackUrl;
              this.onerror = function() {
                this.style.display = 'none';
                this.onerror = null;
              };
            }
          };
        } else {
          throw new Error(`Proxy request failed: ${response.status}`);
        }
      } catch (err) {
        if (!loaded) {
          imgElement.src = fallbackUrl;
          imgElement.onerror = function() {
            this.style.display = 'none';
            this.onerror = null;
          };
        }
            }
          }
          
          tryNextUrl();
  }
  
  if (coinImageMain) {
    coinImageMain.alt = tokenData.name || 'Token image';
    tryLoadImage(coinImageMain, alternativeUrls, '/pump1.svg', 'Coin image main').catch(err => {
    });
  }
  
  if (coinImageBg) {
    coinImageBg.alt = tokenData.name || 'Token image';
    tryLoadImage(coinImageBg, alternativeUrls, '/pump1.svg', 'Coin image background').catch(err => {
    });
  }
  
          let imageToUse = null;
          if (!tokenData._generated && (tokenData.image_uri || tokenData.imageUri || tokenData.image)) {
            imageToUse = tokenData.image_uri || tokenData.imageUri || tokenData.image;
          } else {
            imageToUse = getStreamImageForToken(tokenData, mintAddress);
          }
  
  if (imageToUse) {
    setStreamBackground(imageToUse);
  }
  
          if (tokenData.name) {
            document.title = `${tokenData.name} (${tokenSymbol}) - Pump`;
          }
          
          updateSocialMetaTags(tokenData, tokenSymbol, mintAddress);
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
          const description = tokenData.description || `Trade ${coinName} (${symbol}) on Pump. Pump allows anyone to create coins. All coins created on Pump are fair-launch, meaning everyone has equal access to buy and sell when the coin is first created.`;
          
          const currentUrl = window.location.href;
          let imageUrl = '';
          const originalId = window._tokenOriginalId || mintAddress;
          if (originalId) {
            imageUrl = `https:
          } else {
            const origin = window.location.origin;
            imageUrl = origin + '/pump1.svg';
          }
          
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = window.location.origin + imageUrl;
          }
          
          if (imageUrl && imageUrl.startsWith('
            imageUrl = window.location.protocol + imageUrl;
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
}


window.TokenLoader = {
  init: initTokenLoader,
  fetchTokenData: fetchTokenData,
  updatePageWithTokenData: updatePageWithTokenData,
  getTokenMintFromURL: getTokenMintFromURL
};
