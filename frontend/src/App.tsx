import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import Login from './components/Login';
import Signup from './components/Signup';
import BoardPage from './pages/BoardPage';
import BoardsPage from './pages/BoardsPage';
import Navbar from './components/Navbar';
import { authService } from './api/auth';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = !!authService.getCurrentUser();
  return isAuthenticated ? (
    <>
      <Navbar />
      {children}
    </>
  ) : (
    <Navigate to="/login" />
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/boards"
          element={
            <PrivateRoute>
              <BoardsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/board"
          element={<Navigate to="/boards" replace />}
        />
        <Route
          path="/board/:boardId"
          element={
            <PrivateRoute>
              <BoardPage />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/boards" />} />
      </Routes>
    </ThemeProvider>
  );
}

// Wrap the entire App with Router
const AppWithRouter = () => (
  <Router>
    <App />
  </Router>
);

export default AppWithRouter;
