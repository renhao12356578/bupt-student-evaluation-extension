/**
 * 后台统一读写 session storage（content / popup 均通过 message 访问）
 */
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'EVAL_STORE_GET') {
    chrome.storage.session.get(msg.keys).then(sendResponse);
    return true;
  }

  if (msg.type === 'EVAL_STORE_SET') {
    chrome.storage.session.set(msg.data).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === 'EVAL_STORE_REMOVE') {
    chrome.storage.session.remove(msg.keys).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === 'EVAL_PROGRESS') {
    const { type: _t, ...rest } = msg;
    chrome.storage.session.set({ eval_progress: rest });
  }
});
