export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  status?: number;
  success?: boolean;
  [key: string]: any;
}

export interface ApiError {
  message: string;
  status?: number;
  response?: {
    status: number;
    data?: any;
  };
}

