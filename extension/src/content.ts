// src/content.ts
import { scoreUrl } from './lib/scoring'
import { attachBadge, attachBadgeWithReport } from './lib/utils'

type Settings = {
  enabled?: boolean;
  minScore?: number;
  enableReporting?: boolean;
  apiUrl?: string;
}

type CloudScore = {
  score: number;
  reasons: string[];
  label: string;
}

let settings: Settings = { enabled: true, minScore: 20, enableReporting: false, apiUrl: 'https://ysnpbaet5e.execute-api.us-east-1.amazonaws.com/Prod' };

chrome.storage.sync.get(["enabled", "minScore", "enableReporting", "apiUrl"], (s) => {
  settings = { 
    enabled: s.enabled ?? true, 
    minScore: s.minScore ?? 20, 
    enableReporting: s.enableReporting ?? false,
    apiUrl: s.apiUrl ?? 'https://ysnpbaet5e.execute-api.us-east-1.amazonaws.com/Prod'
  };
  scanAllLinks();
});

async function getCloudScore(url: string, linkText: string | null): Promise<CloudScore | null> {
  try {
    // Validate URL before sending to API
    if (!url || url.trim() === '' || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('javascript:')) {
      console.log('Skipping invalid URL for cloud scoring:', url);
      return null;
    }
    
    // Try to construct a valid URL object to ensure it's well-formed
    try {
      new URL(url);
    } catch (e) {
      console.log('Malformed URL, skipping cloud scoring:', url);
      return null;
    }
    
    const response = await fetch(`${settings.apiUrl}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, linkText }),
    });
    
    if (!response.ok) {
      console.warn('Cloud scoring failed:', response.status, response.statusText);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.warn('Cloud scoring error:', error);
    return null;
  }
}

function combineScores(localScore: any, cloudScore: CloudScore | null) {
  if (!cloudScore) return localScore;
  
  // Take the maximum score from both sources
  const combinedScore = Math.max(localScore.score, cloudScore.score);
  
  // Combine reasons from both sources, removing duplicates
  const allReasons = [...localScore.reasons];
  cloudScore.reasons.forEach(reason => {
    if (!allReasons.includes(reason)) {
      allReasons.push(`[Cloud] ${reason}`);
    }
  });
  
  // Determine label based on combined score
  const label = combinedScore >= 50 ? "High Risk" : combinedScore >= 20 ? "Caution" : "Safe";
  
  return {
    score: combinedScore,
    reasons: allReasons,
    label,
    hasCloudScore: true
  };
}

async function evaluateLink(a: HTMLAnchorElement) {
  if (!settings.enabled) return;
  const href = a.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;

  const text = a.textContent?.trim() || null;
  const localResult = scoreUrl(href, text);
  
  let finalResult = localResult;
  
  // If reporting is enabled, get cloud score and combine
  if (settings.enableReporting) {
    const cloudResult = await getCloudScore(href, text);
    finalResult = combineScores(localResult, cloudResult);
  }
  
  if (finalResult.score >= (settings.minScore || 20)) {
    if (settings.enableReporting) {
      attachBadgeWithReport(a, finalResult.label, finalResult.reasons);
    } else {
      attachBadge(a, finalResult.label, finalResult.reasons);
    }
  }
}

function scanAllLinks(root: ParentNode = document) {
  const links = root.querySelectorAll("a[href]");
  links.forEach(a => evaluateLink(a as HTMLAnchorElement));
}

const mo = new MutationObserver((m) => {
  for (const rec of m) {
    rec.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        scanAllLinks(node as Element);
      }
    });
  }
});

mo.observe(document.documentElement, { subtree: true, childList: true });
scanAllLinks();