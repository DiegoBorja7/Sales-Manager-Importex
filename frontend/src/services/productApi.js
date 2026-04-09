import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');

export const productApi = {
  getProducts: async (page = 1, limit = 50, params = {}) => {
    // Para simplificar: si params.nopage === true, trae la lista en bruto para los modales
    const queryString = new URLSearchParams();
    if (params.nopage) {
        queryString.append('nopage', 'true');
    } else {
        queryString.append('page', page);
        queryString.append('limit', limit);
        if (params.search) queryString.append('search', params.search);
        if (params.sort) queryString.append('sort', params.sort);
    }
    
    const response = await axios.get(`${API_BASE_URL}/api/products?${queryString.toString()}`);
    return response.data;
  },

  createProduct: async (productData) => {
    const response = await axios.post(`${API_BASE_URL}/api/products`, productData);
    return response.data;
  },

  updateProduct: async (id, productData) => {
    const response = await axios.put(`${API_BASE_URL}/api/products/${id}`, productData);
    return response.data;
  },

  adjustStock: async (id, quantity, reason) => {
    const response = await axios.put(`${API_BASE_URL}/api/products/${id}/stock`, { quantity, reason });
    return response.data;
  },

  getMovements: async (id) => {
    const response = await axios.get(`${API_BASE_URL}/api/products/${id}/movements`);
    return response.data;
  },

  deleteProduct: async (id) => {
    const response = await axios.delete(`${API_BASE_URL}/api/products/${id}`);
    return response.data;
  }
};
