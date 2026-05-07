// Utilities and shared state

const API_BASE = 'https://recipeshare-api-egaxgqdsexhya6b3.polandcentral-01.azurewebsites.net/api';

const Storage = {
  get(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(key);
  }
};

function getCurrentUser() {
  return Storage.get('recipeshare_current_user');
}

function getToken() {
  return Storage.get('recipeshare_token');
}

function requireAuth() {
  const user = getCurrentUser();
  const token = getToken();
  if (!user || !token) {
    window.location.href = 'login.html';
  }
  return user;
}

function logout() {
  Storage.remove('recipeshare_current_user');
  Storage.remove('recipeshare_token');
  window.location.href = 'login.html';
}

async function apiFetch(endpoint, options = {}) {
  const headers = {
    ...options.headers
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Set Content-Type to JSON if body is stringified JSON and not a FormData
  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) {
      logout(); // Token expired or invalid
    }
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  return data;
}

// Remove seedRecipes as we now rely on DB

function renderSidebar(activePage) {
  const sidebarContainer = document.getElementById('sidebar');
  if (!sidebarContainer) return;

  sidebarContainer.innerHTML = `
    <div class="sidebar-header">
      <div class="navbar__logo" style="color: white; margin-bottom: 2rem;">
        <span>🍳</span>
        <span>Recipe<span style="color: var(--color-primary);">Share</span></span>
      </div>
    </div>
    <nav class="sidebar-nav">
      <a href="dashboard.html" class="nav-link ${activePage === 'dashboard' ? 'active' : ''}">
        <span>📊 Dashboard</span>
      </a>
      <a href="notifications.html" class="nav-link ${activePage === 'notifications' ? 'active' : ''}" style="display: flex; justify-content: space-between; align-items: center;">
        <span>🔔 Notifications</span>
        <span class="notification-badge-sidebar" id="notif-badge-sidebar" style="display: none;">0</span>
      </a>
      <a href="feed.html" class="nav-link ${activePage === 'feed' ? 'active' : ''}">
        <span>🌍 Global Feed</span>
      </a>
      <a href="my-recipes.html" class="nav-link ${activePage === 'my-recipes' ? 'active' : ''}">
        <span>👨‍🍳 My Recipes</span>
      </a>
      <div class="nav-divider"></div>
      <a href="#" id="logout-btn" class="nav-link nav-link-danger">
        <svg style="width: 1.25rem; height: 1.25rem; margin-right: 0.5rem; vertical-align: middle;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
        Logout
      </a>
    </nav>
  `;

  // Logout
  document.getElementById('logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });

  const mobileBtn = document.getElementById('mobile-menu-btn');
  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
      sidebarContainer.classList.toggle('open');
    });
  }

  // Start notification polling if logged in
  if (getCurrentUser()) {
    initNotifications();
  }
}

async function initNotifications() {
  const fetchAndRefreshBadge = async () => {
    try {
      const notifications = await apiFetch('/notifications');
      const unreadCount = notifications.filter(n => !n.isRead).length;
      
      const badge = document.getElementById('notif-badge-sidebar');
      if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
      }
      
      // If we are on the notifications page, also update the list if a function exists
      if (typeof renderNotificationsPage === 'function') {
        renderNotificationsPage(notifications);
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    }
  };

  fetchAndRefreshBadge();
  setInterval(fetchAndRefreshBadge, 30000); 
}

async function markAsRead(id) {
  console.log(`[Notifications] Marking ${id} as read...`);
  
  // 1. Update UI Instantly (Optimistic Update)
  const card = document.getElementById(`notif-${id}`);
  if (card) {
    card.classList.remove('unread');
    const actions = card.querySelector('.notification-card__actions');
    if (actions) actions.remove();
  }

  const badge = document.getElementById('notif-badge-sidebar');
  if (badge) {
    const current = Math.max(0, parseInt(badge.textContent || "0") - 1);
    badge.textContent = current;
    if (current <= 0) badge.style.display = 'none';
  }

  // 2. Send to Backend in background
  try {
    await apiFetch(`/notifications/${id}`, { method: 'PUT' });
    console.log(`[Notifications] ${id} successfully marked as read in DB.`);
  } catch (e) {
    console.error(`[Notifications] Failed to update DB for ${id}:`, e);
    // If it fails, we could potentially revert the UI here if needed
  }
}

const ICONS = {
  eye: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
};

function setupPasswordToggles() {
  const toggles = document.querySelectorAll('.password-toggle');
  toggles.forEach(toggle => {
    if (!toggle.innerHTML) {
      toggle.innerHTML = ICONS.eye;
    }

    toggle.addEventListener('click', function() {
      const targetId = this.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input.type === 'password') {
        input.type = 'text';
        this.innerHTML = ICONS.eyeOff;
      } else {
        input.type = 'password';
        this.innerHTML = ICONS.eye;
      }
    });
  });
}

function getPlaceholderImage() {
  return "https://via.placeholder.com/800x400?text=No+Media+Uploaded";
}
