/**
 * 自动消化 alert/confirm，避免 saveData 后阻塞（与 Playwright dialog.accept 一致）
 */
(function () {
  if (window.__buptEvalDialogHooked) return;
  window.__buptEvalDialogHooked = true;

  const origAlert = window.alert;
  const origConfirm = window.confirm;

  window.alert = function (msg) {
    console.info('[BUPT评教] alert:', msg);
    return undefined;
  };

  window.confirm = function (msg) {
    console.info('[BUPT评教] confirm:', msg);
    return true;
  };

  window.__buptEvalRestoreDialog = function () {
    window.alert = origAlert;
    window.confirm = origConfirm;
    window.__buptEvalDialogHooked = false;
  };
})();
