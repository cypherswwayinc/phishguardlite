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
  console.log('setStatus called with:', msg, 'ok:', ok);
  console.log('statusDiv element:', statusDiv);
  
  if (!statusDiv) {
    console.error('statusDiv is null - cannot display status message');
    return;
  }
  
  console.log('Setting status div content and styles');
  statusDiv.textContent = msg;
  statusDiv.className = `status ${ok ? 'success' : 'error'}`;
  statusDiv.style.display = 'block';
  
  console.log('Status div updated:', {
    textContent: statusDiv.textContent,
    className: statusDiv.className,
    display: statusDiv.style.display
  });
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (statusDiv) {
      statusDiv.style.display = 'none';
      console.log('Status message auto-hidden');
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
    // Apply defaults for each setting individually
    if (enabledToggle) {
      // Default to true (enabled) if no stored value
      enabledToggle.checked = result.enabled !== undefined ? result.enabled : true;
    }
    
    if (minScoreInput) {
      // Default to 20 if no stored value
      minScoreInput.value = result.minScore !== undefined ? result.minScore.toString() : '20';
    }
    
    if (apiBaseInput) {
      // Default to custom domain if no stored value
      apiBaseInput.value = result.apiBase || DEFAULT_API_BASE;
    }
    
    if (tenantKeyInput) {
      // Tenant key can be empty, so just use stored value or empty string
      tenantKeyInput.value = result.tenantKey || '';
    }
    
    if (reportingToggle) {
      // Default to true (enabled) if no stored value
      reportingToggle.checked = result.enableReporting !== undefined ? result.enableReporting : true;
    }
    
    console.log('Settings applied to UI');
    
    // Always save the current settings (including defaults) to ensure they persist
    const currentSettings = {
      enabled: enabledToggle?.checked ?? true,
      minScore: parseInt(minScoreInput?.value ?? '20'),
      apiBase: apiBaseInput?.value || DEFAULT_API_BASE,
      tenantKey: tenantKeyInput?.value || '',
      enableReporting: reportingToggle?.checked ?? true
    };
    
    console.log('Saving current settings to storage:', currentSettings);
    
    // Try to save to sync storage first, fallback to local
    try {
      await chrome.storage.sync.set(currentSettings);
      console.log('Settings saved to sync storage successfully');
    } catch (error) {
      try {
        await chrome.storage.local.set(currentSettings);
        console.log('Settings saved to local storage successfully');
      } catch (localError) {
        console.error('Failed to save settings:', localError);
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
  if (reportingToggle) reportingToggle.checked = true;
  
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
      enableReporting: reportingToggle?.checked ?? true // Default: ON
    };
    
    console.log('Saving settings:', settings);
    
    // Try to save to sync storage first, fallback to local if it fails
    const saveToStorage = async () => {
      try {
        // Try sync storage first
        await chrome.storage.sync.set(settings);
        console.log('Settings saved to sync storage successfully');
        console.log('About to call setStatus with success message');
        setStatus('Settings saved successfully! ✓', true);
        console.log('setStatus called for success');
        
        // Show restrictions warning if reporting is enabled
        if (settings.enableReporting) {
          setTimeout(() => {
            console.log('Showing restrictions warning');
            setStatus('Note: Reporting may not work on Gmail, LinkedIn, and other corporate sites due to security restrictions. Test on regular websites.', false);
          }, 2000);
        }
        
      } catch (error) {
        console.log('Sync storage failed, trying local storage fallback...');
        
        try {
          // Fallback to local storage
          await chrome.storage.local.set(settings);
          console.log('Settings saved to local storage successfully');
          console.log('About to call setStatus for local storage success');
          setStatus('Settings saved to local storage ✓', true);
          console.log('setStatus called for local storage success');
          
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
    
    // Add test status button event listener
    const testStatusBtn = document.getElementById('testStatus') as HTMLButtonElement | null;
    if (testStatusBtn) {
      testStatusBtn.addEventListener('click', () => {
        console.log('Test status button clicked');
        setStatus('Test status message - this should be visible!', true);
      });
    }
    
    // Add info about restrictions and defaults
    const infoDiv = document.createElement('div');
    infoDiv.innerHTML = `
      <div style="margin-top: 20px; padding: 15px; background-color: #e7f3ff; border: 1px solid #b3d9ff; border-radius: 5px;">
        <h4>Important Notes:</h4>
        <ul style="margin: 5px 0; padding-left: 20px;">
          <li><strong>Default Settings:</strong> Both detection and reporting are enabled by default</li>
          <li><strong>API URL:</strong> Automatically configured to your custom domain (hidden field)</li>
          <li><strong>Minimum Score:</strong> Set to 20 for optimal phishing detection</li>
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
