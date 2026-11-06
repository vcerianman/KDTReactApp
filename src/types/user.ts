export type UserRole = 'ADMIN' | 'MEMBER' | 'MANAGER' | 'GOD' | string;

export interface User {
  id: string;
  username: string;
  fullname: string;
  email?: string;
  role: UserRole;
  image?: string;
  status?: string;
  theme?: 'light' | 'dark' | string;
  raw?: Record<string, any>;
  [key: string]: any;
}

export interface CurrentUserContext {
  id: string;
  username: string;
  fullname: string;
  image?: string;
  role: string;
  theme?: string;
  status?: string;
  raw?: Record<string, any>;
  [key: string]: any;
}
