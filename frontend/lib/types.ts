export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  created_at: string;
  total_files: string;
  total_storage: string;
}

export interface AdminStats {
  users: number;
  files: number;
  folders: number;
  storage: number;
  trashed: number;
}

export interface FileItem {
  id: string;
  original_name: string;
  stored_name: string;
  file_type: string;
  file_size: string | number;
  folder_id: string | null;
  owner_id: string;
  uploaded_at: string;
  is_starred: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  owner_id: string;
  created_at: string;
}