/**
 * BUPT 评教 content script — 与 Playwright 成功流程对齐
 */
(function () {
  if (window.top !== window.self) return;

  const RUN_KEY = 'bupt_eval_run';
  const PENDING_KEY = 'pending_start';
  const FIND_URL = 'https://jwgl.bupt.edu.cn/jsxsd/xspj/xspj_find.do';

  function pageType() {
    const href = location.href;
    if (href.includes('/xspj_edit.do')) return 'edit';
    if (href.includes('/xspj_list.do')) return 'list';
    if (href.includes('/xspj_find.do')) return 'find';
    return 'unknown';
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function getRunState() {
    const data = await window.BuptEvalStore.get(RUN_KEY);
    return data[RUN_KEY] || null;
  }

  async function setRunState(state) {
    if (state) await window.BuptEvalStore.set({ [RUN_KEY]: state });
    else await window.BuptEvalStore.remove(RUN_KEY);
  }

  async function notifyProgress(payload) {
    try {
      await chrome.runtime.sendMessage({ type: 'EVAL_PROGRESS', ...payload, ts: Date.now() });
    } catch {
      /* popup 可能已关 */
    }
  }

  async function activateFromPending() {
    const data = await window.BuptEvalStore.get(PENDING_KEY);
    if (!data[PENDING_KEY]) return false;
    await window.BuptEvalStore.remove(PENDING_KEY);
    await setRunState({
      active: true,
      autoSubmit: !!data[PENDING_KEY].autoSubmit,
      config: data[PENDING_KEY].config || window.BuptEvalFill.DEFAULT_CONFIG,
      startedAt: Date.now(),
    });
    return true;
  }

  async function activateFromMessage(msg) {
    await window.BuptEvalStore.remove(PENDING_KEY);
    await setRunState({
      active: true,
      autoSubmit: !!msg.autoSubmit,
      config: msg.config || window.BuptEvalFill.DEFAULT_CONFIG,
      startedAt: Date.now(),
    });
  }

  async function runPipeline() {
    const state = await getRunState();
    if (!state?.active) return;

    const type = pageType();
    const config = state.config || window.BuptEvalFill.DEFAULT_CONFIG;

    if (type === 'find') {
      await notifyProgress({ phase: 'entering', message: '进入评教列表…' });
      await sleep(500);
      if (window.BuptEvalList.enterFromFindPage()) return;
      await setRunState(null);
      await notifyProgress({ phase: 'error', message: '未找到「进入评价」链接，请确认评教已开放' });
      return;
    }

    if (type === 'list') {
      await sleep(800);
      const status = window.BuptEvalList.getListStatus();
      await notifyProgress({
        phase: 'filling',
        message: `进度 ${status.evaluated}/${status.total}`,
        status: {
          filled: status.evaluated,
          total: status.total,
          unevaluated: status.unevaluated,
          minScore: status.minScore,
          maxScore: status.maxScore,
        },
      });

      if (status.unevaluated > 0) {
        window.BuptEvalList.goNextUnevaluated();
        return;
      }

      if (state.autoSubmit) {
        await notifyProgress({ phase: 'submitting', message: '正在提交全部评教…' });
        await sleep(500);
        window.BuptEvalList.submitAll();
        await sleep(2000);
        await setRunState(null);
        await notifyProgress({
          phase: 'done',
          message: `已完成并提交，分数 ${status.minScore}~${status.maxScore}`,
          status,
        });
        return;
      }

      await setRunState(null);
      await notifyProgress({
        phase: 'done',
        message: `已全部保存（未提交），分数 ${status.minScore}~${status.maxScore}`,
        status,
        needSubmit: true,
      });
      return;
    }

    if (type === 'edit') {
      await notifyProgress({ phase: 'filling', message: '正在填充当前课程…' });
      await sleep(800);
      const result = await window.BuptEvalFill.fillAndSave(config);
      if (!result.ok) {
        await setRunState(null);
        await notifyProgress({ phase: 'error', message: result.error || '填充失败' });
      }
      return;
    }

    await setRunState(null);
    await notifyProgress({ phase: 'error', message: '不在评教页面，正在重新打开…' });
    location.href = FIND_URL;
  }

  async function onPageReady() {
    try {
      await activateFromPending();
      await runPipeline();
    } catch (e) {
      console.error('[BUPT评教]', e);
      await notifyProgress({ phase: 'error', message: e.message || '运行出错' });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => onPageReady());
  } else {
    onPageReady();
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'START_EVAL') {
      (async () => {
        try {
          await activateFromMessage(msg);
          const type = pageType();
          if (type === 'unknown') {
            location.href = FIND_URL;
            sendResponse({ ok: true, navigating: true });
            return;
          }
          await runPipeline();
          sendResponse({ ok: true });
        } catch (e) {
          sendResponse({ ok: false, error: e.message });
        }
      })();
      return true;
    }

    if (msg.type === 'SUBMIT_ALL') {
      sendResponse(window.BuptEvalList.submitAll());
      return true;
    }

    if (msg.type === 'GET_STATUS') {
      const type = pageType();
      let status = null;
      if (type === 'list') status = window.BuptEvalList.getListStatus();
      sendResponse({ pageType: type, status });
      return true;
    }

    if (msg.type === 'STOP_EVAL') {
      (async () => {
        await window.BuptEvalStore.remove([PENDING_KEY, RUN_KEY]);
        sendResponse({ ok: true });
      })();
      return true;
    }
  });
})();
