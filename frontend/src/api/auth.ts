import axios from 'axios';
import type { LoginCredentials, AuthResponse, SignupCredentials } from '../types/auth';

const API_URL = 'http://localhost:8000/api';

// Set up axios defaults
axios.defaults.baseURL = API_URL;

// Add a request interceptor to add the auth token to requests
axios.interceptors.request.use(
  (config) => {
    const userStr = localStorage.getItem('user');
    console.log('Current user in localStorage:', userStr);
    
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.access) {
          // Make sure we're using the correct format for the Authorization header
          config.headers['Authorization'] = `Bearer ${user.access}`;
          console.log('Setting Authorization header:', config.headers['Authorization']);
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user');
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Log the error details
    console.error('API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      config: originalRequest
    });

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          throw new Error('No refresh token available');
        }

        const user = JSON.parse(userStr);
        if (!user.refresh) {
          throw new Error('No refresh token available');
        }

        console.log('Attempting to refresh token...');
        const response = await axios.post('/token/refresh/', {
          refresh: user.refresh
        });
        
        const { access } = response.data;
        console.log('Token refresh successful');
        
        localStorage.setItem('user', JSON.stringify({ ...user, access }));
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return axios(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async signup(credentials: SignupCredentials): Promise<AuthResponse> {
    try {
      console.log('Attempting signup with:', credentials);
      const response = await axios.post('/auth/register/', credentials);
      console.log('Signup response:', response.data);
      
      if (response.data.access) {
        localStorage.setItem('user', JSON.stringify(response.data));
      }
      return response.data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  },

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('Attempting login with:', credentials);
      const response = await axios.post('/token/', credentials);
      console.log('Login response:', response.data);
      
      if (response.data.access) {
        // Store both access and refresh tokens
        const userData = {
          access: response.data.access,
          refresh: response.data.refresh
        };
        console.log('Storing user data:', userData);
        
        // Store the data in localStorage
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Verify the data was stored correctly
        const storedData = localStorage.getItem('user');
        console.log('Stored user data:', storedData);
        
        // Set the default Authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
        
        // Verify the header was set
        console.log('Authorization header set to:', axios.defaults.headers.common['Authorization']);

        // Wait a moment to ensure localStorage is updated
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Double check the data is still there
        const finalCheck = localStorage.getItem('user');
        console.log('Final check of stored user data:', finalCheck);
        
        if (!finalCheck) {
          throw new Error('Failed to persist authentication data');
        }
      } else {
        throw new Error('No access token received');
      }
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      // Clear any partial data
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Invalid username or password');
        }
        if (error.code === 'ERR_NETWORK') {
          throw new Error('Cannot connect to server. Please make sure the backend is running.');
        }
        throw new Error(error.response?.data?.detail || 'Login failed');
      }
      throw error;
    }
  },

  logout(): void {
    console.log('Logging out...');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    window.location.href = '/login';
  },

  getCurrentUser(): AuthResponse | null {
    const userStr = localStorage.getItem('user');
    console.log('Getting current user:', userStr);
    
    if (!userStr) {
      console.log('No user data found in localStorage');
      return null;
    }
    
    try {
      const user = JSON.parse(userStr);
      console.log('Parsed user data:', user);
      
      // Check if token is expired
      if (user.access) {
        const payload = JSON.parse(atob(user.access.split('.')[1]));
        console.log('Token payload:', payload);
        if (payload.exp * 1000 < Date.now()) {
          console.log('Token expired, logging out...');
          this.logout();
          return null;
        }
      } else {
        console.log('No access token found in user data');
        return null;
      }
      return user;
    } catch (error) {
      console.error('Error parsing user data:', error);
      this.logout();
      return null;
    }
  },

  getAuthHeader(): { Authorization: string } | {} {
    const user = this.getCurrentUser();
    if (user?.access) {
      return { Authorization: `Bearer ${user.access}` };
    }
    return {};
  },

  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }
}; 