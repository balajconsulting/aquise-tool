// Content-Skript für die Extension (Platzhalter) 

console.log('Aquise Swipe Content-Skript geladen');

// Basis-URL für API-Aufrufe
const API_BASE_URL = 'https://aquise.balaj.consulting';

let swipeModeActive = false;
let currentLead = null;
let overlay = null;
let remainingLeads = null;

// === DEBUG MODUS ===
const DEBUG = true;
function debugLog(...args) {
  if (DEBUG) console.log('[AQUISE DEBUG]', ...args);
}

// Overlay-UI erzeugen
function createOverlay() {
  debugLog('createOverlay aufgerufen', { overlay });
  if (overlay) overlay.remove();
  overlay = document.createElement('div');
  overlay.id = 'aquise-swipe-overlay';
  // Konsistente Styles per <style>-Tag einfügen
  const style = document.createElement('style');
  style.textContent = `
    #aquise-swipe-overlay {
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      z-index: 999999 !important;
      background: #fff !important;
      border-radius: 14px !important;
      box-shadow: 0 2px 12px #0002 !important;
      padding: 18px 22px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      gap: 10px !important;
      min-width: 260px !important;
      max-width: 320px !important;
      font-family: 'Segoe UI', Arial, sans-serif !important;
    }
    #aquise-swipe-overlay button {
      font-family: inherit !important;
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      cursor: pointer !important;
      transition: background 0.15s, color 0.15s, box-shadow 0.15s !important;
    }
    #aquise-reject {
      background: #ffeaea !important;
      color: #d32f2f !important;
      border-radius: 10px !important;
    }
    #aquise-accept {
      background: #eaffea !important;
      color: #388e3c !important;
      border-radius: 10px !important;
    }
    #aquise-exit {
      background: #eee !important;
      color: #444 !important;
      border-radius: 8px !important;
      margin-top: 10px !important;
    }
    #aquise-lead-info {
      color: #222 !important;
      font-size: 1.05em !important;
      font-weight: 600 !important;
      text-align: center !important;
      margin-bottom: 2px !important;
      word-break: break-all !important;
    }
    #aquise-lead-progress {
      color: #888 !important;
      font-size: 1.1em !important;
      font-weight: 600 !important;
      margin-bottom: 8px !important;
      text-align: center !important;
    }
    #aquise-no-leads {
      color: #888 !important;
      margin-top: 8px !important;
      display: block !important;
    }
    #aquise-swipe-overlay button:disabled {
      opacity: 0.6 !important;
      cursor: not-allowed !important;
    }
  `;
  document.head.appendChild(style);
  overlay.innerHTML = `
    <div id="aquise-lead-info"></div>
    <div id="aquise-lead-progress"></div>
    <div style="display:flex;gap:1.5em;margin:10px 0 0 0;">
      <button id="aquise-reject" title="Ablehnen">&#10006;</button>
      <button id="aquise-accept" title="Akzeptieren">&#10004;</button>
    </div>
    <button id="aquise-exit">Modus beenden</button>
    <div id="aquise-no-leads" style="display:none;">Keine Leads mehr verfügbar.</div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('aquise-exit').onclick = stopSwipeMode;
}

function updateOverlay(lead, _recursed) {
  debugLog('updateOverlay', { lead, remainingLeads });
  const info = document.getElementById('aquise-lead-info');
  const progress = document.getElementById('aquise-lead-progress');
  if (!info || !progress) {
    debugLog('updateOverlay: Overlay-Elemente fehlen, erstelle Overlay neu');
    if (!_recursed) {
      createOverlay();
      updateOverlay(lead, true); // Nur einmal rekursiv aufrufen
    }
    return;
  }
  if (lead) {
    info.textContent = lead.firm_name ? `${lead.firm_name} – ${lead.domain}` : lead.domain;
    if (remainingLeads !== null && typeof remainingLeads !== 'undefined') {
      progress.textContent = `Verbleibende Leads: ${remainingLeads}`;
    } else {
      progress.textContent = 'Verbleibende Leads: ?';
    }
  } else {
    info.textContent = '';
    progress.textContent = 'Verbleibende Leads: ?';
  }
}

function stopSwipeMode() {
  debugLog('stopSwipeMode');
  swipeModeActive = false;
  if (overlay) overlay.remove();
  overlay = null;
}

// Beim Start: Zahl aus Storage lesen und anzeigen
chrome.storage.local.get('aquiseRemainingLeads', (data) => {
  debugLog('Storage aquiseRemainingLeads geladen', data);
  createOverlay();
  if (typeof data.aquiseRemainingLeads === 'number') {
    remainingLeads = data.aquiseRemainingLeads;
  }
  updateOverlay(currentLead);
});

async function fetchNextLeadAndGoto() {
  debugLog('fetchNextLeadAndGoto gestartet');
  try {
    const countRes = await fetch(`${API_BASE_URL}/api/leads/count/swipeable`);
    let countData = await countRes.json();
    debugLog('Leads count Response', countData);
    if (typeof countData.count === 'number') {
      remainingLeads = countData.count;
      chrome.storage.local.set({ aquiseRemainingLeads: remainingLeads });
    } else {
      remainingLeads = null;
      chrome.storage.local.remove('aquiseRemainingLeads');
    }
    createOverlay();
    updateOverlay(currentLead);
    const res = await fetch(`${API_BASE_URL}/api/leads/next`);
    debugLog('Leads next Response', res);
    if (!res.ok) throw new Error('Keine Leads');
    const lead = await res.json();
    debugLog('Lead geladen', lead);
    if (!lead || !lead.domain) throw new Error('Keine Leads');
    currentLead = lead;
    chrome.storage.local.set({ aquiseCurrentLead: lead });
    let url = lead.domain;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    debugLog('Vergleiche URLs', { current: window.location.href, target: url });
    if (window.location.href !== url) {
      debugLog('Navigiere zu neuem Lead', url);
      window.location.href = url;
    } else {
      debugLog('Zeige Overlay für aktuellen Lead');
      showOverlayForCurrentLead();
      updateOverlay(currentLead);
    }
  } catch (err) {
    debugLog('Fehler beim Laden des nächsten Leads', err);
    currentLead = null;
    chrome.storage.local.remove('aquiseCurrentLead');
    showNoLeads();
  }
}

function showOverlayForCurrentLead() {
  debugLog('showOverlayForCurrentLead', { currentLead });
  createOverlay();
  updateOverlay(currentLead);
  document.getElementById('aquise-reject').onclick = () => swipe('left');
  document.getElementById('aquise-accept').onclick = () => swipe('right');
  document.addEventListener('keydown', keyHandler);
}

function showNoLeads() {
  debugLog('showNoLeads aufgerufen');
  createOverlay();
  document.getElementById('aquise-lead-info').textContent = '';
  document.getElementById('aquise-no-leads').style.display = 'block';
  document.getElementById('aquise-reject').disabled = true;
  document.getElementById('aquise-accept').disabled = true;
}

function animateSwipe(direction, callback) {
  debugLog('animateSwipe', direction);
  if (!overlay) return callback();
  overlay.style.transition = 'opacity 0.3s';
  overlay.style.opacity = '0';
  setTimeout(() => {
    overlay.style.opacity = '1';
    callback();
  }, 300);
}

async function swipe(direction) {
  debugLog('swipe', direction, currentLead);
  if (!currentLead) return;
  const rejectBtn = document.getElementById('aquise-reject');
  const acceptBtn = document.getElementById('aquise-accept');
  if (rejectBtn) rejectBtn.disabled = true;
  if (acceptBtn) acceptBtn.disabled = true;
  let manual_status = null;
  if (direction === 'right') manual_status = 'MGG';
  if (direction === 'left') manual_status = 'MGR';
  animateSwipe(direction, async () => {
    try {
      await fetch(`${API_BASE_URL}/api/leads/${currentLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual_status })
      });
    } catch {}
    chrome.storage.local.remove('aquiseCurrentLead');
    fetchNextLeadAndGoto();
  });
}

function keyHandler(e) {
  debugLog('keyHandler', e.key);
  if (!swipeModeActive) return;
  const rejectBtn = document.getElementById('aquise-reject');
  if (!rejectBtn || rejectBtn.disabled) return;
  if (e.key === 'ArrowLeft') {
    buttonFeedback('aquise-reject');
    swipe('left');
  }
  if (e.key === 'ArrowRight') {
    buttonFeedback('aquise-accept');
    swipe('right');
  }
  if (e.key === 'Enter') {
    buttonFeedback('aquise-accept');
    swipe('right');
  }
  if (e.key === 'Escape') {
    buttonFeedback('aquise-exit');
    stopSwipeMode();
  }
}

function buttonFeedback(id) {
  debugLog('buttonFeedback', id);
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.style.boxShadow = '0 0 0 4px #90caf9';
  setTimeout(() => { btn.style.boxShadow = ''; }, 150);
}

// Message-Listener für Popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  debugLog('Message empfangen:', msg);
  if (msg.action === 'START_SWIPE_MODE') {
    swipeModeActive = true;
    fetchNextLeadAndGoto();
  }
});

// Nach Neuladen: Prüfe, ob ein Lead im Storage ist (z.B. nach Navigation)
chrome.storage.local.get('aquiseCurrentLead', (data) => {
  debugLog('Storage aquiseCurrentLead geladen', data);
  if (data.aquiseCurrentLead) {
    swipeModeActive = true;
    currentLead = data.aquiseCurrentLead;
    showOverlayForCurrentLead();
  }
}); 