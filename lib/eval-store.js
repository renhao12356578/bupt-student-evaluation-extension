/**
 * content script 通过 background 读写 storage（避免 iframe / document_start 无权限）
 */
(function () {
  async function get(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    return chrome.runtime.sendMessage({ type: 'EVAL_STORE_GET', keys: list });
  }

  async function set(data) {
    return chrome.runtime.sendMessage({ type: 'EVAL_STORE_SET', data });
  }

  async function remove(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    return chrome.runtime.sendMessage({ type: 'EVAL_STORE_REMOVE', keys: list });
  }

  window.BuptEvalStore = { get, set, remove };
})();
