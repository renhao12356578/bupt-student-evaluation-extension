/**
 * 页面主环境保存逻辑（外部脚本，不触发 CSP inline 限制）
 * 由 background executeScript 调用
 */
(function () {
  if (window.__buptEvalSaveBridge) return;
  window.__buptEvalSaveBridge = true;

  function findSaveButton() {
    const byId = document.getElementById('bc');
    if (byId) return byId;

    for (const el of document.querySelectorAll(
      'input[type="button"], input[type="submit"], button, a',
    )) {
      const text = (el.value || el.textContent || '').replace(/\s+/g, '');
      if (text === '保存' || text.includes('保存')) return el;
    }

    for (const el of document.querySelectorAll('[onclick*="saveData"]')) {
      return el;
    }

    return null;
  }

  window.__buptEvalInvokeSave = function invokeSave() {
    if (typeof window.__buptEvalInstallDialogHook === 'function') {
      window.__buptEvalInstallDialogHook();
    }

    const btn = findSaveButton();
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
  };
})();
