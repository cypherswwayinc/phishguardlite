// Robust Options logic for PhishGuard Lite
const enabledEl = document.getElementById('enabled') as HTMLInputElement | null;
const minScoreEl = document.getElementById('minScore') as HTMLInputElement | null;
const apiBaseEl = document.getElementById('apiBase') as HTMLInputElement | null;
const tenantKeyEl = document.getElementById('tenantKey') as HTMLInputElement | null;
const enableReportingEl = document.getElementById('enableReporting') as HTMLInputElement | null;
const saveBtn = document.getElementById('save') as HTMLButtonElement | null;
const statusEl = document.getElementById('status') as HTMLParagraphElement | null;

const DEFAULT_API_BASE = "https://ysnpbaet5e.execute-api.us-east-1.amazonaws.com/Prod";

function setStatus(msg: string, ok = true) {
  if (!statusEl) {
    console.error('Status element not found!');
    return;
  }
  console.log('Setting status:', msg, 'ok:', ok);
  statusEl.textContent = msg;
  statusEl.className = ok ? "status success" : "status error";
  if (ok) {
    setTimeout(() => { 
      if (statusEl && statusEl.textContent === msg) {
        statusEl.textContent = "";
        statusEl.className = "status";
      }
    }, 3000);
  }
}

function el<T extends HTMLElement>(x: T | null, name: string): T {
  if (!x) throw new Error(`Options: Element not found: ${name}`);
  return x;
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded - Initializing options page');
  console.log('Elements found:', {
    enabled: !!enabledEl,
    minScore: !!minScoreEl,
    apiBase: !!apiBaseEl,
    tenantKey: !!tenantKeyEl,
    enableReporting: !!enableReportingEl,
    save: !!saveBtn,
    status: !!statusEl
  });
  
  try {
    // Load settings
    console.log('Loading settings from Chrome storage...');
    chrome.storage.sync.get(["enabled","minScore","apiBase","tenantKey","enableReporting"], (result) => {
      console.log('Storage get result:', result);
      try {
        el(enabledEl,'enabled').checked = result.enabled ?? true;
        el(minScoreEl,'minScore').value = String(result.minScore ?? 20);
        el(apiBaseEl,'apiBase').value = result.apiBase ?? DEFAULT_API_BASE;
        el(tenantKeyEl,'tenantKey').value = result.tenantKey ?? "";
        el(enableReportingEl,'enableReporting').checked = result.enableReporting ?? true;
        console.log('Settings loaded successfully');
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error('Error setting element values:', e);
        setStatus('Error loading settings: ' + errorMessage, false);
      }
    });

    // Wire save
    console.log('Setting up save button event listener...');
    el(saveBtn, 'save').addEventListener('click', () => {
      console.log('Save button clicked!');
      try {
        const saveButton = el(saveBtn,'save');
        saveButton.disabled = true;
        console.log('Save button disabled');
        
        const payload = {
          enabled: el(enabledEl,'enabled').checked,
          minScore: Number(el(minScoreEl,'minScore').value || 20),
          apiBase: el(apiBaseEl,'apiBase').value.trim(),
          tenantKey: el(tenantKeyEl,'tenantKey').value.trim(),
          enableReporting: el(enableReportingEl,'enableReporting').checked
        };
        
        console.log('Saving payload:', payload);
        
        chrome.storage.sync.set(payload, () => {
          console.log('Storage set callback executed');
          const err = chrome.runtime.lastError;
          console.log('Chrome runtime error:', err);
          
          saveButton.disabled = false;
          console.log('Save button re-enabled');
          
          if (err) {
            console.error('Save failed', err);
            setStatus('Save failed: ' + err.message, false);
            return;
          }
          
          console.log('Save successful!');
          setStatus('Settings saved successfully! ✓', true);
          
          // Verify the save by reading back
          chrome.storage.sync.get(Object.keys(payload), (verifyResult) => {
            console.log('Verification read result:', verifyResult);
          });
        });
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error('Save operation error:', e);
        el(saveBtn,'save').disabled = false;
        setStatus('Save failed: ' + errorMessage, false);
      }
    });
    
    console.log('Options page initialization complete');
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('Options init error', e);
    setStatus('Options init error: ' + errorMessage, false);
  }
});

console.log('Options script loaded');
