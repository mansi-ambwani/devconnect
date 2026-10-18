// Small wrapper around fetch for talking to the DevConnect API.
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

const TOKEN_KEY = 'devconnect_token';

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t) => {
    try {
      t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
  },
};

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  const token = tokenStore.get();
  let res;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, `Can't reach the server at ${API_URL}. Check that the API is running.`);
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || `Request failed (${res.status})`);
  return data;
}

const qs = (params) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
  return s ? `?${s}` : '';
};

export const api = {
  register: (d) => request('POST', '/auth/register', d),
  login: (d) => request('POST', '/auth/login', d),
  me: () => request('GET', '/auth/me'),

  listUsers: (p = {}) => request('GET', `/users${qs(p)}`),
  getUser: (username) => request('GET', `/users/${encodeURIComponent(username)}`),
  updateMe: (d) => request('PUT', '/users/me', d),

  listPosts: (p = {}) => request('GET', `/posts${qs(p)}`),
  tags: () => request('GET', '/posts/tags'),
  myPosts: () => request('GET', '/posts/mine'),
  getPost: (slug) => request('GET', `/posts/${encodeURIComponent(slug)}`),
  createPost: (d) => request('POST', '/posts', d),
  updatePost: (id, d) => request('PUT', `/posts/${id}`, d),
  deletePost: (id) => request('DELETE', `/posts/${id}`),
};
