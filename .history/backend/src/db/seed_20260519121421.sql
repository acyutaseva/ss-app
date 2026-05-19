-- password: Admin@123
INSERT INTO users (name, email, password_hash, role)
VALUES
  ('System Admin', 'abhishekchouhan@gmail.com', crypt('Admin@123', gen_salt('bf', 10)), 'admin'),
  ('Dayamai Saci', 'dayamai.saci@gmail.com', crypt('Admin@123', gen_salt('bf', 10)), 'admin'),
  ('Acyuta Seva', 'acyuta.seva@gmail.com', crypt('Admin@123', gen_salt('bf', 10)), 'teacher')
ON CONFLICT (email) DO UPDATE
SET
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_active = true;

INSERT INTO groups (name, whatsapp_link)
VALUES
  ('Gopal Group - Kindy and Pre Primary', NULL),
  ('Madhava Group - Year 1 to Year 3', NULL),
  ('Gauranga Group - Year 4 to Year 6', NULL)
ON CONFLICT (name) DO UPDATE
SET whatsapp_link = EXCLUDED.whatsapp_link;

INSERT INTO school_years (name, sort_order)
VALUES
  ('Kindy', 1),
  ('Pre Primary', 2),
  ('Year 1', 3),
  ('Year 2', 4),
  ('Year 3', 5),
  ('Year 4', 6),
  ('Year 5', 7),
  ('Year 6', 8)
ON CONFLICT (name) DO UPDATE SET
  sort_order = EXCLUDED.sort_order;

INSERT INTO academic_years (year_label, is_active)
VALUES ('2026', true)
ON CONFLICT (year_label) DO UPDATE
SET is_active = EXCLUDED.is_active;

INSERT INTO group_school_years (group_id, school_year_id)
SELECT g.id, sy.id
FROM groups g
JOIN school_years sy ON
  (g.name = 'Gopal Group - Kindy and Pre Primary' AND sy.name IN ('Kindy', 'Pre Primary'))
  OR (g.name = 'Madhava Group - Year 1 to Year 3' AND sy.name IN ('Year 1', 'Year 2', 'Year 3'))
  OR (g.name = 'Gauranga Group - Year 4 to Year 6' AND sy.name IN ('Year 4', 'Year 5', 'Year 6'))
ON CONFLICT (group_id, school_year_id) DO NOTHING;

INSERT INTO events (name, event_date, start_time, end_time, notes)
VALUES
  ('Sunday School', '2026-05-24', '09:00', '11:30', 'Weekly Sunday School'),
  ('HG Gauranga Darshan Class', '2026-05-16', '17:00', '18:30', 'Special class event')
ON CONFLICT (name, event_date, start_time) DO UPDATE
SET end_time = EXCLUDED.end_time,
    notes = EXCLUDED.notes;
