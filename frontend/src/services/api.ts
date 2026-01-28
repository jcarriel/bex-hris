import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

class ApiClient {
  client: any;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include token
    this.client.interceptors.request.use((config: any) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // No establecer Content-Type si es FormData (dejar que el navegador lo maneje)
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
        // Asegurar que no haya transformación de datos
        config.transformRequest = [(data: any) => data];
      }
      
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response: any) => response,
      (error: any) => {
        if (error.response?.status === 401) {
          // Clear token and redirect to login
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(username: string, email: string, password: string, confirmPassword: string) {
    return this.client.post('/auth/register', {
      username,
      email,
      password,
      confirmPassword,
    });
  }

  async login(username: string, password: string) {
    return this.client.post('/auth/login', {
      username,
      password,
    });
  }

  async changePassword(oldPassword: string, newPassword: string, confirmPassword: string) {
    return this.client.post('/auth/change-password', {
      oldPassword,
      newPassword,
      confirmPassword,
    });
  }

  // Employee endpoints
  async createEmployee(employeeData: any) {
    return this.client.post('/employees', employeeData);
  }

  async getEmployee(id: string) {
    return this.client.get(`/employees/${id}`);
  }

  async getEmployees(page: number = 1, limit: number = 10, filters?: any) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });
    return this.client.get(`/employees?${params}`);
  }

  async updateEmployee(id: string, data: any) {
    return this.client.put(`/employees/${id}`, data);
  }

  async deleteEmployee(id: string) {
    return this.client.delete(`/employees/${id}`);
  }

  async terminateEmployee(id: string, terminationDate: string, reason: string) {
    return this.client.post(`/employees/${id}/terminate`, {
      terminationDate,
      reason,
    });
  }

  async getExpiringContracts(days: number = 30) {
    return this.client.get(`/employees/contracts/expiring?days=${days}`);
  }
}

export default new ApiClient();
