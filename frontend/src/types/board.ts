export interface Board {
  id: number;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
  owner: number;
  members: number[];
}

export interface CreateBoardData {
  title: string;
  description?: string;
} 