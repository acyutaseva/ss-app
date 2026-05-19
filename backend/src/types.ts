export type UserRole = 'admin' | 'teacher';

export type AuthUser = {
  id: string;
  name: string;
  role: UserRole;
};
