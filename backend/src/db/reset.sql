BEGIN;

TRUNCATE TABLE
  attendance_records,
  events,
  student_enrollments,
  academic_years,
  teacher_groups,
  group_school_years,
  guardians,
  students,
  users,
  school_years,
  groups
RESTART IDENTITY CASCADE;

COMMIT;
