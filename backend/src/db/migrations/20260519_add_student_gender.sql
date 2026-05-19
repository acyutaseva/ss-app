ALTER TABLE students
  ADD COLUMN IF NOT EXISTS gender TEXT;

ALTER TABLE students
  DROP CONSTRAINT IF EXISTS students_gender_check;

ALTER TABLE students
  ADD CONSTRAINT students_gender_check CHECK (gender IN ('boy', 'girl'));
