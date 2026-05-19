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
  date_of_birth?: string | null;
  father_name?: string | null;
  mother_name?: string | null;
  mobile_number?: string | null;
  email?: string | null;
  current_address?: string | null;
  hobbies_or_interests?: string | null;
  medical_needs_or_allergies?: string | null;
  checkin_time?: string | null;
  checkout_time?: string | null;
};
