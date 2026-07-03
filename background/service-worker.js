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
    return;
  }

  if (msg.type === 'INVOKE_SAVE') {
    const tabId = _sender.tab?.id;
    if (!tabId) {
      sendResponse({ ok: false, error: '无法定位当前标签页' });
      return;
    }

    chrome.scripting
      .executeScript({
        target: { tabId },
        world: 'MAIN',
        func: () => {
          if (typeof window.__buptEvalInstallDialogHook === 'function') {
            window.__buptEvalInstallDialogHook();
          }
          if (typeof window.__buptEvalInvokeSave === 'function') {
            return window.__buptEvalInvokeSave();
          }
          const btn = document.getElementById('bc');
          if (!btn) return { ok: false, error: '未找到保存按钮' };
          if (typeof saveData === 'function') {
            saveData(btn, '0');
          } else {
            btn.click();
          }
          if (typeof window.__buptEvalStartDomModalWatcher === 'function') {
            window.__buptEvalStartDomModalWatcher(10000);
          }
          return { ok: true };
        },
      })
      .then((results) => sendResponse(results[0]?.result || { ok: false, error: '保存失败' }))
      .catch((e) => sendResponse({ ok: false, error: e.message || '保存失败' }));
    return true;
  }
});
