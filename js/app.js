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
          executeBtn.textContent = 'Log in to sell';
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

document.addEventListener('DOMContentLoaded', function() {
  // Show loading overlay and prevent scrolling
  document.body.classList.add('loading');
  
  initModal();
  

  const connectWalletBtn = document.getElementById('connectWalletBtn');
  if (connectWalletBtn) {
    connectWalletBtn.addEventListener('click', connectWallet);
  }
  


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
    tailwindScript: false
  };
  
  // Check if tailwind.cjs.js is already loaded or loading
  const existingTailwindScript = document.querySelector('script[src="/tailwind.cjs.js"]');
  if (existingTailwindScript) {
    // Script element exists, check if it's loaded
    if (existingTailwindScript.complete || existingTailwindScript.readyState === 'complete') {
      window._loadingState.tailwindScript = true;
    } else {
      // Script is loading, wait for it
      existingTailwindScript.addEventListener('load', function() {
        window._loadingState.tailwindScript = true;
        if (window.checkAllResourcesLoaded) {
          window.checkAllResourcesLoaded();
        }
      }, { once: true });
    }
  } else {
    // Script not needed yet (will be loaded on wallet button click)
    // Mark as ready so it doesn't block overlay hiding
    window._loadingState.tailwindScript = true;
  }
  
  // Function to check if all resources are loaded
  function checkAllResourcesLoaded() {
    const state = window._loadingState;
    // Check if token data is loaded (name and image)
    const hasTokenData = state.tokenName && state.tokenImage;
    // Check if tailwind script is loaded (or not needed - only if user clicked wallet button)
    const tailwindReady = state.tailwindScript || !document.querySelector('script[src="/tailwind.cjs.js"]');
    
    // Check if OG image is loaded (or not needed)
    const ogImageReady = state.ogImage || true; // OG image is optional, mark as ready if not set
    
    if (hasTokenData && tailwindReady && ogImageReady) {
      // All resources loaded, hide overlay
      const overlay = document.getElementById('loadingOverlay');
      if (overlay) {
        overlay.classList.add('hidden');
        document.body.classList.remove('loading');
      }
    }
  }
  
  // Expose check function globally
  window.checkAllResourcesLoaded = checkAllResourcesLoaded;
  
  // Initialize token loader - wait for TokenLoader to be available
  function initTokenLoaderWhenReady() {
    if (window.TokenLoader && window.TokenLoader.init) {
      window.TokenLoader.init();
    } else if (typeof initTokenLoader === 'function') {
      initTokenLoader();
    } else {
      // TokenLoader not ready yet, wait a bit and try again
      setTimeout(initTokenLoaderWhenReady, 50);
    }
  }
  
  // Try to initialize immediately
  initTokenLoaderWhenReady();
  

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
  initStreamVideo();
});


function initLiveChat() {
  const chatMessagesList = document.getElementById('chatMessagesList');
  const chatEmptyState = document.getElementById('chatEmptyState');
  if (!chatMessagesList) return;
  

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
  
  // Generate avatar placeholder with initials
  function generateAvatarPlaceholder(username, color) {
    const initials = username.substring(0, 2).toUpperCase();
    const svg = `
      <svg width="28" height="28" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="14" fill="${color}"/>
        <text x="14" y="14" font-family="Arial, sans-serif" font-size="10" font-weight="600" fill="white" text-anchor="middle" dominant-baseline="central">${initials}</text>
      </svg>
    `;
    return 'data:image/svg+xml;base64,' + btoa(svg);
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
  // Create initial messages immediately (5-8 messages)
  const initialMessagesCount = Math.floor(Math.random() * 4) + 5; // 5-8 messages
  for (let i = 0; i < initialMessagesCount; i++) {
    setTimeout(() => {
      createNewMessage();
    }, i * 200); // Stagger initial messages by 200ms
  }
  
  // Then create new messages every 1-3 seconds (faster)
  const messageInterval = setInterval(() => {
    createNewMessage();
  }, Math.random() * 2000 + 1000); // Random interval between 1-3 seconds
  
  // Store interval ID for cleanup if needed
  window.chatMessageInterval = messageInterval;
}

// Initialize stream video with lazy loading
function initStreamVideo() {
  console.log('[VIDEO] Initializing stream video...');
  const video = document.getElementById('stream-video');
  if (!video) {
    console.warn('[VIDEO] Stream video element not found');
    return;
  }
  
  console.log('[VIDEO] Video element found:', video);
  
  // Video source - direct path
  const videoPath = '/assets/streams/stream-video.mp4'; // Change this to your video path
  const videoSrc = videoPath;
  
  console.log('[VIDEO] Video source:', videoSrc);
  
  // Show video element
  video.style.display = 'block';
  video.classList.add('loading');
  
  // Set video source - try both source element and direct src
  const source = video.querySelector('source');
  if (source) {
    console.log('[VIDEO] Setting source element src:', videoSrc);
    source.src = videoSrc;
    // Also set video src as fallback
    video.src = videoSrc;
  } else {
    console.log('[VIDEO] No source element, setting video src directly:', videoSrc);
    video.src = videoSrc;
  }
  
  // Force video to start loading
  console.log('[VIDEO] Calling video.load()...');
  try {
    video.load();
    console.log('[VIDEO] video.load() called successfully');
  } catch (error) {
    console.error('[VIDEO] Error calling video.load():', error);
  }
  
  // Show video when metadata is loaded
  video.addEventListener('loadstart', () => {
    console.log('[VIDEO] Load started - request sent to server');
  }, { once: true });
  
  video.addEventListener('loadedmetadata', () => {
    console.log('[VIDEO] Metadata loaded');
    video.classList.remove('loading');
    video.classList.add('loaded');
    // Hide background image when video is ready
    const videoBg = document.querySelector('.video-bg');
    if (videoBg) {
      videoBg.style.opacity = '0';
      videoBg.style.transition = 'opacity 0.5s ease-out';
    }
  }, { once: true });
  
  // Show video when data is loaded
  video.addEventListener('loadeddata', () => {
    console.log('[VIDEO] Data loaded');
    video.classList.remove('loading');
    video.classList.add('loaded');
    const videoBg = document.querySelector('.video-bg');
    if (videoBg) {
      videoBg.style.opacity = '0';
      videoBg.style.transition = 'opacity 0.5s ease-out';
    }
  }, { once: true });
  
  // Handle loading errors - fallback to background image
  video.addEventListener('error', (e) => {
    console.error('[VIDEO] Video failed to load:', e);
    console.error('[VIDEO] Video error code:', video.error ? video.error.code : 'unknown');
    console.error('[VIDEO] Video error message:', video.error ? video.error.message : 'unknown');
    console.error('[VIDEO] Video source was:', videoSrc);
    console.error('[VIDEO] Current video src:', video.src);
    console.error('[VIDEO] Current source src:', source ? source.src : 'no source element');
    video.style.display = 'none';
    video.classList.remove('loading');
    // Keep background image visible
    const videoBg = document.querySelector('.video-bg');
    if (videoBg) {
      videoBg.style.opacity = '1';
    }
  }, { once: true });
  
  // Also listen for abort event
  video.addEventListener('abort', () => {
    console.warn('[VIDEO] Video loading aborted');
  }, { once: true });
  
  // Listen for stalled event
  video.addEventListener('stalled', () => {
    console.warn('[VIDEO] Video loading stalled');
  }, { once: true });
  
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
