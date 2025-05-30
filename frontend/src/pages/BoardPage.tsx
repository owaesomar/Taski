import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import type { DropResult } from 'react-beautiful-dnd';
import { 
  Box, 
  Paper, 
  Typography, 
  Card, 
  CardContent, 
  TextField, 
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import axios from 'axios';
import { authService } from '../api/auth';
import { useParams } from 'react-router-dom';

interface Card {
  id: string;
  title: string;
  description: string;
}

interface List {
  id: string;
  title: string;
  cards: Card[];
}

const BoardPage: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const [lists, setLists] = useState<List[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedList, setSelectedList] = useState<string>('');
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDescription, setNewCardDescription] = useState('');
  const [openListDialog, setOpenListDialog] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [editCardTitle, setEditCardTitle] = useState('');
  const [editCardDescription, setEditCardDescription] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [openEditListDialog, setOpenEditListDialog] = useState(false);
  const [editingList, setEditingList] = useState<List | null>(null);
  const [editListTitle, setEditListTitle] = useState('');
  const [listAnchorEl, setListAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedListForMenu, setSelectedListForMenu] = useState<List | null>(null);

  useEffect(() => {
    if (!boardId) return;

    // Get the access token from localStorage
    const userData = localStorage.getItem('user');
    if (!userData) {
      console.error('No user data found');
      return;
    }

    const { access } = JSON.parse(userData);
    if (!access) {
      console.error('No access token found');
      return;
    }

    // Get the current protocol (http/https) and use the corresponding ws protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = '8000'; // Your backend port

    // Initialize WebSocket connection with board ID and token
    const websocket = new WebSocket(`${protocol}//${host}:${port}/ws/board/${boardId}/?token=${access}`);
    
    websocket.onopen = () => {
      console.log('WebSocket Connected');
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        // Handle real-time updates
        if (data.type === 'card_update') {
          fetchLists();
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      // Try to reconnect after a delay
      setTimeout(() => {
        if (websocket.readyState === WebSocket.CLOSED) {
          console.log('Attempting to reconnect...');
          const userData = localStorage.getItem('user');
          if (userData) {
            const { access } = JSON.parse(userData);
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname;
            const port = '8000';
            const newWebsocket = new WebSocket(`${protocol}//${host}:${port}/ws/board/${boardId}/?token=${access}`);
            setWs(newWebsocket);
          }
        }
      }, 5000);
    };

    websocket.onclose = (event) => {
      console.log('WebSocket Disconnected:', event.code, event.reason);
      // Try to reconnect after a delay
      setTimeout(() => {
        if (websocket.readyState === WebSocket.CLOSED) {
          console.log('Attempting to reconnect...');
          const userData = localStorage.getItem('user');
          if (userData) {
            const { access } = JSON.parse(userData);
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname;
            const port = '8000';
            const newWebsocket = new WebSocket(`${protocol}//${host}:${port}/ws/board/${boardId}/?token=${access}`);
            setWs(newWebsocket);
          }
        }
      }, 5000);
    };

    setWs(websocket);

    // Initial fetch of lists
    fetchLists();

    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, [boardId]);

  const fetchLists = async () => {
    if (!boardId) return;
    
    try {
      const response = await axios.get(`http://localhost:8000/api/lists/`, {
        headers: authService.getAuthHeader(),
        params: { board: boardId }
      });
      console.log('Fetched lists:', response.data);
      setLists(response.data);
    } catch (error) {
      console.error('Error fetching lists:', error);
    }
  };

  const onDragEnd = (result: DropResult) => {
    console.log('Drag end result:', result);
    const { destination, source, draggableId, type } = result;

    if (!destination) {
      console.log('No destination found');
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      console.log('Same position, no update needed');
      return;
    }

    // Handle list reordering
    if (type === 'list') {
      console.log('Handling list reorder');
      const newLists = Array.from(lists);
      const [movedList] = newLists.splice(source.index, 1);
      newLists.splice(destination.index, 0, movedList);
      setLists(newLists);

      try {
        axios.patch(
          `http://localhost:8000/api/lists/${movedList.id}/move/`,
          {
            new_position: destination.index
          },
          {
            headers: authService.getAuthHeader()
          }
        );
      } catch (error) {
        console.error('Error updating list position:', error);
        fetchLists();
      }
      return;
    }

    // Handle card reordering
    console.log('Handling card reorder');
    console.log('Current lists:', lists);
    console.log('Source droppableId:', source.droppableId);
    console.log('Destination droppableId:', destination.droppableId);
    
    const newLists = Array.from(lists);
    
    // Extract list IDs from the droppableIds
    const sourceListId = source.droppableId.replace('list-', '');
    const destListId = destination.droppableId.replace('list-', '');
    
    console.log('Extracted source list ID:', sourceListId);
    console.log('Extracted destination list ID:', destListId);
    
    const sourceList = newLists.find(list => String(list.id) === sourceListId);
    const destList = newLists.find(list => String(list.id) === destListId);
    
    console.log('Found source list:', sourceList);
    console.log('Found destination list:', destList);
    
    if (!sourceList || !destList) {
      console.log('Source or destination list not found');
      return;
    }

    // Extract card ID from the draggableId
    const cardId = draggableId.replace('card-', '');
    console.log('Extracted card ID:', cardId);
    
    const [movedCard] = sourceList.cards.splice(source.index, 1);
    destList.cards.splice(destination.index, 0, movedCard);

    setLists(newLists);

    try {
      // First update the card's list
      axios.patch(
        `http://localhost:8000/api/cards/${cardId}/`,
        {
          list: destListId,
          position: destination.index
        },
        {
          headers: authService.getAuthHeader()
        }
      ).catch(error => {
        console.error('Error updating card position:', error);
        fetchLists();
      });
    } catch (error) {
      console.error('Error updating card position:', error);
      fetchLists();
    }
  };

  const handleCreateCard = async () => {
    if (!selectedList || !newCardTitle.trim()) return;

    try {
      const response = await axios.post(
        `http://localhost:8000/api/cards/`,
        {
          title: newCardTitle.trim(),
          description: newCardDescription.trim(),
          list: selectedList
        },
        {
          headers: authService.getAuthHeader()
        }
      );

      // Update the lists with the new card
      const updatedLists = lists.map(list => {
        if (list.id === selectedList) {
          return {
            ...list,
            cards: [...list.cards, response.data]
          };
        }
        return list;
      });
      setLists(updatedLists);

      // Reset form and close dialog
      setNewCardTitle('');
      setNewCardDescription('');
      setOpenDialog(false);
    } catch (error) {
      console.error('Error creating card:', error);
    }
  };

  const handleCreateList = async () => {
    if (!boardId || !newListTitle.trim()) return;

    try {
      const response = await axios.post(
        `http://localhost:8000/api/lists/`,
        {
          title: newListTitle.trim(),
          board: boardId
        },
        {
          headers: authService.getAuthHeader()
        }
      );

      setLists([...lists, response.data]);
      setNewListTitle('');
      setOpenListDialog(false);
    } catch (error) {
      console.error('Error creating list:', error);
    }
  };

  const handleEditCard = async () => {
    if (!editingCard || !editCardTitle.trim()) return;

    try {
      const response = await axios.patch(
        `http://localhost:8000/api/cards/${editingCard.id}/`,
        {
          title: editCardTitle.trim(),
          description: editCardDescription.trim()
        },
        {
          headers: authService.getAuthHeader()
        }
      );

      // Update the lists with the edited card
      const updatedLists = lists.map(list => ({
        ...list,
        cards: list.cards.map(card => 
          card.id === editingCard.id ? response.data : card
        )
      }));
      setLists(updatedLists);

      // Reset form and close dialog
      setEditCardTitle('');
      setEditCardDescription('');
      setOpenEditDialog(false);
      setEditingCard(null);
    } catch (error) {
      console.error('Error editing card:', error);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      await axios.delete(
        `http://localhost:8000/api/cards/${cardId}/`,
        {
          headers: authService.getAuthHeader()
        }
      );

      // Update the lists by removing the deleted card
      const updatedLists = lists.map(list => ({
        ...list,
        cards: list.cards.filter(card => card.id !== cardId)
      }));
      setLists(updatedLists);

      // Close the menu
      setAnchorEl(null);
      setSelectedCard(null);
    } catch (error) {
      console.error('Error deleting card:', error);
    }
  };

  const handleOpenEditDialog = (card: Card) => {
    setEditingCard(card);
    setEditCardTitle(card.title);
    setEditCardDescription(card.description);
    setOpenEditDialog(true);
    setAnchorEl(null);
    setSelectedCard(null);
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, card: Card) => {
    setAnchorEl(event.currentTarget);
    setSelectedCard(card);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedCard(null);
  };

  const handleEditList = async () => {
    if (!editingList || !editListTitle.trim()) return;

    try {
      const response = await axios.patch(
        `http://localhost:8000/api/lists/${editingList.id}/`,
        {
          title: editListTitle.trim()
        },
        {
          headers: authService.getAuthHeader()
        }
      );

      // Update the lists with the edited list
      const updatedLists = lists.map(list => 
        list.id === editingList.id ? response.data : list
      );
      setLists(updatedLists);

      // Reset form and close dialog
      setEditListTitle('');
      setOpenEditListDialog(false);
      setEditingList(null);
    } catch (error) {
      console.error('Error editing list:', error);
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      await axios.delete(
        `http://localhost:8000/api/lists/${listId}/`,
        {
          headers: authService.getAuthHeader()
        }
      );

      // Update the lists by removing the deleted list
      const updatedLists = lists.filter(list => list.id !== listId);
      setLists(updatedLists);

      // Close the menu
      setListAnchorEl(null);
      setSelectedListForMenu(null);
    } catch (error) {
      console.error('Error deleting list:', error);
    }
  };

  const handleOpenEditListDialog = (list: List) => {
    setEditingList(list);
    setEditListTitle(list.title);
    setOpenEditListDialog(true);
    setListAnchorEl(null);
    setSelectedListForMenu(null);
  };

  const handleOpenListMenu = (event: React.MouseEvent<HTMLElement>, list: List) => {
    event.stopPropagation();
    setListAnchorEl(event.currentTarget);
    setSelectedListForMenu(list);
  };

  const handleCloseListMenu = () => {
    setListAnchorEl(null);
    setSelectedListForMenu(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Task Board</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenListDialog(true)}
        >
          Add List
        </Button>
      </Box>

      <DragDropContext onDragEnd={onDragEnd}>
        <Box sx={{ width: '100%', minHeight: 'calc(100vh - 200px)' }}>
          <Droppable droppableId="board-lists" direction="horizontal" type="list">
            {(provided) => (
              <Box
                ref={provided.innerRef}
                {...provided.droppableProps}
                sx={{ 
                  display: 'flex', 
                  gap: 2, 
                  overflowX: 'auto', 
                  pb: 2,
                  minHeight: '100%',
                  width: '100%',
                  '&::-webkit-scrollbar': {
                    height: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: '#f1f1f1',
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: '#888',
                    borderRadius: '4px',
                    '&:hover': {
                      background: '#555',
                    },
                  },
                }}
              >
                {lists.map((list, index) => (
                  <Draggable
                    key={list.id}
                    draggableId={`list-${list.id}`}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <Paper
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        sx={{
                          minWidth: 300,
                          maxWidth: 300,
                          p: 2,
                          backgroundColor: snapshot.isDragging ? '#e3f2fd' : '#f5f5f5',
                          transition: 'all 0.2s ease',
                          height: 'fit-content',
                          flexShrink: 0,
                          boxShadow: snapshot.isDragging ? 3 : 1,
                          transform: snapshot.isDragging ? 'scale(1.02)' : 'none',
                        }}
                      >
                        <Box 
                          {...provided.dragHandleProps}
                          sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            mb: 2,
                            cursor: 'grab',
                            '&:active': {
                              cursor: 'grabbing'
                            },
                            p: 1,
                            borderRadius: 1,
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <DragIndicatorIcon sx={{ color: 'text.secondary' }} />
                            <Typography variant="h6">
                              {list.title}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <IconButton 
                              size="small" 
                              onClick={() => {
                                setSelectedList(list.id);
                                setOpenDialog(true);
                              }}
                            >
                              <AddIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => handleOpenListMenu(e, list)}
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </Box>
                        </Box>
                        <Droppable droppableId={`list-${list.id}`} type="card">
                          {(provided) => (
                            <Box
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              sx={{ 
                                minHeight: 100,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1,
                                p: 1,
                                borderRadius: 1,
                                backgroundColor: 'rgba(0, 0, 0, 0.02)',
                              }}
                            >
                              {list.cards.map((card, index) => (
                                <Draggable
                                  key={card.id}
                                  draggableId={`card-${card.id}`}
                                  index={index}
                                >
                                  {(provided, snapshot) => (
                                    <Card
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      sx={{ 
                                        mb: 1,
                                        backgroundColor: snapshot.isDragging ? '#e3f2fd' : 'white',
                                        transition: 'all 0.2s ease',
                                        boxShadow: snapshot.isDragging ? 3 : 1,
                                        transform: snapshot.isDragging ? 'scale(1.02)' : 'none',
                                        cursor: 'grab',
                                        '&:active': {
                                          cursor: 'grabbing'
                                        },
                                      }}
                                    >
                                      <CardContent sx={{ position: 'relative' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                          <Box sx={{ flex: 1, mr: 2 }}>
                                            <Typography variant="h6">{card.title}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                              {card.description}
                                            </Typography>
                                          </Box>
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenMenu(e, card);
                                            }}
                                          >
                                            <MoreVertIcon />
                                          </IconButton>
                                        </Box>
                                      </CardContent>
                                    </Card>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </Box>
                          )}
                        </Droppable>
                      </Paper>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Box>
            )}
          </Droppable>
        </Box>
      </DragDropContext>

      {/* List Menu */}
      <Menu
        anchorEl={listAnchorEl}
        open={Boolean(listAnchorEl)}
        onClose={handleCloseListMenu}
      >
        <MenuItem onClick={() => selectedListForMenu && handleOpenEditListDialog(selectedListForMenu)}>
          Edit
        </MenuItem>
        <MenuItem 
          onClick={() => selectedListForMenu && handleDeleteList(selectedListForMenu.id)}
          sx={{ color: 'error.main' }}
        >
          Delete
        </MenuItem>
      </Menu>

      {/* Edit List Dialog */}
      <Dialog 
        open={openEditListDialog} 
        onClose={() => setOpenEditListDialog(false)}
        aria-labelledby="edit-list-dialog-title"
      >
        <DialogTitle id="edit-list-dialog-title">Edit List</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="List Title"
            fullWidth
            value={editListTitle}
            onChange={(e) => setEditListTitle(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditListDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleEditList} 
            variant="contained"
            disabled={!editListTitle.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Card Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => selectedCard && handleOpenEditDialog(selectedCard)}>
          Edit
        </MenuItem>
        <MenuItem 
          onClick={() => selectedCard && handleDeleteCard(selectedCard.id)}
          sx={{ color: 'error.main' }}
        >
          Delete
        </MenuItem>
      </Menu>

      {/* Edit Card Dialog */}
      <Dialog 
        open={openEditDialog} 
        onClose={() => setOpenEditDialog(false)}
        aria-labelledby="edit-card-dialog-title"
      >
        <DialogTitle id="edit-card-dialog-title">Edit Task</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Task Title"
            fullWidth
            value={editCardTitle}
            onChange={(e) => setEditCardTitle(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={editCardDescription}
            onChange={(e) => setEditCardDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleEditCard} 
            variant="contained"
            disabled={!editCardTitle.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        aria-labelledby="create-card-dialog-title"
      >
        <DialogTitle id="create-card-dialog-title">Create New Task</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Task Title"
            fullWidth
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={newCardDescription}
            onChange={(e) => setNewCardDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateCard} 
            variant="contained"
            disabled={!newCardTitle.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={openListDialog} 
        onClose={() => setOpenListDialog(false)}
        aria-labelledby="create-list-dialog-title"
      >
        <DialogTitle id="create-list-dialog-title">Create New List</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="List Title"
            fullWidth
            value={newListTitle}
            onChange={(e) => setNewListTitle(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenListDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateList} 
            variant="contained"
            disabled={!newListTitle.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BoardPage; 