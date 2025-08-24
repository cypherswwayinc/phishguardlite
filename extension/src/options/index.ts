// Robust Options logic for PhishGuard Lite
import { getApiBaseUrl } from '../../config';

const DEFAULT_API_BASE = getApiBaseUrl();

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

// Load settings from storage with fallback
async function loadSettings() {
  console.log('Loading PhishGuard settings...');
  
  try {
    // Try sync storage first (enterprise profiles)
    let result = await chrome.storage.sync.get(["enabled", "minScore", "apiBase", "tenantKey", "enableReporting"]);
    
    // If sync storage fails or is empty, try local storage as fallback
    if (chrome.runtime.lastError || Object.keys(result).length === 0) {
      console.log('Sync storage failed, trying local storage fallback...');
      result = await chrome.storage.local.get(["enabled", "minScore", "apiBase", "tenantKey", "enableReporting"]);
    }
    
    console.log('Settings loaded:', result);
    
    // Apply settings to UI with proper defaults
    // Check if we have any meaningful settings, if not, use defaults
    const hasExistingSettings = result.enabled !== undefined && 
                               result.minScore !== undefined && 
                               result.apiBase !== undefined && 
                               result.enableReporting !== undefined;
    
    if (enabledToggle) {
      // If no existing settings, default to true. Otherwise use stored value
      enabledToggle.checked = hasExistingSettings ? (result.enabled ?? true) : true;
    }
    
    if (minScoreInput) {
      // If no existing settings, default to 20. Otherwise use stored value
      minScoreInput.value = hasExistingSettings ? (result.minScore ?? 20).toString() : '20';
    }
    
    if (apiBaseInput) {
      // If no existing settings, default to custom domain. Otherwise use stored value
      apiBaseInput.value = hasExistingSettings ? (result.apiBase || DEFAULT_API_BASE) : DEFAULT_API_BASE;
    }
    
    if (tenantKeyInput) {
      // Tenant key can be empty, so just use stored value or empty string
      tenantKeyInput.value = result.tenantKey || '';
    }
    
    if (reportingToggle) {
      // If no existing settings, default to false. Otherwise use stored value
      reportingToggle.checked = hasExistingSettings ? (result.enableReporting ?? false) : false;
    }
    
    console.log('Settings applied to UI');
    
    // If this is the first time (no existing settings), save defaults to storage
    if (!hasExistingSettings) {
      console.log('First time setup - saving default settings to storage');
      const defaultSettings = {
        enabled: true,
        minScore: 20,
        apiBase: DEFAULT_API_BASE,
        tenantKey: '',
        enableReporting: false
      };
      
      // Try to save defaults to storage
      try {
        await chrome.storage.sync.set(defaultSettings);
        console.log('Default settings saved to sync storage');
      } catch (error) {
        try {
          await chrome.storage.local.set(defaultSettings);
          console.log('Default settings saved to local storage');
        } catch (localError) {
          console.error('Failed to save default settings:', localError);
        }
      }
    }
    
  } catch (error) {
    console.error('Error loading settings:', error);
    setStatus('Error loading settings', false);
  }
}

// Reset settings to defaults
function resetToDefaults() {
  if (enabledToggle) enabledToggle.checked = true;
  if (minScoreInput) minScoreInput.value = '20';
  if (apiBaseInput) apiBaseInput.value = DEFAULT_API_BASE;
  if (tenantKeyInput) tenantKeyInput.value = '';
  if (reportingToggle) reportingToggle.checked = false;
  
  setStatus('Settings reset to defaults', true);
}

// Save settings to storage
function saveSettings() {
  if (!saveBtn) return;
  
  try {
    // Disable save button during operation
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    const settings = {
      enabled: enabledToggle?.checked ?? true, // Default: ON
      minScore: parseInt(minScoreInput?.value ?? '20'), // Default: 20
      apiBase: apiBaseInput?.value?.trim() || DEFAULT_API_BASE, // Default: Custom domain
      tenantKey: tenantKeyInput?.value?.trim() || '',
      enableReporting: reportingToggle?.checked ?? false
    };
    
    console.log('Saving settings:', settings);
    
    // Try to save to sync storage first, fallback to local if it fails
    const saveToStorage = async () => {
      try {
        // Try sync storage first
        await chrome.storage.sync.set(settings);
        console.log('Settings saved to sync storage successfully');
        setStatus('Settings saved successfully! ✓', true);
        
        // Show restrictions warning if reporting is enabled
        if (settings.enableReporting) {
          setTimeout(() => {
            setStatus('Note: Reporting may not work on Gmail, LinkedIn, and other corporate sites due to security restrictions. Test on regular websites.', false);
          }, 2000);
        }
        
      } catch (error) {
        console.log('Sync storage failed, trying local storage fallback...');
        
        try {
          // Fallback to local storage
          await chrome.storage.local.set(settings);
          console.log('Settings saved to local storage successfully');
          setStatus('Settings saved to local storage ✓', true);
          
        } catch (localError) {
          console.error('Both storage methods failed:', localError);
          setStatus('Error saving settings: ' + localError, false);
        }
      }
      
      // Re-enable save button
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    };
    
    saveToStorage();
    
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
    
    // Add reset button event listener
    const resetBtn = document.getElementById('reset') as HTMLButtonElement | null;
    if (resetBtn) {
      resetBtn.addEventListener('click', resetToDefaults);
    }
    
    // Add info about restrictions and defaults
    const infoDiv = document.createElement('div');
    infoDiv.innerHTML = `
      <div style="margin-top: 20px; padding: 15px; background-color: #e7f3ff; border: 1px solid #b3d9ff; border-radius: 5px;">
        <h4>Important Notes:</h4>
        <ul style="margin: 5px 0; padding-left: 20px;">
          <li><strong>Default Settings:</strong> Extension is enabled by default with minimum score 20</li>
          <li><strong>API URL:</strong> Automatically set to your custom domain (phishguard.cyphersway.com)</li>
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
