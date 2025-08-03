import api from './apiService';

const organigramService = {
  // Fetches the organigram tree structure (nested)
  getTree: async () => {
    const res = await api.authenticated.get('/api/organigram/tree');
    return res.data;
  },
  // Optionally keep getNodes for flat list if needed elsewhere
  getNodes: async () => {
    const res = await api.authenticated.get('/api/organigram/nodes');
    return res.data;
  },
};

export default organigramService;
