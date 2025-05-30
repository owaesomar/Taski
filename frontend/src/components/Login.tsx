import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Alert,
  Link,
} from '@mui/material';
import { authService } from '../api/auth';
import type { LoginCredentials } from '../types/auth';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: ''
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Check if user is already logged in
  useEffect(() => {
    console.log('Checking authentication status...');
    const isAuth = authService.isAuthenticated();
    console.log('Is authenticated:', isAuth);
    if (isAuth) {
      console.log('User is authenticated, redirecting to boards...');
      navigate('/boards');
    }
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    console.log(`Updating ${name} field:`, value);
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with credentials:', credentials);
    setError('');
    setLoading(true);

    try {
      console.log('Attempting login with:', credentials);
      const response = await authService.login(credentials);
      console.log('Login response:', response);
      
      if (response.access) {
        console.log('Login successful, redirecting to boards...');
        // Successful login - redirect to boards page
        navigate('/boards', { replace: true });
      } else {
        console.error('Invalid response from server - no access token');
        setError('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(
        error.response?.data?.detail || 
        error.message || 
        'Failed to login. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Sign in
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box 
          component="form" 
          onSubmit={handleSubmit} 
          sx={{ mt: 1 }}
          noValidate
        >
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoComplete="username"
            autoFocus
            value={credentials.username}
            onChange={handleChange}
            disabled={loading}
            error={!!error}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={credentials.password}
            onChange={handleChange}
            disabled={loading}
            error={!!error}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
          <Box sx={{ textAlign: 'center' }}>
            <Link component={RouterLink} to="/signup" variant="body2">
              {"Don't have an account? Sign Up"}
            </Link>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default Login; 