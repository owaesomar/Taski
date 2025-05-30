import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { authService } from '../api/auth';

const Navbar: React.FC = () => {
  const handleLogout = () => {
    authService.logout();
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Taski
        </Typography>
        <Box>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 