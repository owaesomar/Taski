import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Grid,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import boardService from '../api/board';
import type { Board } from '../api/board';
import { authService } from '../api/auth';

const BoardsPage: React.FC = () => {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Check if user is logged in
    const user = authService.getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }
    console.log('Auth header:', authService.getAuthHeader());
    fetchBoards();
  }, [navigate]);

  const fetchBoards = async () => {
    try {
      const response = await boardService.getBoards();
      setBoards(response);
      setError('');
    } catch (error: any) {
      console.error('Error fetching boards:', error);
      setError(error.response?.data?.detail || 'Failed to fetch boards');
      if (error.response?.status === 403) {
        // If unauthorized, redirect to login
        navigate('/login');
      }
    }
  };

  const handleCreateBoard = async () => {
    if (!newBoardTitle.trim()) return;

    setLoading(true);
    try {
      const newBoard = await boardService.createBoard({
        title: newBoardTitle.trim(),
        description: ''
      });
      setBoards([...boards, newBoard]);
      setOpenDialog(false);
      setNewBoardTitle('');
      navigate(`/board/${newBoard.id}`);
    } catch (error: any) {
      console.error('Error creating board:', error);
      setError(error.response?.data?.detail || 'Failed to create board');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">My Boards</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Create Board
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {boards.map((board) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={board.id}>
            <Card
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: 6,
                },
              }}
              onClick={() => navigate(`/board/${board.id}`)}
            >
              <CardContent>
                <Typography variant="h6">{board.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {board.lists?.length || 0} lists
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Create New Board</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Board Title"
            fullWidth
            value={newBoardTitle}
            onChange={(e) => setNewBoardTitle(e.target.value)}
            disabled={loading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateBoard}
            variant="contained"
            disabled={loading || !newBoardTitle.trim()}
          >
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BoardsPage; 