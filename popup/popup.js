const $ = (id) => document.getElementById(id);

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

async function sendToContent(type, extra = {}) {
  const tab = await getActiveTab();
  if (!tab?.id) throw new Error('无法获取当前标签页');
  return chrome.tabs.sendMessage(tab.id, { type, ...extra });
}

async function refreshStatus() {
  try {
    const tab = await getActiveTab();
    if (!tab?.url?.includes('jwgl.bupt.edu.cn')) {
      setUiState('', '请先登录教务系统，并打开评教相关页面');
      return;
    }
    const res = await sendToContent('GET_STATUS');
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
      setUiState('', '在评教入口页，点击「一键评教」开始');
    } else if (res.pageType === 'edit') {
      setUiState('running', '正在评价页…');
    } else {
      setUiState('', '请打开评教页面（xspj_find / xspj_list）');
    }
  } catch {
    setUiState('', '请刷新评教页面后重试（扩展需注入 content script）');
  }
}

async function startEval(autoSubmit) {
  setRunning(true);
  setUiState('running', autoSubmit ? '正在一键评教并提交…' : '正在一键评教…');
  try {
    const config = getConfig();
    if (config.minDowngrade > config.maxDowngrade) {
      throw new Error('最少降级不能大于最多降级');
    }
    await chrome.storage.local.set({ eval_config: config });
    await sendToContent('START_EVAL', { autoSubmit, config });
  } catch (e) {
    setUiState('error', e.message || '启动失败');
    setRunning(false);
  }
}

els.btnStart.addEventListener('click', () => startEval(false));
els.btnStartSubmit.addEventListener('click', () => {
  if (confirm('将自动保存并提交全部评教，提交后不可修改。确定？')) {
    startEval(true);
  }
});

els.btnSubmit.addEventListener('click', async () => {
  if (!confirm('确定提交全部已保存的评教？提交后不可修改。')) return;
  try {
    await sendToContent('SUBMIT_ALL');
    setUiState('done', '已点击提交，请在页面确认结果');
  } catch (e) {
    setUiState('error', e.message || '提交失败');
  }
});

els.btnStop.addEventListener('click', async () => {
  await sendToContent('STOP_EVAL');
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
