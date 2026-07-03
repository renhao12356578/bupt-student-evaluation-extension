/**
 * 课程列表页工具
 * 暴露 window.BuptEvalList
 */
(function () {
  function getListStatus() {
    const links = document.querySelectorAll('a');
    let unevaluated = 0;
    const scores = [];
    const details = [];

    for (const a of links) {
      if (a.textContent.trim() !== '评价') continue;
      const row = a.closest('tr');
      const cells = row ? row.querySelectorAll('td') : [];
      const course = cells.length > 1 ? cells[1].textContent.trim() : '';
      const teacher = cells.length > 2 ? cells[2].textContent.trim() : '';

      if (a.href.includes('zpf=0')) {
        unevaluated++;
        details.push({ course, teacher, score: 0, status: '未评价' });
      } else {
        const m = a.href.match(/zpf=(\d+)/);
        const score = m ? parseInt(m[1], 10) : 0;
        scores.push(score);
        details.push({ course, teacher, score, status: '已评价' });
      }
    }

    return {
      total: unevaluated + scores.length,
      unevaluated,
      evaluated: scores.length,
      minScore: scores.length ? Math.min(...scores) : 0,
      maxScore: scores.length ? Math.max(...scores) : 0,
      details,
    };
  }

  function goNextUnevaluated() {
    for (const a of document.querySelectorAll('a')) {
      if (a.textContent.trim() === '评价' && a.href.includes('zpf=0')) {
        window.location.href = a.href;
        return true;
      }
    }
    return false;
  }

  function enterFromFindPage() {
    for (const a of document.querySelectorAll('a')) {
      const t = a.textContent.trim();
      if (t === '进入评价' || t === '点击进入评价') {
        window.location.href = a.href;
        return true;
      }
    }
    return false;
  }

  function submitAll() {
    const btn = document.getElementById('tj');
    if (!btn) return { ok: false, error: '未找到提交按钮' };
    btn.click();
    return { ok: true };
  }

  function getSubmitStatus() {
    let view = 0;
    let evaluate = 0;
    for (const a of document.querySelectorAll('a')) {
      const t = a.textContent.trim();
      if (t === '查看') view++;
      if (t === '评价') evaluate++;
    }
    return { view, evaluate, hasSubmitBtn: !!document.getElementById('tj') };
  }

  window.BuptEvalList = {
    getListStatus,
    goNextUnevaluated,
    enterFromFindPage,
    submitAll,
    getSubmitStatus,
  };
})();
