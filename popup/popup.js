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
    const pct = Math.round((progress.filled / progress.total) * 100);
    els.progressBar.style.width = `${pct}%`;
    els.progressLabel.textContent = `${progress.filled} / ${progress.total}`;
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

async function sendToTab(tabId, type, extra = {}) {
  return chrome.tabs.sendMessage(tabId, { type, ...extra });
}

async function waitTabComplete(tabId, timeoutMs = 20000) {
  const tab = await chrome.tabs.get(tabId);
  if (tab.status === 'complete') return;

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error('页面加载超时，请确认已登录教务系统'));
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

/** 确保当前标签页在评教页；不在则自动跳转 */
async function ensureEvalPage(tab) {
  if (isEvalPage(tab.url)) return tab;

  await chrome.storage.session.set({
    pending_start: {
      autoSubmit: false,
      _placeholder: true,
    },
  });

  const target = tab.url?.includes('jwgl.bupt.edu.cn') ? tab.id : tab.id;
  await chrome.tabs.update(target, { url: FIND_URL });
  await waitTabComplete(target);
  await sleep(600);
  return chrome.tabs.get(target);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function refreshStatus() {
  try {
    const tab = await getActiveTab();
    if (!isEvalPage(tab.url)) {
      setUiState('', '任意页面均可：点击「一键评教」将自动打开评教页');
      els.btnSubmit.classList.add('hidden');
      return;
    }
    const res = await sendToTab(tab.id, 'GET_STATUS');
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
    } else if (res.pageType === 'edit') {
      setUiState('running', '正在评价页…');
    }
  } catch {
    setUiState('', '点击「一键评教」将自动打开评教页面');
  }
}

async function startEval(autoSubmit) {
  setRunning(true);
  setUiState('running', autoSubmit ? '正在打开评教页并提交…' : '正在打开评教页…');

  try {
    const config = getConfig();
    if (config.minDowngrade > config.maxDowngrade) {
      throw new Error('最少降级不能大于最多降级');
    }
    await chrome.storage.local.set({ eval_config: config });

    let tab = await getActiveTab();
    if (!tab?.id) throw new Error('无法获取当前标签页');

    // 写入待启动任务（跳转后 content script 会自动接管）
    await chrome.storage.session.set({ pending_start: { autoSubmit, config } });

    if (!isEvalPage(tab.url)) {
      await chrome.tabs.update(tab.id, { url: FIND_URL });
      await waitTabComplete(tab.id);
      await sleep(800);
      tab = await chrome.tabs.get(tab.id);
    }

    // 已在评教页则直接启动
    try {
      await sendToTab(tab.id, 'START_EVAL', { autoSubmit, config });
      // 清除 pending，避免重复启动
      await chrome.storage.session.remove('pending_start');
    } catch {
      // 跳转刚完成时 content script 可能尚未就绪，pending_start 会由 onPageReady 处理
      setUiState('running', '已跳转，正在自动评教…');
    }
  } catch (e) {
    await chrome.storage.session.remove('pending_start');
    setUiState('error', e.message || '启动失败');
    setRunning(false);
  }
}

els.btnStart.addEventListener('click', () => startEval(false));
els.btnStartSubmit.addEventListener('click', () => {
  if (confirm('将自动打开评教页、保存并提交全部评教。提交后不可修改。确定？')) {
    startEval(true);
  }
});

els.btnSubmit.addEventListener('click', async () => {
  if (!confirm('确定提交全部已保存的评教？提交后不可修改。')) return;
  try {
    const tab = await getActiveTab();
    if (!isEvalPage(tab.url)) {
      await chrome.tabs.update(tab.id, { url: FIND_URL });
      await waitTabComplete(tab.id);
      setUiState('error', '请先完成评教保存，再在列表页提交');
      return;
    }
    await sendToTab(tab.id, 'SUBMIT_ALL');
    setUiState('done', '已点击提交，请在页面确认结果');
  } catch (e) {
    setUiState('error', e.message || '提交失败');
  }
});

els.btnStop.addEventListener('click', async () => {
  try {
    const tab = await getActiveTab();
    if (tab?.id && isEvalPage(tab.url)) await sendToTab(tab.id, 'STOP_EVAL');
  } catch {
    /* ignore */
  }
  await chrome.storage.session.remove('pending_start');
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
