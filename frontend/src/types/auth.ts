export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
}

export type SignupCredentials = {
  username: string;
  email: string;
  password: string;
  password2: string;
}; 