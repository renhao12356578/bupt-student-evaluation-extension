/**
 * 非评教页引导：登录后自动进入评教入口
 */
(function () {
  if (window.top !== window.self) return;

  const FIND_URL = 'https://jwgl.bupt.edu.cn/jsxsd/xspj/xspj_find.do';

  async function hasPendingTask() {
    const data = await chrome.runtime.sendMessage({
      type: 'EVAL_STORE_GET',
      keys: ['pending_start', 'bupt_eval_run'],
    });
    return !!(data.pending_start || data.bupt_eval_run?.active);
  }

  async function maybeRedirect() {
    if (!(await hasPendingTask())) return;

    const href = location.href;
    if (href.includes('/xspj/')) return;

    if (document.title.includes('登录') || href.includes('login')) {
      const timer = setInterval(async () => {
        const data = await chrome.runtime.sendMessage({
          type: 'EVAL_STORE_GET',
          keys: ['pending_start'],
        });
        if (!data.pending_start) {
          clearInterval(timer);
          return;
        }
        if (!document.title.includes('登录') && location.href.includes('jwgl.bupt.edu.cn')) {
          clearInterval(timer);
          location.href = FIND_URL;
        }
      }, 1500);
      return;
    }

    if (href.includes('jwgl.bupt.edu.cn/jsxsd/')) {
      location.href = FIND_URL;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => maybeRedirect());
  } else {
    maybeRedirect();
  }
})();
