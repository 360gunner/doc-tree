import api from './apiService';

const userService = {
  // Get all users
  getUsers: async () => {
    const res = await api.authenticated.get('/api/users');
    return res.data;
  },
  // Get one user
  getUser: async (id) => {
    const res = await api.authenticated.get(`/api/users/${id}`);
    return res.data;
  },
  // Create user
  createUser: async ({ username, password, role }) => {
    const res = await api.authenticated.post('/api/users', { username, password, role });
    return res.data;
  },
  // Update user
  updateUser: async (id, updates) => {
    const res = await api.authenticated.patch(`/api/users/${id}`, updates);
    return res.data;
  },
  // Delete user
  deleteUser: async (id) => {
    const res = await api.authenticated.delete(`/api/users/${id}`);
    return res.data;
  },
};

export default userService;
