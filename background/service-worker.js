/**
 * 转发 content script 进度到 popup
 */
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'EVAL_PROGRESS') {
    chrome.storage.session.set({ eval_progress: { ...msg, tabId: sender.tab?.id } });
  }
});
