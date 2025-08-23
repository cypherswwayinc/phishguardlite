// Robust Options logic for PhishGuard Lite
const DEFAULT_API_BASE = "https://szyld5pw2d.execute-api.us-east-1.amazonaws.com/Prod";

// Get DOM elements
const enabledToggle = document.getElementById('enabled') as HTMLInputElement | null;
const minScoreInput = document.getElementById('minScore') as HTMLInputElement | null;
const apiBaseInput = document.getElementById('apiBase') as HTMLInputElement | null;
const tenantKeyInput = document.getElementById('tenantKey') as HTMLInputElement | null;
const reportingToggle = document.getElementById('enableReporting') as HTMLInputElement | null;
const saveBtn = document.getElementById('save') as HTMLButtonElement | null;
const statusDiv = document.getElementById('status') as HTMLDivElement | null;

// Helper function to safely get elements
function el<T extends HTMLElement>(x: T | null, name: string): T {
  if (!x) throw new Error(`Element '${name}' not found`);
  return x;
}

// Set status message
function setStatus(msg: string, ok = true) {
  if (!statusDiv) return;
  
  statusDiv.textContent = msg;
  statusDiv.className = `status ${ok ? 'success' : 'error'}`;
  statusDiv.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (statusDiv) {
      statusDiv.style.display = 'none';
    }
  }, 5000);
}

// Load settings from storage
function loadSettings() {
  console.log('Loading PhishGuard settings...');
  
  chrome.storage.sync.get(["enabled", "minScore", "apiBase", "tenantKey", "enableReporting"], (result) => {
    console.log('Settings loaded:', result);
    
    try {
      if (enabledToggle) enabledToggle.checked = result.enabled ?? true;
      if (minScoreInput) minScoreInput.value = (result.minScore ?? 20).toString();
      if (apiBaseInput) apiBaseInput.value = result.apiBase ?? DEFAULT_API_BASE;
      if (tenantKeyInput) tenantKeyInput.value = result.tenantKey ?? '';
      if (reportingToggle) reportingToggle.checked = result.enableReporting ?? false;
      
      console.log('Settings applied to UI');
    } catch (error) {
      console.error('Error applying settings to UI:', error);
      setStatus('Error loading settings', false);
    }
  });
}

// Save settings to storage
function saveSettings() {
  if (!saveBtn) return;
  
  try {
    // Disable save button during operation
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    const settings = {
      enabled: enabledToggle?.checked ?? true,
      minScore: parseInt(minScoreInput?.value ?? '20'),
      apiBase: apiBaseInput?.value?.trim() || DEFAULT_API_BASE,
      tenantKey: tenantKeyInput?.value?.trim() || '',
      enableReporting: reportingToggle?.checked ?? false
    };
    
    console.log('Saving settings:', settings);
    
    chrome.storage.sync.set(settings, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving settings:', chrome.runtime.lastError);
        setStatus('Error saving settings: ' + chrome.runtime.lastError.message, false);
      } else {
        console.log('Settings saved successfully');
        setStatus('Settings saved successfully!', true);
        
        // Show restrictions warning if reporting is enabled
        if (settings.enableReporting) {
          setTimeout(() => {
            setStatus('Note: Reporting may not work on Gmail, LinkedIn, and other corporate sites due to security restrictions. Test on regular websites.', false);
          }, 2000);
        }
      }
      
      // Re-enable save button
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    });
    
  } catch (error) {
    console.error('Error in saveSettings:', error);
    setStatus('Error saving settings: ' + error, false);
    
    // Re-enable save button
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

// Initialize the options page
document.addEventListener('DOMContentLoaded', () => {
  console.log('PhishGuard options page loaded');
  
  try {
    // Load current settings
    loadSettings();
    
    // Add event listeners
    if (saveBtn) {
      saveBtn.addEventListener('click', saveSettings);
    }
    
    // Add info about restrictions
    const infoDiv = document.createElement('div');
    infoDiv.innerHTML = `
      <div style="margin-top: 20px; padding: 15px; background-color: #e7f3ff; border: 1px solid #b3d9ff; border-radius: 5px;">
        <h4>ℹ️ Important Notes:</h4>
        <ul style="margin: 5px 0; padding-left: 20px;">
          <li><strong>Corporate Sites:</strong> Gmail, LinkedIn, Outlook have security restrictions</li>
          <li><strong>Local Detection:</strong> Basic phishing detection works everywhere</li>
          <li><strong>Cloud Scoring:</strong> Enhanced detection when reporting is enabled</li>
          <li><strong>Best Testing:</strong> Use regular websites or our test pages</li>
        </ul>
      </div>
    `;
    
    if (statusDiv && statusDiv.parentNode) {
      statusDiv.parentNode.insertBefore(infoDiv, statusDiv.nextSibling);
    }
    
    console.log('Options page initialized successfully');
    
  } catch (error) {
    console.error('Error initializing options page:', error);
    setStatus('Error initializing options page', false);
  }
});
