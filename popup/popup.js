const $ = (id) => document.getElementById(id);

const FIND_URL = 'https://jwgl.bupt.edu.cn/jsxsd/xspj/xspj_find.do';
const EVAL_PATH = '/jsxsd/xspj/';

const els = {
  status: $('status'),
  statusText: $('statusText'),
  progressWrap: $('progressWrap'),
  progressBar: $('progressBar'),
  progressLabel: $('progressLabel'),
  btnStart: $('btnStart'),
  btnStartSubmit: $('btnStartSubmit'),
  btnSubmit: $('btnSubmit'),
  btnStop: $('btnStop'),
  minDowngrade: $('minDowngrade'),
  maxDowngrade: $('maxDowngrade'),
  highlights: $('highlights'),
  improvement: $('improvement'),
};

function getConfig() {
  return {
    minDowngrade: Math.max(1, parseInt(els.minDowngrade.value, 10) || 1),
    maxDowngrade: Math.max(1, parseInt(els.maxDowngrade.value, 10) || 2),
    minPositive: 3,
    maxPositive: 5,
    highlights: els.highlights.value.trim() || '很好',
    improvement: els.improvement.value.trim(),
  };
}

function setUiState(state, message, progress) {
  els.status.className = `status ${state}`;
  els.statusText.textContent = message;

  if (progress && progress.total > 0) {
    els.progressWrap.classList.remove('hidden');
    const filled = progress.filled ?? 0;
    const pct = Math.round((filled / progress.total) * 100);
    els.progressBar.style.width = `${pct}%`;
    els.progressLabel.textContent = `${filled} / ${progress.total}`;
  } else {
    els.progressWrap.classList.add('hidden');
  }
}

function setRunning(running) {
  els.btnStart.disabled = running;
  els.btnStartSubmit.disabled = running;
  els.btnStop.classList.toggle('hidden', !running);
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function isEvalPage(url = '') {
  return url.includes('jwgl.bupt.edu.cn') && url.includes(EVAL_PATH);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitTabComplete(tabId, timeoutMs = 30000) {
  const tab = await chrome.tabs.get(tabId);
  if (tab.status === 'complete') return;

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error('页面加载超时，请先登录教务系统'));
    }, timeoutMs);

    function onUpdated(id, info) {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

/** 与 Playwright 一致：写入 pending → 打开评教入口 → content script 续跑 */
async function startEval(autoSubmit) {
  setRunning(true);
  setUiState('running', autoSubmit ? '正在打开评教页并自动提交…' : '正在打开评教页并自动评教…');

  try {
    const config = getConfig();
    if (config.minDowngrade > config.maxDowngrade) {
      throw new Error('最少降级不能大于最多降级');
    }
    await chrome.storage.local.set({ eval_config: config });

    const tab = await getActiveTab();
    if (!tab?.id) throw new Error('无法获取当前标签页');

    // 清掉旧状态，写入新任务
    await chrome.storage.session.remove(['bupt_eval_run', 'eval_progress']);
    await chrome.storage.session.set({ pending_start: { autoSubmit, config } });

    if (isEvalPage(tab.url)) {
      // 已在评教页：直接通知 content 启动（不重复跳转）
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'START_EVAL', autoSubmit, config });
      } catch {
        // content 未就绪则刷新到入口页
        await chrome.tabs.update(tab.id, { url: FIND_URL });
        await waitTabComplete(tab.id);
      }
    } else {
      // 任意页 → 评教入口（未登录会到登录页，登录后 bootstrap 会继续跳转）
      await chrome.tabs.update(tab.id, { url: FIND_URL });
      await waitTabComplete(tab.id);
      await sleep(1000);
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'START_EVAL', autoSubmit, config });
      } catch {
        /* pending_start 由 content onPageReady 接管 */
      }
    }

    setUiState('running', '评教进行中，请勿关闭此标签页…');
  } catch (e) {
    await chrome.storage.session.remove('pending_start');
    setUiState('error', e.message || '启动失败');
    setRunning(false);
  }
}

async function refreshStatus() {
  try {
    const tab = await getActiveTab();
    if (!isEvalPage(tab.url)) {
      setUiState('', '点击「一键评教」将自动打开评教页（需已登录教务）');
      els.btnSubmit.classList.add('hidden');
      return;
    }
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' });
    if (res.pageType === 'list' && res.status) {
      const s = res.status;
      setUiState(
        s.unevaluated === 0 ? 'done' : '',
        s.unevaluated === 0
          ? `已全部评价 ${s.evaluated} 门，分数 ${s.minScore}~${s.maxScore}`
          : `待评 ${s.unevaluated} 门，已评 ${s.evaluated} 门`,
        { filled: s.evaluated, total: s.total },
      );
      els.btnSubmit.classList.toggle('hidden', s.unevaluated > 0);
    } else if (res.pageType === 'find') {
      setUiState('', '已就绪，点击「一键评教」开始');
    }
  } catch {
    setUiState('', '点击「一键评教」将自动打开评教页面');
  }
}

els.btnStart.addEventListener('click', () => startEval(false));
els.btnStartSubmit.addEventListener('click', () => {
  if (confirm('将自动评教并提交全部课程。提交后不可修改。确定？')) startEval(true);
});

els.btnSubmit.addEventListener('click', async () => {
  if (!confirm('确定提交全部已保存的评教？提交后不可修改。')) return;
  try {
    const tab = await getActiveTab();
    await chrome.tabs.sendMessage(tab.id, { type: 'SUBMIT_ALL' });
    setUiState('done', '已点击提交，请在页面确认结果');
  } catch (e) {
    setUiState('error', e.message || '提交失败，请先打开课程列表页');
  }
});

els.btnStop.addEventListener('click', async () => {
  try {
    const tab = await getActiveTab();
    if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: 'STOP_EVAL' });
  } catch {
    /* ignore */
  }
  await chrome.storage.session.remove(['pending_start', 'bupt_eval_run']);
  setRunning(false);
  setUiState('', '已停止');
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'session' || !changes.eval_progress) return;
  const p = changes.eval_progress.newValue;
  if (!p) return;

  if (p.phase === 'filling' || p.phase === 'entering') {
    setUiState('running', p.message || '处理中…', p.status);
  } else if (p.phase === 'done') {
    setRunning(false);
    setUiState('done', p.message || '完成');
    if (p.needSubmit) els.btnSubmit.classList.remove('hidden');
  } else if (p.phase === 'error') {
    setRunning(false);
    setUiState('error', p.message || '出错');
  } else if (p.phase === 'submitting') {
    setUiState('running', p.message || '提交中…');
  }
});

chrome.storage.local.get('eval_config').then((data) => {
  const c = data.eval_config;
  if (!c) return;
  if (c.minDowngrade) els.minDowngrade.value = c.minDowngrade;
  if (c.maxDowngrade) els.maxDowngrade.value = c.maxDowngrade;
  if (c.highlights) els.highlights.value = c.highlights;
  if (c.improvement) els.improvement.value = c.improvement;
});

refreshStatus();
