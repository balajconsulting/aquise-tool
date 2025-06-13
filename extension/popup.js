document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startSwipe');
  startBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'START_SWIPE_MODE' });
      window.close();
    }
  });
}); 