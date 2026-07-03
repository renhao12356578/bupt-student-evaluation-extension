/**
 * 评教表单填充逻辑（content script 共享）
 * 暴露 window.BuptEvalFill
 */
(function () {
  const DEFAULT_CONFIG = {
    minDowngrade: 1,
    maxDowngrade: 2,
    minPositive: 3,
    maxPositive: 5,
    highlights: '很好',
    improvement: '',
  };

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

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

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  /** 在页面主环境调用 saveData（content script 隔离世界无法直接访问） */
  function invokeSaveInPage() {
    const script = document.createElement('script');
    script.textContent = `(function(){
      var btn = document.getElementById('bc');
      if (!btn) {
        var els = document.querySelectorAll('input[type="button"], input[type="submit"], button, a');
        for (var i = 0; i < els.length; i++) {
          var t = (els[i].value || els[i].textContent || '').replace(/\\s+/g, '');
          if (t.indexOf('保存') >= 0) { btn = els[i]; break; }
        }
      }
      if (!btn) return;
      if (typeof saveData === 'function') saveData(btn, '0');
      else btn.click();
    })();`;
    (document.documentElement || document.head).appendChild(script);
    script.remove();
  }

  /**
   * 填充当前评价页并保存（不提交）
   * @returns {Promise<{ ok: boolean, error?: string, downgraded?: number, questions?: number }>}
   */
  async function fillAndSave(config = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    let pj06xhs = document.getElementsByName('pj06xh');
    for (let i = 0; i < 40 && !pj06xhs.length; i++) {
      await sleep(250);
      pj06xhs = document.getElementsByName('pj06xh');
    }
    const qNums = Array.from(pj06xhs).map((el) => el.value);
    if (!qNums.length) return { ok: false, error: '未找到评教指标' };

    const numDowngrade =
      cfg.minDowngrade +
      Math.floor(Math.random() * (cfg.maxDowngrade - cfg.minDowngrade + 1));
    const downgraded = {};
    let attempts = 0;
    while (Object.keys(downgraded).length < numDowngrade && attempts < 100) {
      downgraded[qNums[Math.floor(Math.random() * qNums.length)]] = true;
      attempts++;
    }

    for (const n of qNums) {
      const opt = downgraded[n] ? 2 : 1;
      const radio = document.getElementById(`pj0601id_${n}_${opt}`);
      if (radio) radio.checked = true;
    }

    const zgpyAll = document.querySelectorAll('input[name="zgpyids"]');
    const positiveIds = shuffle(
      Array.from({ length: Math.min(10, zgpyAll.length) }, (_, i) => i),
    );
    const numPick =
      cfg.minPositive +
      Math.floor(Math.random() * (cfg.maxPositive - cfg.minPositive + 1));
    for (let i = 0; i < numPick && i < positiveIds.length; i++) {
      zgpyAll[positiveIds[i]].checked = true;
    }

    const tas = document.querySelectorAll('textarea[name="jynr"]');
    if (tas.length >= 1 && cfg.improvement) tas[0].value = cfg.improvement;
    if (tas.length >= 2 && cfg.highlights) tas[1].value = cfg.highlights;

    let btn = findSaveButton();
    for (let i = 0; i < 40 && !btn; i++) {
      await sleep(250);
      btn = findSaveButton();
    }
    if (!btn) {
      return { ok: false, error: '未找到保存按钮，请确认已进入评价编辑页' };
    }

    invokeSaveInPage();
    return { ok: true, questions: qNums.length, downgraded: numDowngrade };
  }

  window.BuptEvalFill = { fillAndSave, DEFAULT_CONFIG };
})();
