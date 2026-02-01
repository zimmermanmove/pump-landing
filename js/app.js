// JavaScript for the landing page

// Connect wallet function
async function connectWallet() {
  try {
    // Check if Phantom wallet is installed
    if (window.solana && window.solana.isPhantom) {
      // Connect to Phantom wallet
      const response = await window.solana.connect();
      
      // You can add additional logic here after successful connection
      // For example, update UI, fetch balance, etc.
    } else {
      // If Phantom is not installed, redirect to install page
      window.open('https://phantom.app/', '_blank');
    }
  } catch (err) {
  }
}

// Modal - cannot be closed
function initModal() {
  const modal = document.getElementById('howItWorksModal');
  if (modal) {
    // Always show modal, never hide it
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Prevent closing by clicking backdrop
    const backdrop = modal.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        e.stopPropagation();
        // Do nothing - modal cannot be closed
      });
    }
    
    // Prevent closing with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        // Do nothing - modal cannot be closed
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
      
      // Add active to clicked tab
      this.classList.add('active');
      
      // Update execute button text
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

// Stream tabs
function initStreamTabs() {
  const tabs = document.querySelectorAll('.streams-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
    });
  });
}

// Trade preset buttons
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
        // Extract SOL amount
        const solAmount = value.replace(' SOL', '');
        if (tradeInput) {
          tradeInput.value = solAmount;
        }
      }
    });
  });
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
  // Initialize modal (always visible, cannot be closed)
  initModal();
  
  // Connect wallet button
  const connectWalletBtn = document.getElementById('connectWalletBtn');
  if (connectWalletBtn) {
    connectWalletBtn.addEventListener('click', connectWallet);
  }
  
  // Initialize token loader (load token data from pump.fun)
  // Wait a bit to ensure TokenLoader is loaded
  setTimeout(() => {
    if (window.TokenLoader && window.TokenLoader.init) {
      window.TokenLoader.init();
    } else {
      // Try direct call as fallback
      if (typeof initTokenLoader === 'function') {
        initTokenLoader();
      }
    }
  }, 100);
  
  // Initialize trade tabs
  initTradeTabs();
  
  // Initialize stream tabs
  initStreamTabs();
  
  // Initialize trade presets
  initTradePresets();
  
  // Close sidebar when clicking outside on mobile
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
  
  // Mobile nav active state
  const mobileNavButtons = document.querySelectorAll('.mobile-nav button');
  mobileNavButtons.forEach((btn, index) => {
    btn.addEventListener('click', function() {
      mobileNavButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  });
  
  // Set first button as active by default
  if (mobileNavButtons.length > 0) {
    mobileNavButtons[0].classList.add('active');
  }
  
  // Initialize live chat animations
  initLiveChat();
});

// Live chat animations and message generation
function initLiveChat() {
  const chatMessagesList = document.querySelector('.chat-messages-list');
  if (!chatMessagesList) return;
  
  // Animate existing messages on load
  const existingMessages = chatMessagesList.querySelectorAll('.chat-message');
  existingMessages.forEach((msg, index) => {
    msg.style.animationDelay = `${index * 0.1}s`;
  });
  
  // Auto-scroll to bottom
  const chatScroll = document.querySelector('.chat-scroll');
  if (chatScroll) {
    setTimeout(() => {
      chatScroll.scrollTop = chatScroll.scrollHeight;
    }, 500);
  }
  
  // Sample data for generating messages
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
  
  // Function to create a new message
  function createNewMessage() {
    const username = usernames[Math.floor(Math.random() * usernames.length)];
    const message = messages[Math.floor(Math.random() * messages.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const avatar = avatars[Math.floor(Math.random() * avatars.length)];
    
    // Get current date
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();
    const dateStr = `${day} ${month} ${year}`;
    
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    
    // Create message element
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
    
    // Check if we need a date divider
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
    
    // Add date divider if needed
    if (needsDateDivider) {
      const dateDivider = document.createElement('div');
      dateDivider.className = 'chat-date-divider';
      dateDivider.textContent = dateStr;
      chatMessagesList.insertBefore(dateDivider, chatMessagesList.firstChild);
    }
    
    // Insert message at the top (since we're using flex-direction: column-reverse)
    chatMessagesList.insertBefore(messageDiv, chatMessagesList.firstChild);
    
    // Trigger animation
    setTimeout(() => {
      messageDiv.style.opacity = '1';
    }, 10);
    
    // Auto-scroll to bottom
    if (chatScroll) {
      setTimeout(() => {
        chatScroll.scrollTop = chatScroll.scrollHeight;
      }, 100);
    }
    
    // Limit messages to last 50 to prevent memory issues
    const allMessages = chatMessagesList.querySelectorAll('.chat-message');
    if (allMessages.length > 50) {
      for (let i = 50; i < allMessages.length; i++) {
        allMessages[i].remove();
      }
    }
  }
  
  // Generate new messages periodically (every 0.5-2 seconds for faster chat)
  function scheduleNextMessage() {
    const delay = 500 + Math.random() * 1500; // 0.5-2 seconds
    setTimeout(() => {
      createNewMessage();
      scheduleNextMessage();
    }, delay);
  }
  
  // Start generating messages after initial delay
  setTimeout(() => {
    scheduleNextMessage();
  }, 1000);
}
