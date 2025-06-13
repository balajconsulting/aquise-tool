const userAgents = [
  // Eine Auswahl gängiger User-Agents (kann beliebig erweitert werden)
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
];

const proxies = [
  // Beispiel: 'http://user:pass@proxyhost:port'
  // Für Demo leer lassen, kann später aus Config/DB geladen werden
];

const axios = require('axios');

function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function getRandomProxy() {
  if (proxies.length === 0) return null;
  return proxies[Math.floor(Math.random() * proxies.length)];
}

function randomDelay(min = 1000, max = 4000) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetries(fn, maxRetries = 3, log = () => {}) {
  let lastErr;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      log(`Fehler beim Versuch ${i + 1}: ${err.message}`);
      await randomDelay(1000, 3000);
    }
  }
  throw lastErr;
}

/**
 * Löst ein reCAPTCHA-Audio-Captcha mit Hilfe des Python-Services.
 * @param {import('puppeteer').Page} page - Die aktuelle Puppeteer-Seite
 * @param {function} log - Optionales Logging
 * @returns {Promise<boolean>} true bei Erfolg, false sonst
 */
async function solveRecaptchaAudio(page, log = () => {}) {
  try {
    log('Suche reCAPTCHA-Frame ...');
    // 1. Finde das reCAPTCHA-Frame
    const frames = page.frames();
    const recaptchaFrame = frames.find(f => f.url().includes('api2/anchor'));
    if (!recaptchaFrame) {
      log('Kein reCAPTCHA-Frame gefunden.');
      return false;
    }
    // 2. Checkbox klicken
    log('Klicke Checkbox ...');
    await recaptchaFrame.click('#recaptcha-anchor', { delay: 100 });
    await new Promise(res => setTimeout(res, 1000));
    // 3. Finde das Challenge-Frame
    const challengeFrame = page.frames().find(f => f.url().includes('api2/bframe'));
    if (!challengeFrame) {
      log('Kein Challenge-Frame gefunden.');
      return false;
    }
    // 4. Klicke auf Audio-Challenge
    log('Klicke auf Audio-Challenge ...');
    await challengeFrame.click('#recaptcha-audio-button', { delay: 100 });
    await new Promise(res => setTimeout(res, 1000));
    // 5. Extrahiere Audio-URL
    const audioUrl = await challengeFrame.$eval('#audio-source', el => el.src);
    log('Audio-URL gefunden: ' + audioUrl);
    // 6. Sende an Python-Service
    log('Sende Audio an Python-Service ...');
    const response = await axios.post('http://localhost:5005/solve', { audio_url: audioUrl });
    const text = response.data && response.data.result ? response.data.result : null;
    if (!text) {
      log('Keine Antwort vom Captcha-Solver.');
      return false;
    }
    log('Antwort vom Captcha-Solver: ' + text);
    // 7. Trage Antwort ein und bestätige
    await challengeFrame.type('#audio-response', text, { delay: 50 });
    await challengeFrame.click('#recaptcha-verify-button', { delay: 100 });
    await new Promise(res => setTimeout(res, 1500));
    // 8. Prüfe, ob gelöst
    const success = await recaptchaFrame.$eval('#recaptcha-anchor', el => el.classList.contains('recaptcha-checkbox-checked'));
    log('Captcha gelöst: ' + success);
    return success;
  } catch (err) {
    log('Fehler beim Lösen des Audio-Captchas: ' + err.message);
    return false;
  }
}

module.exports = {
  getRandomUserAgent,
  getRandomProxy,
  randomDelay,
  withRetries,
  solveRecaptchaAudio
}; 