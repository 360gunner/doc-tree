import api from './apiService';

const roleService = {
  getRoles: async () => {
    const res = await api.authenticated.get('/api/roles');
    return res.data;
  },
  getRole: async (id) => {
    const res = await api.authenticated.get(`/api/roles/${id}`);
    return res.data;
  },
  createRole: async (role) => {
    const res = await api.authenticated.post('/api/roles', role);
    return res.data;
  },
  updateRole: async (id, updates) => {
    const res = await api.authenticated.patch(`/api/roles/${id}`, updates);
    return res.data;
  },
  deleteRole: async (id) => {
    const res = await api.authenticated.delete(`/api/roles/${id}`);
    return res.data;
  },
};

export default roleService;
