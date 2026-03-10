import axios from 'axios';

// Development URL (FastAPI default)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const salesApi = {
  /**
   * Fetch all delivered sales for the dashboard
   */
  getSales: async () => {
    try {
      // Assuming a GET /api/sales endpoint exists or will exist in FastAPI
      const response = await axios.get(`${API_BASE_URL}/api/sales`);
      return response.data;
    } catch (error) {
      console.error("Error fetching sales:", error);
      throw error;
    }
  },

  /**
   * Create a new manual sale record
   */
  createSale: async (saleData) => {
    try {
      // Assuming a POST /api/sales endpoint exists or will exist in FastAPI
      const response = await axios.post(`${API_BASE_URL}/api/sales/manual`, saleData);
      return response.data;
    } catch (error) {
      console.error("Error creating manual sale:", error);
      throw error;
    }
  },
  
  /**
   * Upload CSV file
   */
  uploadCsv: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API_BASE_URL}/api/sales/upload-csv`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error uploading CSV:", error);
      throw error;
    }
  },
  
  /**
   * Update an existing sale
   */
  updateSale: async (id, saleData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/sales/${id}`, saleData);
      return response.data;
    } catch (error) {
      console.error("Error updating sale:", error);
      throw error;
    }
  },

  /**
   * Delete a sale
   */
  deleteSale: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/sales/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error deleting sale:", error);
      throw error;
    }
  }
};
