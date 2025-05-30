import axios from 'axios';
import type { Board, CreateBoardData } from '../types/board';
import { authService } from './auth';

export interface Card {
  id: string;
  title: string;
  description: string;
  list: string;
  position: number;
}

export interface List {
  id: string;
  title: string;
  board: string;
  position: number;
  cards: Card[];
}

export interface Board {
  id: string;
  title: string;
  lists: List[];
}

export const boardService = {
  async getBoards(): Promise<Board[]> {
    try {
      console.log('Fetching boards...');
      const response = await axios.get('/boards/');
      console.log('Boards response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching boards:', error);
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        authService.logout();
      }
      throw error;
    }
  },

  async createBoard(data: CreateBoardData): Promise<Board> {
    try {
      console.log('Creating board:', data);
      const response = await axios.post('/boards/', data);
      console.log('Create board response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating board:', error);
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        authService.logout();
      }
      throw error;
    }
  },

  async getBoard(id: number): Promise<Board> {
    try {
      console.log('Fetching board:', id);
      const response = await axios.get(`/boards/${id}/`);
      console.log('Board response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching board:', error);
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        authService.logout();
      }
      throw error;
    }
  },

  async getLists(boardId: string): Promise<List[]> {
    try {
      console.log('Fetching lists for board:', boardId);
      const response = await axios.get('/lists/', {
        params: { board: boardId }
      });
      console.log('Lists response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching lists:', error);
      throw error;
    }
  },

  async createList(boardId: string, title: string): Promise<List> {
    try {
      console.log('Creating list:', { boardId, title });
      const response = await axios.post('/lists/', { board: boardId, title });
      console.log('Create list response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating list:', error);
      throw error;
    }
  },

  async createCard(listId: string, title: string, description: string): Promise<Card> {
    try {
      console.log('Creating card:', { listId, title, description });
      const response = await axios.post('/cards/', { list: listId, title, description });
      console.log('Create card response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating card:', error);
      throw error;
    }
  },

  async moveCard(cardId: string, newListId: string, newPosition: number): Promise<Card> {
    try {
      console.log('Moving card:', { cardId, newListId, newPosition });
      const response = await axios.patch(`/cards/${cardId}/move/`, {
        new_list_id: newListId,
        new_position: newPosition
      });
      console.log('Move card response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error moving card:', error);
      throw error;
    }
  },

  async updateCard(cardId: string, updates: Partial<Card>): Promise<Card> {
    try {
      console.log('Updating card:', { cardId, updates });
      const response = await axios.patch(`/cards/${cardId}/`, updates);
      console.log('Update card response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating card:', error);
      throw error;
    }
  }
};

export default boardService; 