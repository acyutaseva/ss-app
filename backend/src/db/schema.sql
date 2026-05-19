CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP TABLE IF EXISTS
  attendance_records,
  event_groups,
  events,
  student_enrollments,
  academic_years,
  teacher_groups,
  guardians,
  students,
  group_school_years,
  users,
  school_years,
  groups
CASCADE;

CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  whatsapp_link TEXT
);

ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS whatsapp_link TEXT;

CREATE TABLE IF NOT EXISTS school_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS group_school_years (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  school_year_id UUID NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, school_year_id)
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_date TIMESTAMPTZ,
  full_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('boy', 'girl')),
  date_of_birth DATE,
  father_name TEXT,
  mother_name TEXT,
  mobile_number TEXT,
  email TEXT,
  current_address TEXT,
  hobbies_or_interests TEXT,
  medical_needs_or_allergies TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS gender TEXT;

ALTER TABLE students
  DROP CONSTRAINT IF EXISTS students_gender_check;

ALTER TABLE students
  ADD CONSTRAINT students_gender_check CHECK (gender IN ('boy', 'girl'));

CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_label TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS student_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id),
  school_year_id UUID NOT NULL REFERENCES school_years(id),
  is_paid BOOLEAN NOT NULL DEFAULT false,
  payment_amount NUMERIC(10,2) NOT NULL DEFAULT 125,
  paid_at TIMESTAMPTZ,
  payment_note TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'archived', 'left')) DEFAULT 'active',
  CONSTRAINT enrollment_group_school_year_fk
    FOREIGN KEY (group_id, school_year_id)
    REFERENCES group_school_years(group_id, school_year_id),
  UNIQUE (student_id, academic_year_id)
);

ALTER TABLE student_enrollments
  ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10,2) NOT NULL DEFAULT 125;

UPDATE student_enrollments
SET payment_amount = 125
WHERE payment_amount IS NULL;

CREATE TABLE IF NOT EXISTS guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  relation TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS teacher_groups (
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, group_id)
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  attendance_mode TEXT NOT NULL CHECK (attendance_mode IN ('full', 'checkin_only')) DEFAULT 'full',
  applies_all_groups BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, event_date, start_time)
);

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS attendance_mode TEXT NOT NULL DEFAULT 'full';

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS applies_all_groups BOOLEAN NOT NULL DEFAULT true;

UPDATE events
SET attendance_mode = 'full'
WHERE attendance_mode IS NULL OR attendance_mode = '';

CREATE TABLE IF NOT EXISTS event_groups (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, group_id)
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES student_enrollments(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  checkin_time TIMESTAMPTZ,
  checkout_time TIMESTAMPTZ,
  dropped_by TEXT,
  picked_by_type TEXT CHECK (picked_by_type IN ('mother', 'father', 'authorized', 'other')),
  picked_by_name TEXT,
  picked_by_phone TEXT,
  signature_url TEXT,
  notes TEXT,
  volunteer_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(enrollment_id, event_id)
);
