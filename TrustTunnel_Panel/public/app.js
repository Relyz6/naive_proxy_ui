// ==========================================
// TrustTunnel Frontend Controller
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  // --- UI Elements ---
  const usersGrid = document.getElementById('users-grid');
  const loadingState = document.getElementById('users-loading');
  const emptyState = document.getElementById('users-empty');
  const searchInput = document.getElementById('search-input');
  
  // Modals
  const modalCreate = document.getElementById('modal-create');
  const modalDetails = document.getElementById('modal-details');
  const modalSettings = document.getElementById('modal-settings');
  
  // Forms
  const formCreateUser = document.getElementById('form-create-user');
  const formSettings = document.getElementById('form-settings');
  
  // Interactive Buttons
  const btnCreateUser = document.getElementById('btn-create-user');
  const btnSettings = document.getElementById('btn-settings');
  const btnGeneratePass = document.getElementById('btn-generate-pass');
  const btnTestRestart = document.getElementById('btn-test-restart');
  
  // Stats Counters
  const statActiveCount = document.getElementById('stat-active-count');
  const statTotalCount = document.getElementById('stat-total-count');
  const statServerEndpoint = document.getElementById('stat-server-endpoint');
  const statServerPort = document.getElementById('stat-server-port');
  
  // System Diagnostics
  const systemStatus = document.getElementById('system-status');
  const systemStatusSub = document.getElementById('system-status-sub');
  const statusGlow = document.getElementById('status-glow');
  const consoleLogs = document.getElementById('console-logs');

  let activeUsersList = [];
  let currentFilter = 'all';
  let qrcodeInstance = null;

  // Initialize Lucide Icons
  lucide.createIcons();

  // Load Initial Data
  loadSettings();
  fetchUsers();
  pollSystemStatus();
  setInterval(pollSystemStatus, 15000); // Poll status every 15s

  // ==========================================
  // Toast Notification Helper
  // ==========================================
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';
    if (type === 'info') iconName = 'info';

    toast.innerHTML = `
      <i data-lucide="${iconName}" class="toast-icon"></i>
      <span class="toast-message">${message}</span>
      <button class="toast-close"><i data-lucide="x"></i></button>
    `;
    
    container.appendChild(toast);
    lucide.createIcons({ attrs: { class: 'toast-icon' } });

    // Handle manual close
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });

    // Auto-remove after 4.5s
    setTimeout(() => {
      toast.style.transition = 'all 0.35s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      setTimeout(() => toast.remove(), 350);
    }, 4500);
  }

  // ==========================================
  // REST API: Load Users
  // ==========================================
  function fetchUsers() {
    loadingState.classList.remove('hidden');
    usersGrid.classList.add('hidden');
    emptyState.classList.add('hidden');

    fetch('/api/users')
      .then(res => res.json())
      .then(users => {
        activeUsersList = users;
        renderUsers();
      })
      .catch(err => {
        console.error('Error fetching users:', err);
        showToast('Failed to load user tunnels from server.', 'error');
        loadingState.classList.add('hidden');
      });
  }

  // Fetch standard server-wide settings for stats
  function loadSettings() {
    fetch('/api/settings')
      .then(res => res.json())
      .then(settings => {
        statServerEndpoint.innerText = settings.serverHost || 'Config Required';
        statServerPort.innerText = `Port: ${settings.serverPort || 8443}`;
      });
  }

  // Poll system status
  function pollSystemStatus() {
    fetch('/api/system/status')
      .then(res => res.json())
      .then(data => {
        systemStatus.innerText = data.online ? 'Active' : 'Inactive';
        systemStatusSub.innerText = data.status === 'simulated-online' 
          ? 'Running in stand-alone panel mode.' 
          : `Active status: ${data.status}`;
          
        statusGlow.className = 'stat-icon-wrapper';
        if (data.online) {
          statusGlow.classList.add('status-online');
        } else {
          statusGlow.classList.add('status-offline');
        }
      })
      .catch(err => {
        systemStatus.innerText = 'Offline';
        systemStatusSub.innerText = 'Connection lost to panel server.';
        statusGlow.className = 'stat-icon-wrapper status-offline';
      });
  }

  // ==========================================
  // Render User Tunnels Card Grid
  // ==========================================
  function renderUsers() {
    usersGrid.innerHTML = '';
    loadingState.classList.add('hidden');

    const searchVal = searchInput.value.toLowerCase().trim();
    
    // Filter & Search List
    const filtered = activeUsersList.filter(user => {
      // 1. Status Filter
      if (currentFilter === 'active' && !user.enabled) return false;
      if (currentFilter === 'disabled' && user.enabled) return false;
      
      // 2. Search query filter
      if (searchVal !== '') {
        const matchesUsername = user.username.toLowerCase().includes(searchVal);
        const matchesNotes = user.notes.toLowerCase().includes(searchVal);
        return matchesUsername || matchesNotes;
      }
      return true;
    });

    // Update Stats counters
    const totalCount = activeUsersList.length;
    const activeCount = activeUsersList.filter(u => u.enabled).length;
    statActiveCount.innerText = activeCount;
    statTotalCount.innerText = `${totalCount} total configured`;

    if (filtered.length === 0) {
      emptyState.classList.remove('hidden');
      usersGrid.classList.add('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    usersGrid.classList.remove('hidden');

    filtered.forEach(user => {
      const card = document.createElement('div');
      card.className = `user-card glass-element ${user.enabled ? '' : 'disabled-user'}`;
      
      const badgeClass = user.enabled ? 'badge-active' : 'badge-disabled';
      const badgeText = user.enabled ? 'active' : 'disabled';
      const toggleChecked = user.enabled ? 'checked' : '';

      card.innerHTML = `
        <div class="user-card-header">
          <div class="user-main-info">
            <h2>${escapeHtml(user.username)}</h2>
            <span class="user-notes">
              <i data-lucide="info"></i>
              <span>${escapeHtml(user.notes || 'No device details added')}</span>
            </span>
          </div>
          <span class="badge-status ${badgeClass}">
            ${badgeText}
          </span>
        </div>

        <div class="user-card-creds">
          <div class="cred-summary-row">
            <span class="cred-summary-label">Username</span>
            <span class="cred-summary-val">${escapeHtml(user.username)}</span>
          </div>
          <div class="cred-summary-row">
            <span class="cred-summary-label">Created At</span>
            <span class="cred-summary-val" style="font-family: inherit; font-size: 0.72rem;">
              ${new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div class="user-card-actions">
          <div class="actions-left">
            <button class="btn-card-action btn-card-action-details" title="Connection Details">
              <i data-lucide="key-round"></i>
            </button>
            <a href="/api/users/${user.username}/toml" class="btn-card-action" title="Download Config TOML" download>
              <i data-lucide="download"></i>
            </a>
            <button class="btn-card-action btn-card-action-delete" title="Delete User">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
          <div class="actions-right">
            <label class="switch-container">
              <input type="checkbox" class="switch-input toggle-status-switch" ${toggleChecked}>
              <div class="switch-track">
                <div class="switch-thumb"></div>
              </div>
            </label>
          </div>
        </div>
      `;

      // Bind Details Modal Event
      card.querySelector('.btn-card-action-details').addEventListener('click', () => {
        openDetailsModal(user.username);
      });

      // Bind Toggle State Switch
      card.querySelector('.toggle-status-switch').addEventListener('change', () => {
        toggleUserStatus(user.username);
      });

      // Bind Delete Button
      card.querySelector('.btn-card-action-delete').addEventListener('click', () => {
        deleteUser(user.username);
      });

      usersGrid.appendChild(card);
    });

    lucide.createIcons();
  }

  // ==========================================
  // REST API Actions
  // ==========================================
  
  // 1. Create User
  formCreateUser.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('create-username').value;
    const password = document.getElementById('create-password').value;
    const notes = document.getElementById('create-notes').value;

    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, notes })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          closeModal(modalCreate);
          formCreateUser.reset();
          fetchUsers();
          
          if (data.restartStatus === 'success') {
            showToast(`Tunnel '${data.user.username}' created. TrustTunnel reloaded successfully!`);
          } else {
            showToast(`Tunnel created, but TrustTunnel restart failed: ${data.restartMessage}`, 'error');
          }
        } else {
          showToast(data.error || 'Failed to create user.', 'error');
        }
      })
      .catch(err => {
        console.error('Error creating user:', err);
        showToast('Error sending create request.', 'error');
      });
  });

  // 2. Toggle Status Switch
  function toggleUserStatus(username) {
    fetch(`/api/users/${username}/toggle`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          fetchUsers();
          const stateStr = data.user.enabled ? 'Enabled' : 'Disabled';
          
          if (data.restartStatus === 'success') {
            showToast(`Tunnel '${username}' ${stateStr.toLowerCase()}. Service reloaded!`);
          } else {
            showToast(`Tunnel state saved, but service restart failed: ${data.restartMessage}`, 'error');
          }
        } else {
          showToast(data.error || 'Failed to toggle status.', 'error');
          fetchUsers(); // Re-sync view
        }
      })
      .catch(err => {
        console.error('Error toggling status:', err);
        showToast('Error toggling status on server.', 'error');
        fetchUsers(); // Re-sync view
      });
  }

  // 3. Delete User
  function deleteUser(username) {
    if (!confirm(`Are you absolutely sure you want to delete tunnel credentials for '${username}'? This action cannot be undone.`)) {
      return;
    }

    fetch(`/api/users/${username}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          fetchUsers();
          
          if (data.restartStatus === 'success') {
            showToast(`Tunnel for '${username}' has been deleted. Service reloaded!`);
          } else {
            showToast(`Tunnel deleted, but service restart failed: ${data.restartMessage}`, 'error');
          }
        } else {
          showToast(data.error || 'Failed to delete tunnel.', 'error');
        }
      })
      .catch(err => {
        console.error('Error deleting user:', err);
        showToast('Error sending delete request.', 'error');
      });
  }

  // 4. Open User Details modal (Generates QR & fetches data)
  function openDetailsModal(username) {
    fetch(`/api/users/${username}/config`)
      .then(res => res.json())
      .then(data => {
        document.getElementById('details-username-title').innerText = data.username;
        document.getElementById('cred-host').innerText = data.serverHost;
        document.getElementById('cred-port').innerText = data.serverPort;
        document.getElementById('cred-username').innerText = data.username;
        
        const pwdElem = document.getElementById('cred-password');
        pwdElem.innerText = data.password;
        
        document.getElementById('cred-deeplink').value = data.deepLink;
        document.getElementById('btn-download-toml').href = `/api/users/${username}/toml`;

        // Render QR Code client-side
        const qrDiv = document.getElementById('details-qrcode');
        qrDiv.innerHTML = '';
        
        qrcodeInstance = new QRCode(qrDiv, {
          text: data.deepLink,
          width: 160,
          height: 160,
          colorDark: "#0c0f1d",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });

        openModal(modalDetails);
      })
      .catch(err => {
        console.error('Error fetching details:', err);
        showToast('Failed to fetch connection details.', 'error');
      });
  }

  // 5. Open & Populate Settings Form
  function openSettingsModal() {
    fetch('/api/settings')
      .then(res => res.json())
      .then(settings => {
        document.getElementById('settings-host').value = settings.serverHost || '';
        document.getElementById('settings-port').value = settings.serverPort || '';
        document.getElementById('settings-sni').value = settings.customSni || '';
        document.getElementById('settings-creds-path').value = settings.credentialsTomlPath || '';
        document.getElementById('settings-restart-cmd').value = settings.restartCommand || '';
        document.getElementById('settings-dns').value = (settings.dnsUpstreams || []).join(', ');
        document.getElementById('settings-skip-verify').checked = !!settings.skipVerification;
        
        openModal(modalSettings);
      })
      .catch(err => {
        console.error('Error loading settings:', err);
        showToast('Failed to load settings from server.', 'error');
      });
  }

  // 6. Save Settings Form
  formSettings.addEventListener('submit', (e) => {
    e.preventDefault();
    const serverHost = document.getElementById('settings-host').value.trim();
    const serverPort = parseInt(document.getElementById('settings-port').value);
    const customSni = document.getElementById('settings-sni').value.trim();
    const credentialsTomlPath = document.getElementById('settings-creds-path').value.trim();
    const restartCommand = document.getElementById('settings-restart-cmd').value.trim();
    const dnsStr = document.getElementById('settings-dns').value;
    const skipVerification = document.getElementById('settings-skip-verify').checked;

    const dnsUpstreams = dnsStr.split(',').map(s => s.trim()).filter(s => s !== '');

    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serverHost,
        serverPort,
        customSni,
        credentialsTomlPath,
        restartCommand,
        dnsUpstreams,
        skipVerification
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          closeModal(modalSettings);
          showToast('Server configurations saved successfully!');
          loadSettings();
          fetchUsers(); // Refresh links with new host/port
        } else {
          showToast(data.error || 'Failed to save settings.', 'error');
        }
      })
      .catch(err => {
        console.error('Error saving settings:', err);
        showToast('Error sending settings request.', 'error');
      });
  });

  // 7. Test Service Restart in Settings Modal Console
  btnTestRestart.addEventListener('click', () => {
    consoleLogs.innerText = "Executing restart trigger... Please wait.\n";
    btnTestRestart.disabled = true;
    
    fetch('/api/system/restart', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        btnTestRestart.disabled = false;
        if (data.success) {
          consoleLogs.innerText = `[SUCCESS - ${new Date().toLocaleTimeString()}]\nConsole Output:\n${data.log}`;
          showToast("Test restart succeeded!");
        } else {
          consoleLogs.innerText = `[FAILED - ${new Date().toLocaleTimeString()}]\nError:\n${data.error}\n\nLog Details:\n${data.log}`;
          showToast("Test restart failed. Check logs.", "error");
        }
        pollSystemStatus(); // Refresh status
      })
      .catch(err => {
        btnTestRestart.disabled = false;
        consoleLogs.innerText = `[ERROR - ${new Date().toLocaleTimeString()}]\nFailed to contact backend API: ${err.message}`;
        showToast("Backend API communications failure.", "error");
      });
  });

  // ==========================================
  // Client Interactions & Filters
  // ==========================================

  // Live search input handler
  searchInput.addEventListener('input', () => {
    renderUsers();
  });

  // Filter Tabs Event listeners
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.getAttribute('data-filter');
      renderUsers();
    });
  });

  // Safe Random password generator button
  btnGeneratePass.addEventListener('click', () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    const len = 14;
    let pwd = '';
    const array = new Uint8Array(len);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < len; i++) {
      pwd += chars[array[i] % chars.length];
    }
    document.getElementById('create-password').value = pwd;
    showToast('Secure random password generated!', 'info');
  });

  // Copy Clipboard handler
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-copy');
    if (btn) {
      const targetId = btn.getAttribute('data-copy-target');
      const elem = document.getElementById(targetId);
      
      let copyText = '';
      if (elem.tagName === 'INPUT') {
        copyText = elem.value;
      } else {
        copyText = elem.innerText;
      }

      navigator.clipboard.writeText(copyText)
        .then(() => {
          showToast('Copied to clipboard!', 'info');
          // Brief button flash success animation
          const originalHTML = btn.innerHTML;
          btn.innerHTML = '<i data-lucide="check" style="color:var(--color-online)"></i>';
          lucide.createIcons();
          setTimeout(() => {
            btn.innerHTML = originalHTML;
            lucide.createIcons();
          }, 1500);
        })
        .catch(err => {
          showToast('Failed to copy to clipboard.', 'error');
        });
    }
  });

  // ==========================================
  // Modal Display Logic
  // ==========================================
  function openModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  btnCreateUser.addEventListener('click', () => openModal(modalCreate));
  btnSettings.addEventListener('click', () => openSettingsModal());

  // Close Modals on close buttons and backdrop click
  document.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-overlay');
      closeModal(modal);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay);
      }
    });
  });

  // Helper function to escape HTML entities (XSS prevention)
  function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  // Custom response span checker to avoid standard promise warnings
  Promise.prototype.span = function (fn) {
    return this.then(fn);
  };
});
