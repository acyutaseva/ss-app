export type UserRole = 'admin' | 'teacher';

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type Student = {
  id: string;
  full_name: string;
  group_id?: string;
  group_name: string;
};
