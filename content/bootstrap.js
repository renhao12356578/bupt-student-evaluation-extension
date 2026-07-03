/**
 * 非评教页引导：登录后自动进入评教入口（pending_start 时）
 */
(function () {
  const FIND_URL = 'https://jwgl.bupt.edu.cn/jsxsd/xspj/xspj_find.do';

  async function maybeRedirect() {
    const data = await chrome.storage.session.get(['pending_start', 'bupt_eval_run']);
    const pending = data.pending_start;
    const running = data.bupt_eval_run?.active;
    if (!pending && !running) return;

    const href = location.href;
    if (href.includes('/xspj/')) return;

    // 仍在登录页，轮询等待登录成功
    if (document.title.includes('登录') || href.includes('login')) {
      const timer = setInterval(async () => {
        const pending = (await chrome.storage.session.get('pending_start')).pending_start;
        if (!pending) {
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

    // 已进入教务系统其他页 → 跳评教入口
    if (href.includes('jwgl.bupt.edu.cn/jsxsd/')) {
      location.href = FIND_URL;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeRedirect);
  } else {
    maybeRedirect();
  }
})();
