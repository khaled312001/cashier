const BASE_URL = window.api?.baseURL || 'http://localhost:3001/api';

const api = {
  async request(method, endpoint, data = null) {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = { method, headers };
    if (data) config.body = JSON.stringify(data);

    const res = await fetch(`${BASE_URL}${endpoint}`, config);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'حدث خطأ');
    return { data: json };
  },
  get: (endpoint) => api.request('GET', endpoint),
  post: (endpoint, data) => api.request('POST', endpoint, data),
  put: (endpoint, data) => api.request('PUT', endpoint, data),
  patch: (endpoint, data) => api.request('PATCH', endpoint, data),
  delete: (endpoint) => api.request('DELETE', endpoint),
};

export default api;
