import api from './apiService';

const categoryService = {
  getCategories: async () => {
    const res = await api.authenticated.get('/api/categories');
    return res.data;
  },
};

export default categoryService;
