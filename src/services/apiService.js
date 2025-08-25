import axios from 'axios';

// Set API base URL for all requests
const API_BASE = 'http://localhost:7689';

// Create axios instance with base URL and default headers
const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Add a request interceptor to inject token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('archiveToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth service
const authService = {
  login: async (username, password) => {
    const res = await api.post('/api/login', { username, password });
    if (!res.data || !res.data.token) throw new Error('Invalid username or password');
    // Save token in localStorage if present
    if (res.data.token) {
      localStorage.setItem('archiveToken', res.data.token);
    }
    // Persist full user object (with roles) for session continuity
    localStorage.setItem('archiveUser', JSON.stringify(res.data));
    return { success: true, user: { ...res.data } };
  },
  logout: async () => {
    localStorage.removeItem('archiveToken');
    return { success: true };
  },
  getCurrentUser: async () => {
    // Try to get token from localStorage
    const token = localStorage.getItem('archiveToken');
    if (!token) return null;
    try {
      const res = await api.get('/api/me', { headers: { Authorization: `Bearer ${token}` } });
      // Attach token to user object for persistence
      return { ...res.data, token };
    } catch (err) {
      localStorage.removeItem('archiveToken');
      return null;
    }
  },
  register: async (username, password, role = 'user') => {
    const res = await api.post('/api/register', { username, password, role });
    if (!res.data || !res.data.success) throw new Error('Registration failed');
    return { success: true };
  },
  // Optional helper to register with multiple roles
  registerWithRoles: async (username, password, roles = []) => {
    const res = await api.post('/api/register', { username, password, roles });
    if (!res.data || !res.data.success) throw new Error('Registration failed');
    return { success: true };
  }
};

// Organigram service (NEW: tree-based)
const organigramService = {
  // Get organigram as a tree
  getTree: async () => {
    const res = await api.get('/api/organigram/tree');
    return res.data;
  },
  // Create a node
  createNode: async ({ name, parent, type }) => {
    const res = await api.post('/api/organigram/nodes', { name, parent, type });
    return res.data;
  },
  // Update a node
  updateNode: async (id, updates) => {
    const res = await api.patch(`/api/organigram/nodes/${id}`, updates);
    return res.data;
  },
  // Delete a node
  deleteNode: async (id) => {
    const res = await api.delete(`/api/organigram/nodes/${id}`);
    return res.data;
  },
  // Upload file to node
  uploadFile: async (id, fileUrl) => {
    const res = await api.post(`/api/organigram/nodes/${id}/upload`, { fileUrl });
    return res.data;
  },
  // Get missing nodes (nodes with no file)
  getMissing: async () => {
    const res = await api.get('/api/organigram/missing');
    return res.data;
  },
  // Get progress (percent completed)
  getProgress: async () => {
    const res = await api.get('/api/organigram/progress');
    return res.data;
  },
  // Share/unshare a node
  shareNode: async (id, { enabled = true, expiresInHours = 168, password } = {}) => {
    const payload = { enabled, expiresInHours };
    if (typeof password === 'string' && password.length > 0) payload.password = password;
    const res = await api.post(`/api/organigram/nodes/${id}/share`, payload);
    return res.data;
  },
  // Fetch public node by token (optionally with password)
  getPublicByToken: async (token, password) => {
    const config = password ? { headers: { 'X-Share-Password': password } } : undefined;
    const res = await axios.get(`${API_BASE}/api/public/organigram/${token}`, config);
    return res.data;
  },
};

// Archive service
const archiveService = {
  getCategories: async (asTree = false) => {
    const url = asTree ? '/api/categories/tree' : '/api/categories';
    const res = await api.get(url);
    if (!res.data) throw new Error('Failed to fetch categories');
    return { success: true, data: res.data };
  },
  createCategory: async ({ name, parent }) => {
    const res = await api.post('/api/categories', { name, parent });
    if (!res.data) throw new Error('Failed to create category');
    return { success: true, data: res.data };
  },
  addDocument: async ({ category, name, reference, fileUrls }) => {
    // Always send year, name, reference, and fileUrls if available
    const year = new Date().getFullYear();
    const payload = { category, year, name, reference, fileUrls };
    const res = await api.post('/api/categories/addDocument', payload);
    if (!res.data) throw new Error('Failed to add document');
    return { success: true, data: res.data };
  },
  async getDocuments({ categoryId = null, page = 1, pageSize = 10, filters = {} } = {}) {
    let url = categoryId ? `/api/documents?category=${categoryId}` : '/api/documents';
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('pageSize', pageSize);
    // Only append filter keys that are not 'category' or 'categories'
    Object.entries(filters).forEach(([key, value]) => {
      if (value && key !== 'category' && key !== 'categories') params.append(key, value);
    });
    // Only append categories if not already specified in URL
    if (!categoryId && filters.categories && Array.isArray(filters.categories) && filters.categories.length > 0) {
      filters.categories.forEach(id => params.append('categories', id));
    } else if (!categoryId && filters.category) {
      params.append('category', filters.category);
    }
    if (url.includes('?')) {
      url += `&${params.toString()}`;
    } else {
      url += `?${params.toString()}`;
    }
    try {
      const response = await api.get(url);
      return response;
    } catch (error) {
      throw error;
    }
  },
  async deleteDocument(documentId) {
    try {
      const url = `/api/documents/${documentId}`;
      console.log('[apiService] deleteDocument fetch url:', url);
      const response = await api.delete(url);
      console.log('[apiService] deleteDocument fetch response:', response);
      return { success: true };
    } catch (error) {
      console.error('[apiService] deleteDocument error:', error);
      throw error;
    }
  },
  async updateDocument(documentId, updates) {
    const res = await api.patch(`/api/documents/${documentId}`, updates);
    return { success: true, data: res.data };
  },
  // Share/unshare a document (dossier)
  async shareDocument(documentId, { enabled = true, expiresInHours = 168, password } = {}) {
    const payload = { enabled, expiresInHours };
    if (typeof password === 'string' && password.length > 0) payload.password = password;
    const res = await api.post(`/api/documents/${documentId}/share`, payload);
    return res.data;
  },
  // Fetch public document by token (no auth)
  async getPublicDocument(token, password) {
    const config = password ? { headers: { 'X-Share-Password': password } } : undefined;
    const res = await axios.get(`${API_BASE}/api/public/document/${token}`, config);
    return res.data;
  },
  // --- category update/delete ---
  async updateCategory(categoryId, data) {
    const res = await api.patch(`/api/categories/${categoryId}`, data);
    return res;
  },
  async deleteCategory(categoryId) {
    const res = await api.delete(`/api/categories/${categoryId}`);
    return res;
  },
};

// Search service
const searchService = {
  async organigram(q) {
    const res = await api.get(`/api/search/organigram`, { params: { q } });
    return res.data;
  },
  async documents(q) {
    const res = await api.get(`/api/search/documents`, { params: { q } });
    return res.data;
  }
};

// Global Settings service
const globalSettingsService = {
  getGlobalSettings: async () => {
    const res = await api.get('/api/global-settings');
    return res.data;
  },
  updateGlobalSettings: async ({ companyName, companyLogo, referenceFormat }) => {
    const res = await api.put('/api/global-settings', { companyName, companyLogo, referenceFormat });
    return res.data;
  }
};

// Add a cache for global settings
let cachedGlobalSettings = null;
let lastFetched = 0;
const getCachedGlobalSettings = async (force = false) => {
  const now = Date.now();
  if (!force && cachedGlobalSettings && now - lastFetched < 60000) {
    return cachedGlobalSettings;
  }
  const settings = await globalSettingsService.getGlobalSettings();
  cachedGlobalSettings = settings;
  lastFetched = now;
  return settings;
};

// Authenticated axios for admin/user endpoints
const authenticated = {
  get: (url) => api.get(url),
  post: (url, data) => api.post(url, data),
  patch: (url, data) => api.patch(url, data),
  delete: (url) => api.delete(url),
};

const apiService = {
  auth: authService,
  organigram: organigramService,
  archive: archiveService,
  search: searchService,
  uploadFiles: async (files) => {
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('files', file));
    const res = await axios.post('http://localhost:7689/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.filePaths.split(',');
  },
  authenticated,
  getGlobalSettings: globalSettingsService.getGlobalSettings,
  updateGlobalSettings: globalSettingsService.updateGlobalSettings,
  getCachedGlobalSettings,
};

export default apiService;
