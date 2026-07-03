/**
 * 自动消化 alert/confirm（等同 Playwright page.on('dialog', d => d.accept())）
 * 在 document_start + MAIN world 尽早安装，保存前会再次加固
 */
(function () {
  function noopAlert(msg) {
    console.info('[BUPT评教] alert:', msg);
    return undefined;
  }

  function noopConfirm(msg) {
    console.info('[BUPT评教] confirm:', msg);
    return true;
  }

  function clickDomModalButtons() {
    const selectors = [
      '.layui-layer-btn a',
      '.layui-layer-btn0',
      '.layui-layer-btn .layui-layer-btn0',
      '.artDialog .aui_state_highlight',
      '.ui-dialog-buttonpane button',
      '.modal-footer button',
      '.dialog-footer button',
      'button',
      'input[type="button"]',
    ];

    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        const text = (el.value || el.textContent || '').replace(/\s+/g, '');
        if (text === '确定' || text === '是' || text === 'OK' || text === '知道了') {
          try {
            el.click();
          } catch {
            /* ignore */
          }
        }
      }
    }
  }

  function hookWindow(win) {
    if (!win) return;
    try {
      win.alert = noopAlert;
      win.confirm = noopConfirm;
    } catch {
      /* cross-origin frame */
    }
  }

  function installDialogHook() {
    hookWindow(window);
    try {
      hookWindow(window.top);
    } catch {
      /* ignore */
    }

    for (let i = 0; i < window.frames.length; i++) {
      try {
        hookWindow(window.frames[i]);
      } catch {
        /* ignore */
      }
    }
  }

  function startDomModalWatcher(durationMs) {
    clickDomModalButtons();
    const start = Date.now();
    const timer = setInterval(() => {
      clickDomModalButtons();
      if (Date.now() - start > durationMs) clearInterval(timer);
    }, 150);
  }

  installDialogHook();
  window.__buptEvalInstallDialogHook = installDialogHook;
  window.__buptEvalStartDomModalWatcher = startDomModalWatcher;
})();
