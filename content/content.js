/**
 * BUPT 评教 content script：跨页面续跑一键评教流程
 */
(function () {
  const STORAGE_KEY = 'bupt_eval_run';
  const FIND_PATH = '/jsxsd/xspj/xspj_find.do';
  const LIST_PATH = '/xspj_list.do';
  const EDIT_PATH = '/xspj_edit.do';

  function pageType() {
    const href = location.href;
    if (href.includes(EDIT_PATH)) return 'edit';
    if (href.includes(LIST_PATH)) return 'list';
    if (href.includes(FIND_PATH)) return 'find';
    return 'unknown';
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function getRunState() {
    const data = await chrome.storage.session.get(STORAGE_KEY);
    return data[STORAGE_KEY] || null;
  }

  async function setRunState(state) {
    if (state) await chrome.storage.session.set({ [STORAGE_KEY]: state });
    else await chrome.storage.session.remove(STORAGE_KEY);
  }

  async function updateProgress(patch) {
    const cur = (await getRunState()) || {};
    await setRunState({ ...cur, ...patch, updatedAt: Date.now() });
  }

  async function notifyPopup(payload) {
    try {
      await chrome.runtime.sendMessage({ type: 'EVAL_PROGRESS', ...payload });
    } catch {
      /* popup 可能已关闭 */
    }
  }

  async function runPipeline() {
    const state = await getRunState();
    if (!state?.active) return;

    const type = pageType();
    const config = state.config || window.BuptEvalFill.DEFAULT_CONFIG;

    if (type === 'find') {
      await notifyPopup({ phase: 'entering', message: '进入评教列表…' });
      if (window.BuptEvalList.enterFromFindPage()) return;
      await setRunState(null);
      await notifyPopup({ phase: 'error', message: '未找到「进入评价」链接' });
      return;
    }

    if (type === 'list') {
      const status = window.BuptEvalList.getListStatus();
      await updateProgress({
        filled: status.evaluated,
        total: status.total,
        minScore: status.minScore,
        maxScore: status.maxScore,
      });
      await notifyPopup({
        phase: 'filling',
        message: `进度 ${status.evaluated}/${status.total}`,
        status,
      });

      if (status.unevaluated > 0) {
        window.BuptEvalList.goNextUnevaluated();
        return;
      }

      // 全部保存完成
      if (state.autoSubmit) {
        await notifyPopup({ phase: 'submitting', message: '正在提交…' });
        await sleep(500);
        window.BuptEvalList.submitAll();
        await updateProgress({ phase: 'submitted', active: false });
        await setRunState(null);
        await notifyPopup({
          phase: 'done',
          message: `已完成并提交，分数 ${status.minScore}~${status.maxScore}`,
          status,
        });
        return;
      }

      await updateProgress({ phase: 'saved', active: false });
      await setRunState(null);
      await notifyPopup({
        phase: 'done',
        message: `已全部保存（未提交），分数 ${status.minScore}~${status.maxScore}`,
        status,
        needSubmit: true,
      });
      return;
    }

    if (type === 'edit') {
      await notifyPopup({ phase: 'filling', message: '正在填充当前课程…' });
      await sleep(800);
      const result = window.BuptEvalFill.fillAndSave(config);
      if (!result.ok) {
        await setRunState(null);
        await notifyPopup({ phase: 'error', message: result.error || '填充失败' });
      }
      // saveData 会触发页面跳回 list，由 list 页继续
      return;
    }

    await setRunState(null);
    await notifyPopup({ phase: 'error', message: '请在教务评教页面使用' });
  }

  async function consumePendingStart() {
    const data = await chrome.storage.session.get('pending_start');
    if (!data.pending_start) return false;
    await chrome.storage.session.remove('pending_start');
    await setRunState({
      active: true,
      autoSubmit: !!data.pending_start.autoSubmit,
      config: data.pending_start.config || window.BuptEvalFill.DEFAULT_CONFIG,
      startedAt: Date.now(),
    });
    return true;
  }

  async function onPageReady() {
    await consumePendingStart();
    await runPipeline();
  }

  // 页面加载后：处理「点击扩展后跳转过来」的待启动任务，或续跑进行中的评教
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => onPageReady());
  } else {
    onPageReady();
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'START_EVAL') {
      (async () => {
        await setRunState({
          active: true,
          autoSubmit: !!msg.autoSubmit,
          config: msg.config || window.BuptEvalFill.DEFAULT_CONFIG,
          startedAt: Date.now(),
        });

        const type = pageType();
        if (type === 'unknown') {
          window.location.href = 'https://jwgl.bupt.edu.cn/jsxsd/xspj/xspj_find.do';
          sendResponse({ ok: true, navigating: true });
          return;
        }
        await runPipeline();
        sendResponse({ ok: true });
      })();
      return true;
    }

    if (msg.type === 'SUBMIT_ALL') {
      const r = window.BuptEvalList.submitAll();
      sendResponse(r);
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
      setRunState(null).then(() => sendResponse({ ok: true }));
      return true;
    }
  });
})();
