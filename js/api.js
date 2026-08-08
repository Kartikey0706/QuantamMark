(function () {
  if (window.QuantumMarkAPI) {
    return;
  }

  const DEFAULT_API_BASE_URL = 'https://quantummark-backend.onrender.com';
  const API_BASE_URL = window.__QUANTUMMARK_API_BASE_URL__ || DEFAULT_API_BASE_URL;

  function apiUrl(path) {
    return new URL(path, API_BASE_URL).toString();
  }

  async function apiFetch(path, options = {}) {
    return fetch(apiUrl(path), {
      mode: 'cors',
      ...options,
    });
  }

  async function readResponseBody(response) {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        return await response.json();
      } catch (error) {
        return null;
      }
    }

    try {
      return await response.text();
    } catch (error) {
      return null;
    }
  }

  async function apiJson(path, options = {}) {
    const response = await apiFetch(path, options);
    const body = await readResponseBody(response);

    if (!response.ok) {
      const message = body && typeof body === 'object' && body.error
        ? body.error
        : `Request failed with status ${response.status}`;
      const error = new Error(message);
      error.response = response;
      error.body = body;
      throw error;
    }

    return { response, body };
  }

  async function apiHealth() {
    return apiJson('/health');
  }

  window.QuantumMarkAPI = {
    API_BASE_URL,
    apiUrl,
    apiFetch,
    apiJson,
    apiHealth,
  };
})();