const path = require('path');
const fs = require('fs');

// On Vercel serverless environment, the only writable directory is /tmp
const isVercel = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const dataDir = isVercel ? '/tmp/attendio-data' : path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'attendio.sqlite');

// If in serverless and pre-existing DB exists in repo data/, copy it over to /tmp
const localDbPath = path.join(__dirname, '..', 'data', 'attendio.sqlite');
if (isVercel && !fs.existsSync(dbPath) && fs.existsSync(localDbPath)) {
  try {
    fs.copyFileSync(localDbPath, dbPath);
  } catch (e) {}
}

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('student','faculty','hod')),
 student_id TEXT, department TEXT DEFAULT 'Computer Science', semester TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS classes (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, code TEXT UNIQUE NOT NULL,
 department TEXT NOT NULL, semester TEXT NOT NULL, faculty_id INTEGER REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS enrollments (
 user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
 class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE, PRIMARY KEY(user_id,class_id)
);
CREATE TABLE IF NOT EXISTS sessions (
 id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER REFERENCES classes(id), faculty_id INTEGER REFERENCES users(id),
 token TEXT NOT NULL, week_key TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS attendance (
 id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER REFERENCES users(id), class_id INTEGER REFERENCES classes(id),
 session_id INTEGER REFERENCES sessions(id), status TEXT NOT NULL DEFAULT 'Present',
 marked_at TEXT DEFAULT CURRENT_TIMESTAMP, latitude REAL, longitude REAL, note TEXT,
 UNIQUE(student_id,session_id)
);
CREATE TABLE IF NOT EXISTS resources (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 title TEXT NOT NULL,
 category TEXT NOT NULL CHECK(category IN ('Syllabus', 'PYQ', 'Lecture Notes', 'Lab Manual')),
 department TEXT NOT NULL,
 semester TEXT NOT NULL,
 subject_code TEXT NOT NULL,
 subject_name TEXT NOT NULL,
 year TEXT,
 doc_url TEXT NOT NULL,
 description TEXT,
 author_name TEXT NOT NULL,
 author_email TEXT,
 author_id INTEGER REFERENCES users(id),
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// Pre-populate with official JUT / Dumka Engineering College Syllabus and Previous Year Questions
const resCount = db.prepare('SELECT COUNT(*) n FROM resources').get().n;
if (!resCount) {
  const insertRes = db.prepare(`
    INSERT INTO resources (title, category, department, semester, subject_code, subject_name, year, doc_url, description, author_name, author_email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialDocs = [
    [
      'JUT B.Tech Computer Science & Engineering 3rd to 8th Sem Official Syllabus',
      'Syllabus',
      'Computer Science',
      '3rd-8th',
      'CSE-JUT',
      'Computer Science Curriculum',
      '2024-2026',
      '/docs/cse-syllabus.html',
      'Comprehensive official AICTE / JUT syllabus covering DSA, DBMS, OS, DAA, AI/ML, Networks, and Compiler Design with credit distributions.',
      'Academic Section DEC',
      'academics@dumkaengg.edu.in'
    ],
    [
      'Data Structures & Algorithms (CS301) — JUT 2024 End-Semester Question Paper',
      'PYQ',
      'Computer Science',
      '3rd',
      'CS301',
      'Data Structures & Algorithms',
      '2024',
      '/docs/cs301-pyq-2024.html',
      'Original JUT end-semester PYQ featuring questions on AVL trees, Dijkstra shortest paths, Dynamic Programming, and Graph Traversals.',
      'Dr. Ananya Das',
      'faculty@attendio.demo'
    ],
    [
      'Database Management Systems (CS602) — JUT 2023 Previous Year Question Paper',
      'PYQ',
      'Computer Science',
      '6th',
      'CS602',
      'Database Management Systems',
      '2023',
      '/docs/cs602-pyq-2023.html',
      'Official question paper covering Relational Algebra, B+ Trees, 2PL Concurrency Control, and SQL Triggers.',
      'Aarav Kumar',
      'student@attendio.demo'
    ],
    [
      'Web Technology & Cloud Applications (CS601) — Module-wise Detailed Syllabus',
      'Syllabus',
      'Computer Science',
      '6th',
      'CS601',
      'Web Technology',
      '2025',
      '/docs/cs601-syllabus.html',
      'Complete module guidelines covering HTTP/2, REST APIs, Node.js runtime, SQLite/PostgreSQL, and responsive UI design.',
      'Dr. Ananya Das',
      'faculty@attendio.demo'
    ],
    [
      'Electronics & Communication Engineering B.Tech Core AICTE Syllabus',
      'Syllabus',
      'Electronics & Comm.',
      '3rd-8th',
      'ECE-JUT',
      'Electronics & Communication',
      '2024',
      '/docs/cse-syllabus.html',
      'JUT standard syllabus covering Signals & Systems, Analog Circuits, Digital Communication, Microprocessors, and VLSI Architecture.',
      'Academic Section DEC',
      'academics@dumkaengg.edu.in'
    ],
    [
      'Digital Signal Processing (EC501) — JUT 2024 Previous Year Solved Paper',
      'PYQ',
      'Electronics & Comm.',
      '5th',
      'EC501',
      'Digital Signal Processing',
      '2024',
      '/docs/ec501-pyq-2024.html',
      'Solved past question paper on FFT butterfly algorithms, Butterworth and Chebyshev filter design, and Z-transforms.',
      'Prof. Rajesh Verma',
      'hod@attendio.demo'
    ],
    [
      'Mechanical Engineering 4th Sem Thermodynamics & Fluid Mechanics PYQ',
      'PYQ',
      'Mechanical',
      '4th',
      'ME402',
      'Thermodynamics & Fluids',
      '2023',
      '/docs/me402-pyq-2023.html',
      'End-sem question paper covering Rankine cycles, Bernoulli flow, and boundary layer theory.',
      'Academic Section DEC',
      'academics@dumkaengg.edu.in'
    ],
    [
      'Electrical Machines & Power Systems (EE502) — JUT Previous Year Question Paper',
      'PYQ',
      'Electrical',
      '5th',
      'EE502',
      'Electrical Machines-II',
      '2024',
      '/docs/ec501-pyq-2024.html',
      'Question paper focusing on Synchronous generators, Induction motors, and load-frequency control.',
      'Academic Section DEC',
      'academics@dumkaengg.edu.in'
    ],
    [
      'Civil Engineering Structural Analysis & Concrete Technology Syllabus',
      'Syllabus',
      'Civil',
      '5th',
      'CE501',
      'Structural Analysis',
      '2025',
      '/docs/cs601-syllabus.html',
      'AICTE syllabus for moment distribution methods, matrix analysis of trusses, and limit state design of beams.',
      'Academic Section DEC',
      'academics@dumkaengg.edu.in'
    ]
  ];

  initialDocs.forEach(row => insertRes.run(...row));
}

const count = db.prepare('SELECT COUNT(*) n FROM users').get().n;
if (!count) {
 const addUser = db.prepare('INSERT INTO users(name,email,password_hash,role,student_id,department,semester) VALUES(?,?,?,?,?,?,?)');
 const password = bcrypt.hashSync('Attendio@123', 10);
 const student = addUser.run('Aarav Kumar','student@attendio.demo',password,'student','DEC2026001','Computer Science','6th').lastInsertRowid;
 const student2 = addUser.run('Priya Singh','student2@attendio.demo',password,'student','DEC2026002','Computer Science','6th').lastInsertRowid;
 const faculty = addUser.run('Dr. Ananya Das','faculty@attendio.demo',password,'faculty',null,'Computer Science',null).lastInsertRowid;
 addUser.run('Prof. Rajesh Verma','hod@attendio.demo',password,'hod',null,'Computer Science',null);
 const c1 = db.prepare('INSERT INTO classes(name,code,department,semester,faculty_id) VALUES(?,?,?,?,?)').run('Web Technology','CS601','Computer Science','6th',faculty).lastInsertRowid;
 const c2 = db.prepare('INSERT INTO classes(name,code,department,semester,faculty_id) VALUES(?,?,?,?,?)').run('Database Management Systems','CS602','Computer Science','6th',faculty).lastInsertRowid;
 const enroll = db.prepare('INSERT INTO enrollments(user_id,class_id) VALUES(?,?)');
 [student,student2].forEach(id => { enroll.run(id,c1); enroll.run(id,c2); });
}

module.exports = db;
