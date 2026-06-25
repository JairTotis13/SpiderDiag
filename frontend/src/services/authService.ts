import api from './api';
import type {
  LoginRequest,
  RegisterRequest,
  Token,
  User,
} from '@/types';

export const authService = {
  login: (data: LoginRequest) =>
    api.post<Token>('/auth/login', data).then((r) => r.data),

  register: (data: RegisterRequest) =>
    api.post<User>('/auth/register', data).then((r) => r.data),

  getMe: () => api.get<User>('/auth/me').then((r) => r.data),

  getRoles: () =>
    api.get<{ id: number; name: string; description: string }[]>(
      '/auth/roles'
    ).then((r) => r.data),
};
