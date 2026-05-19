-- Seed students/enrollments from Registration_2026 CSV
-- Requires groups, school_years, group_school_years, and at least one active academic_year

CREATE TEMP TABLE tmp_student_import (
  submission_date DATE,
  full_name TEXT NOT NULL,
  school_year_name TEXT NOT NULL,
  date_of_birth DATE,
  father_name TEXT,
  mother_name TEXT,
  mobile_number TEXT,
  email TEXT,
  current_address TEXT,
  hobbies_or_interests TEXT,
  medical_needs_or_allergies TEXT
);

INSERT INTO tmp_student_import (submission_date, full_name, school_year_name, date_of_birth, father_name, mother_name, mobile_number, email, current_address, hobbies_or_interests, medical_needs_or_allergies) VALUES
  ('2026-04-14', 'Meera Sharma', 'Kindy', '2021-08-12', 'Aditya Sharma', 'Liubov Chernysh', '0434 345 215', 'adityasharma_0091@yahoo.co.in', '41B Beatty Avenue, East Victoria Park Perth, WA, 6101', 'Play with dolls 
Outdoor activites like park
Dance and music
Colouring', NULL),
  ('2026-03-22', 'Shivansh Shivansh', 'Year 5', '2015-10-10', 'Chandan Manaktala', 'Jyoti Manaktala', '0468 427 960', 'jyotimanaktala9@gmail.com', '1, Wadham link Piara waters, Wa, 6112', 'Music , dance', NULL),
  ('2026-03-12', 'Shriya Kumar', 'Year 6', '2014-12-05', 'Munish Kumar', 'Rowena Kumar', '0426 655 690', 'rowenakumar88@gmail.com', '64 Anstey Road, Forrestdale Perth', 'Shriya loves singing kirtan and art- painting and drawing.', NULL),
  ('2026-03-04', 'Armaan Kapoor', 'Pre Primary', '2020-09-05', 'Arjun Kapoor', 'Kusum', '0437 942 208', 'arjunkapoor5@yahoo.com', '9 abadan rd Southern river, Wa, 6110', 'He loves to listen stories, colouring, dance and play outdoor', NULL),
  ('2026-03-01', 'Prina Kaushikbhai Prajapati', 'Year 3', '2017-10-18', 'Kaushikbhai Kantibhai', 'Anjuben Prajapati', '0402 195 032', 'kaushik9182@gmail.com', '17 Fairmont boulevard Brabham, WA, 6055', 'Prina is learning Violin', NULL),
  ('2026-02-22', 'Rashika Jaysheela Ravikumar', 'Year 2', '2018-11-06', 'Ravikumar Subbiah', 'Premalatha Varadharajulu', '0430 490 250', 'subbiahravi8@gmail.com', '13C Maroog Way Nollamara, WA, 6061', 'Singing and play chello and keyboard', NULL),
  ('2026-02-21', 'Urvi Rana', 'Year 6', '2014-08-02', 'Hardesh Rana', 'Meetu Rana', '0421 240 979', 'hardesh.rana@gmail.com', '19b, Westbourne Way Lynwood, Wa, 6147', 'Singing', NULL),
  ('2026-02-21', 'Vasudeva khokhar', 'Year 4', '2016-07-01', 'Krishan Chaudhary', 'suman khokhar', '0406 709 361', 'krrishsanvi.121@gmail.com', '7 Stegley Pl Morley, WA, 6062', 'Soccer,drawing,colouring,cricket', NULL),
  ('2026-02-15', 'Chitra Pankajkumar Chudasama', 'Year 1', '2019-07-23', 'Pankajkumar Chudasama', 'Arati Chudasama', '0478 548 770', 'arati.australia91@gmail.com', '21 Cascades road Southern River, WA, 6110', 'Art & Craft, Dance, Playing activities', 'No 
Pure Vegetarian only even no egg'),
  ('2026-02-14', 'Rushika PATEL', 'Year 4', '2017-06-07', 'Pulkit Patel', 'Birva Patel', '0404 335 070', 'birvabirvappatel@gmail.com', '13 st Agnes green Southern River, WA, 6110', 'Drama and outdoor games', NULL),
  ('2026-02-14', 'Reyansh Patel', 'Year 4', '2017-06-07', 'Pulkit Patel', 'Birva Patel', '0404 335 070', 'birvbirvappatel@gmail.com', '13 St Agnes Green Southern River, WA, 6110', 'Playing outdoor and Drama', NULL),
  ('2026-02-14', 'Vyom Patel', 'Year 2', '2019-01-17', 'Sureshbhai Patel', 'Kena Patel', '0430 396 007', 'keyurpatel19386@yahoo.com', '148 Parmelia Avenue Parmelia, Wa, 6167', 'Increased in drama and Mathematics puzzles and Cricket im sports', NULL),
  ('2026-02-11', 'Yuvan Dadwal', 'Year 3', '2018-05-02', 'Harsh Dadwal', 'Vandana', '0416 622 242', 'harsh.perth@yahoo.com.au', '26a chipala road, Westminster Perth, WA, 6061', 'Reading, cricket and attend Sunday school', NULL),
  ('2026-02-08', 'Myansh Myan Kumar', 'Year 5', '2015-12-03', 'Suvikram  das', 'Radhika viraj lila devi dasi', '0422 275 020', 'Dabrarekha90@gmail.com', '22 Malo Link FORRESTFIELD, WA, 6058', 'He loves dancing ,singing ,drama and support .', 'He has dust allergies.'),
  ('2026-02-08', 'Reyansh Kumar', 'Year 1', '2020-02-28', 'Suvikram das', 'Radhika vraj lila devi dasi', '0422 275 020', 'Dabrarekha90@gmail.com', '22 malo link forrestfield Perth, WA, 6058', 'He loves singing, dancing and support .', 'He has minor asthma.'),
  ('2026-02-07', 'Myansh Kumar', 'Year 5', '2015-12-03', 'Sonu Kumar', 'Rekha Devi', '0422 275 020', 'dabrarekha90@gmail.com', '22 malo link Forrestfield, Wa, 6058', 'Sports', NULL),
  ('2026-02-07', 'Chandramukhi Devidasi Symons', 'Year 3', '2017-12-22', 'Harry Symons', 'Dewa Ayu Oka Laksmi Dewi', '0425 407 518', 'laxsmi_dewi@yahoo.com', '27 Dorchester Road Forrestfield, WA, 6058', 'Dancing', NULL),
  ('2026-02-06', 'Faythe Kakkar', 'Pre Primary', '2020-08-07', 'Parmod Kakkar', 'Akriti parmod Kakkar', '0452 401 828', 'parmodkakkar18@gmail.com', '9/152 Hamilton Street, Hamilton Street queenspark Perth, Wa, 6107', 'Likes to dance  and colouring', NULL),
  ('2026-02-05', 'AARNA SHARMA', 'Pre Primary', '2021-02-03', 'Arun Sharma', 'Prerna Kaushik', '0430 115 955', 'arunsft.kuk@gmail.com', '16 Nutmeg Pl Wattle Grove, WA, 6107', 'Painting and dancing', NULL),
  ('2026-02-04', 'Chaitanya Rajpal', 'Year 3', '2017-10-06', 'Punit Rajpal', 'Richu Rajpal', '0400 883 841', 'rupavati.radharani.dasi@gmail.com', '54, The Escarpment Willetton, WA, 6155', 'Stories, music, drama', NULL),
  ('2026-02-04', 'Parth Tomar', 'Kindy', '2021-11-29', 'Rohit Tomar', 'Richa Singh', '0416 052 236', 'er.richacs@gmail.com', '12 Walton Street, Queens Park Perth, WA, 6107', NULL, NULL),
  ('2026-02-04', 'Shreyansh Tomar', 'Year 4', '2017-05-20', 'Rohit Tomar', 'Richa Singh', '0416 052 236', 'er.richacs@gmail.com', '12 walton street, Queens park Perth, WA, 6107', 'Drawing , dance', NULL),
  ('2026-02-04', 'Parth Pravin Pasare', 'Year 6', '2015-05-19', 'Pravin Pasare', 'Poonam Pasare', '0435 027 511', 'poonampasare@hotmail.com', '12 freedman Road Menora Perth, WA, 6050', 'Reading, presentation , speaking , offering , Learning Mrindanaga - seeking coaching', NULL),
  ('2026-02-04', 'Eashi Shah', 'Year 1', '2020-04-23', 'Nirav Shah', 'Anashri Shah', '0430 437 623', 'shah.nirav_786@yahoo.com.au', '23c Selhurst Way, Balga WA, 6061', 'Spiritual dancing, drawings, colourings, singing, readings etc.', NULL),
  ('2026-02-03', 'Sankarshan Tiwari', 'Year 6', '2014-08-11', 'Arun Tiwari', 'Alka Tiwari', '0497 208 666', 'alkanitai11@gmail.com', '48 Sydenham Street Kewdale, WA, 6105', 'Music and drama', NULL),
  ('2026-02-03', 'Rihan Kanwal', 'Year 6', '2015-02-10', 'Krishan Kanwal', 'Rooma Kanwal', '0444 506 921', 'rooma.devi1@gmail.com', '23 Instrument Street, Perth Brabham, WA, 6055', NULL, NULL),
  ('2026-02-03', 'Nitya Devi Ramkhalawon', 'Year 1', '2020-05-18', 'Vinesh Ramkhalawon', 'Asha Ramkhalawon', '0434 024 794', 'ramkhalawona@yahoo.com', '40, koolbardi loop byford Perth, WA, 6122', 'Watching tv , playing outside', NULL),
  ('2026-02-03', 'Vrinda Devi Ramkhalawon', 'Year 1', '2020-05-18', 'Vinesh Ramkhalawon', 'Asha Ramkhalawon', '0434 024 794', 'ramkhalawona@yahoo.com', '40 koolbardi loop byford Perth, WA, 6122', 'Watching tv, dancing', NULL),
  ('2026-02-03', 'Nitai Ramkhalawon', 'Year 5', '2016-03-26', 'Vinesh Ramkhalawon', 'Asha Ramkhalawon', '0434 024 794', 'ramkhalawona@yahoo.com', '40 koolbardi loop byford Perth, WA, 6122', 'Playing soccer, cricket', NULL),
  ('2026-02-02', 'Rudram Mit Acharya', 'Year 1', '2020-04-08', 'Mit Acharya', 'Riddhi Acharya', '0404 880 494', 'riddhiacharya1507@gmail.com', '135 Coast Rd Dayton, WA, 6055', 'he likes paying Legos, drawing and painting', NULL),
  ('2026-02-02', 'Misha Chirag Patel', 'Year 4', '2017-05-31', 'Chirag Patel', 'Dipti Patel', '0430 110 771', 'cgpatel92@gmail.com', '2 Cavolo Road Landsdale, WA, 6065', 'Singing and dancing', 'Allergic to grass. Can''t bear the heat as it leads to the frequent nosebleed.'),
  ('2026-02-01', 'Purna Shankar', 'Year 1', '2019-07-08', 'Sudhakar Shankar', 'Ite Shree Sudhakar', '0410 539 181', 'sudhakarsha@gmail.com', '2/83,, Kennedy Street, Alfred Cove, WA, 6154', 'He likes drawing and painting', NULL),
  ('2026-02-01', 'Ariah Gupta', 'Year 2', '2018-09-29', 'Ankur Gupta', 'Vibha Goel', '0466 289 066', 'ankur_26@hotmail.com', '5 volcanic road, Treeby Perth, WA, 6164', 'Reading, Art and craft, Sketching', NULL),
  ('2026-02-01', 'Eva Malhotra', 'Year 6', '2015-06-15', 'Pankaj Malhotra', 'Divya Sharma', '0466 996 535', 'Divya.sharma256@gmail.com', '1/149 Royal Street Yokine Yokine, WA, 6060', 'She loves to write Poems and art and crafts.', NULL),
  ('2026-01-31', 'Hazel Ankit Makwana', 'Kindy', '2021-10-29', 'Ankit Makwana', 'Janki Makwana', '0450 042 866', 'januamakwana@gmail.com', 'januamakwana@gmail.com, The Escarpment Willetton, WA, 6155', NULL, NULL),
  ('2026-01-31', 'Moksh Rishiraj', 'Year 5', '2015-08-16', 'Prabhat Rishiraj', 'Babita Rani', '0480 152 554', 'Rbabita2021@yahoo.com', '45, spring Avenue 45, spring Avenue midland, WA, 6056', 'Drawing 
Asking questions', NULL),
  ('2026-01-31', 'Naidhrua Khatokar', 'Pre Primary', '2020-07-29', 'Chetan Khatokar', 'Divya Gopinath', '0469 028 217', 'divyacsd@gmail.com', '9 Renishaw road Success, WA, 6164', 'Dance painting drawing singing', 'Not to be in hot water for long'),
  ('2026-01-31', 'Yashvi Sanjay Patel', 'Year 8', '2012-09-21', 'Sanjay Patel', 'Alka Patel', '0435 018 833', 'sp7272@yahoo.com', '10 Belgrave Vista Darch, WA, 6065', 'Reading Books, taking part in drama, dance etc. Kirtan', NULL),
  ('2026-01-30', 'Vrinda Siddharth Dabhowale', 'Year 3', '2018-02-23', 'Siddharth Dabhowale', 'Rashi Roy', '0406 724 285', 'royrashi@gmail.com', '5 Greylock Meander, Madeley Perth, WA, 6065', 'Drawing, singing, dancing', NULL),
  ('2026-01-30', 'Vedic Siddharth Dabhowale', 'Year 6', '2014-12-04', 'Siddharth Dabhowale', 'Rashi Roy', '0406 724 285', 'royrashi@gmail.com', '5 Greylock Meander, Madeley Perth, WA, 6065', 'Music, acting, writing, reading, painting', NULL),
  ('2026-01-30', 'Vrinda Arora', 'Year 3', '2017-11-01', 'Navdeep Arora', 'Shreya Dhawan', '0430 271 028', 'sunny.arora@gmail.com', '4 kwilena avenue Perth, WA, 6107', NULL, NULL),
  ('2026-01-30', 'Haridev Ramana', 'Kindy', '2021-10-13', NULL, 'Sneha Rajagopalan', '0404 149 412', 'sneha.rajagopalan@hotmail.com', '19 Loretta Fairway Carramar, WA, 6031', 'Playing board games, listening to stories, nature walks', NULL),
  ('2026-01-29', 'Arjun Monga', 'Year 6', '2014-09-29', 'Kirtan ananda Caitanya Das', 'Padma Radha Devi dasi', '0449 169 909', 'padmaradhadevidasi@gmail.com', '3 Aleria Way, ALERIA WAY PIARA WATERS, WA, 6112', 'Soccer 
Mridanga playing 
Art', NULL),
  ('2026-01-28', 'Radhya Jay Vora', 'Pre Primary', '2021-04-01', 'Jay Vora', 'Misha Mandalia', '0423 614 811', 'mandaliamisha@gmail.com', '29b Moscow retreat Hocking, WA, 6065', 'Singing dancing', NULL),
  ('2026-01-25', 'Muskan Saraf', 'Year 5', '2016-05-16', 'Chetan Watel', 'rashmi watel', '0417 802 433', 'rashmi.watel@gmail.com', '8 Emanuel Bend, Harrisdale Harrisdale, WA, 6112', NULL, 'Kiwi allergy'),
  ('2026-01-25', 'Dipleen Singh Puri', 'Year 3', '2017-11-10', 'Akshay Singh Puri', 'Sarika Puri', '0412 840 504', 'apuri1_80@yahoo.com', '29 Minette Road Piara Waters, Western Australia, 6112', 'Dance, Art and craft, sports.', NULL),
  ('2026-01-21', 'Navya Rushibhai Awakhalia', 'Year 3', '2018-03-30', 'Rushibhai Awakhalia', 'Richa Awakhalia', '0416 816 379', 'richa.awak@gmail.com', '27C Lindfield Street Westminster, Australia, 6061', NULL, NULL),
  ('2026-01-20', 'Amoha Chugh', 'Year 5', '2015-07-27', 'Dhiraj Chugh', 'Sonia Chugh', '0423 968 651', 'sonichhabra@gmail.com', '202 Hawtin Rd Maida Vale, WA, 6057', 'Art and Craft , dance and music', 'Grass Allergy and pet allergies. Hey Fever'),
  ('2026-01-19', 'Kamakshi Sharma', 'Kindy', '2022-01-15', 'Varun Sharma', 'Rupika Sharma', '0406 621 308', 'v.rupika@gmail.com', '23 Windell St Parmelia, WA, 6167', 'Dancing , Singing', 'Vegetarian'),
  ('2026-01-19', 'Maithili Sharma', 'Year 3', '2017-08-22', 'Varun Sharma', 'Rupika Sharma', '0406 621 308', 'v.rupika@gmail.com', '23 Windell St Parmelia, WA, 6167', 'Singing and Reading', 'Vegetarian'),
  ('2026-01-19', 'Anaya Nawosah', 'Year 3', '2018-05-15', 'Vikash Nawosah', 'Sadna Nawosah', '0415 840 755', 'sramnawaz@yahoo.com', '2 Tyndale Turn Wellard, WA, 6170', 'Art and craft
Drawings 
Painting
Coloring', NULL),
  ('2026-01-19', 'Onish Chandra', 'Year 7', '2014-01-25', 'Subhash Chandra', 'Shraddha Yadav', '0411 699 243', 'srdchandra@gmail.com', '22 Wainwright Close Willetton, WA, 6155', 'Playing cricket and tennis.
He loves music and cooking.
He is  a good Pianist. He is learning piano since year 2', NULL),
  ('2026-01-19', 'Lavisha Chandra', 'Year 9', '2011-08-01', 'Subhash Chandra', 'Shraddha Yadav', '0411 699 243', 'srdchandra@gmail.com', '22 Wainwright Close Willetton, WA, 6155', 'She has interest in music dance and cooking.

She is very good in playing violin, as she is learning violin since year 1.', NULL),
  ('2026-01-19', 'Sumeet Sabharwal', 'Year 5', '2016-03-29', 'Manish Sabharwal', 'Mridula Sabharwal', '0430 036 930', 'mridulasoni2830@yahoo.com', '346A Benara Road Morley, WA, 6062', NULL, NULL),
  ('2026-01-19', 'Meera Kishori Krishnakumar', 'Pre Primary', '2020-10-30', 'Krishnakumar Kothottil', 'Megha Ravikumar', '0414 941 214', 'krishna.k.bala@gmail.com', '45 Riva entrance, Piara Waters Perth, WA, 6112', 'Likes to listen to stories , enjoys coloring and does jigsaw puzzles', NULL),
  ('2026-01-19', 'Kanav Magoo', 'Year 1', '2020-02-26', 'Kaveesh Kumar', 'Kanika Joshi', '0482 790 822', 'kaveesh.kumar@live.com.au', NULL, 'Reading, sports - cricket, football, basketball', NULL);

WITH mapped AS (
  SELECT
    t.submission_date,
    t.full_name,
    t.school_year_name,
    t.date_of_birth,
    t.father_name,
    t.mother_name,
    t.mobile_number,
    t.email,
    t.current_address,
    t.hobbies_or_interests,
    t.medical_needs_or_allergies
  FROM tmp_student_import t
)
INSERT INTO students (
  submission_date,
  full_name,
  date_of_birth,
  father_name,
  mother_name,
  mobile_number,
  email,
  current_address,
  hobbies_or_interests,
  medical_needs_or_allergies
)
SELECT
  m.submission_date,
  m.full_name,
  m.date_of_birth,
  m.father_name,
  m.mother_name,
  m.mobile_number,
  m.email,
  m.current_address,
  m.hobbies_or_interests,
  m.medical_needs_or_allergies
FROM mapped m
WHERE NOT EXISTS (
  SELECT 1
  FROM students s
  WHERE lower(s.full_name) = lower(m.full_name)
    AND COALESCE(s.date_of_birth::text, '') = COALESCE(m.date_of_birth::text, '')
    AND COALESCE(s.mobile_number, '') = COALESCE(m.mobile_number, '')
);

WITH mapped AS (
  SELECT
    t.full_name,
    t.school_year_name,
    t.date_of_birth,
    t.mobile_number,
    sy.id AS school_year_id,
    g.id AS group_id
  FROM tmp_student_import t
  JOIN school_years sy ON sy.name = t.school_year_name
  JOIN groups g ON g.name = CASE
    WHEN sy.name IN ('Kindy', 'Pre Primary') THEN 'Gopal Group'
    WHEN sy.name IN ('Year 1', 'Year 2', 'Year 3') THEN 'Madhava Group'
    WHEN sy.name IN ('Year 4', 'Year 5', 'Year 6') THEN 'Gauranga Group'
    ELSE NULL
  END
),
active_year AS (
  SELECT id FROM academic_years WHERE is_active = true LIMIT 1
),
resolved AS (
  SELECT DISTINCT ON (m.full_name, m.school_year_name)
    s.id AS student_id,
    m.group_id,
    m.school_year_id,
    ay.id AS academic_year_id
  FROM mapped m
  JOIN students s
    ON lower(s.full_name) = lower(m.full_name)
  CROSS JOIN active_year ay
  ORDER BY
    m.full_name,
    m.school_year_name,
    CASE
      WHEN COALESCE(s.date_of_birth::text, '') = COALESCE(m.date_of_birth::text, '')
       AND COALESCE(s.mobile_number, '') = COALESCE(m.mobile_number, '') THEN 0
      WHEN COALESCE(s.date_of_birth::text, '') = COALESCE(m.date_of_birth::text, '') THEN 1
      ELSE 2
    END,
    s.created_at DESC
)
INSERT INTO student_enrollments (
  student_id,
  academic_year_id,
  group_id,
  school_year_id,
  status
)
SELECT
  r.student_id,
  r.academic_year_id,
  r.group_id,
  r.school_year_id,
  'active'
FROM resolved r
WHERE NOT EXISTS (
  SELECT 1
  FROM student_enrollments se
  WHERE se.student_id = r.student_id
    AND se.academic_year_id = r.academic_year_id
);

DROP TABLE tmp_student_import;
