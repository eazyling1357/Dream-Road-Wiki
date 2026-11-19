/**
 * Dream Road Wiki — public API client
 */
(function () {
  const API_BASE = window.DRW_API_BASE || '/api';
  async function request(path, options) {
    options = options || {};
    const headers = Object.assign({ Accept: 'application/json' }, options.headers || {});
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    if (window.DRW_AUTH && DRW_AUTH.getToken()) headers.Authorization = 'Bearer ' + DRW_AUTH.getToken();
    const res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
    if (res.status === 204) return null;
    const text = await res.text();
    let data = null;
    if (text) { try { data = JSON.parse(text); } catch { data = { raw: text }; } }
    if (!res.ok) {
      const err = new Error((data && data.error) || res.statusText || 'API error');
      err.status = res.status; err.data = data; throw err;
    }
    return data;
  }
  async function health() { try { return await request('/health'); } catch { return null; } }
  async function isOnline() { const h = await health(); return !!(h && h.ok); }
  window.DRW_API = {
    request, health, isOnline,
    getCars: function () { return request('/cars'); },
    getNews: function () { return request('/news'); },
    getGuides: function () { return request('/guides'); },
    getStats: function () { return request('/stats'); },
    API_BASE
  };
})();
