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
  
  // Initialize token loader immediately without delay
  if (window.TokenLoader && window.TokenLoader.init) {
    window.TokenLoader.init();
  } else {
    if (typeof initTokenLoader === 'function') {
      initTokenLoader();
    }
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
  

  const usernames = [
    'crypto_trader', 'solana_moon', 'pump_king', 'degen_life', 'moon_boy',
    'whale_alert', 'diamond_hands', 'hodl_master', 'bull_run', 'lambo_soon',
    'ape_strong', 'wen_moon', 'to_the_moon', 'crypto_guru', 'sol_fan',
    'pump_it_up', 'moon_gang', 'diamond_ape', 'hodl_gang', 'bullish_af'
  ];
  
  const avatars = [
    '/assets/avatars/lucythecat.jpg',
    '/assets/avatars/dr.devv.jpg',
    '/assets/avatars/user.jpg',
    '/assets/avatars/creator.jpg'
  ];
  
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
    const username = usernames[Math.floor(Math.random() * usernames.length)];
    const message = messages[Math.floor(Math.random() * messages.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const avatar = avatars[Math.floor(Math.random() * avatars.length)];
    

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
  

}
