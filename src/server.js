require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const QRCode = require('qrcode');
const path = require('path');
const db = require('./db');
const app = express();
const PORT = process.env.PORT || 3000;
const CAMPUS = { name: process.env.CAMPUS_NAME || 'Dumka Engineering College', lat: Number(process.env.CAMPUS_LAT || 24.2676), lng: Number(process.env.CAMPUS_LNG || 87.2486), radius: Number(process.env.CAMPUS_RADIUS_METERS || 500) };

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(session({ secret: process.env.SESSION_SECRET || 'development-secret-change-me', resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 8*60*60*1000 } }));
app.use('/api', rateLimit({ windowMs: 60*1000, limit: 120, standardHeaders: true, legacyHeaders: false }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const safeUser = u => ({ id:u.id, name:u.name, email:u.email, role:u.role, studentId:u.student_id, department:u.department, semester:u.semester });
function auth(req,res,next){ if(!req.session.user) return res.status(401).json({error:'Please sign in to continue.'}); next(); }
function roles(...allowed){ return (req,res,next)=>{ if(!allowed.includes(req.session.user?.role)) return res.status(403).json({error:'You do not have permission for this action.'}); next(); }; }
function distance(a,b,c,d){ const R=6371000, rad=x=>x*Math.PI/180, dLat=rad(c-a), dLon=rad(d-b); const x=Math.sin(dLat/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(dLon/2)**2; return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); }
function weekKey(){ const d=new Date(); const jan=new Date(d.getFullYear(),0,1); const week=Math.ceil((((d-jan)/86400000)+jan.getDay()+1)/7); return `${d.getFullYear()}-W${String(week).padStart(2,'0')}`; }

app.get('/api/config',(req,res)=>res.json({campus:{name:CAMPUS.name,radius:CAMPUS.radius},lateAfter:Number(process.env.ATTENDANCE_LATE_AFTER_MINUTES||15)}));
app.post('/api/auth/login',(req,res)=>{ const {email,password}=req.body||{}; if(!email||!password) return res.status(400).json({error:'Email and password are required.'}); const u=db.prepare('SELECT * FROM users WHERE lower(email)=lower(?)').get(email.trim()); if(!u||!bcrypt.compareSync(password,u.password_hash)) return res.status(401).json({error:'Invalid email or password.'}); req.session.user=safeUser(u); res.json({user:req.session.user}); });
app.post('/api/auth/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/api/auth/me',(req,res)=>res.json({user:req.session.user||null}));

// ----------------- SYLLABUS & PYQ RESOURCE REPOSITORY API -----------------
// GET all resources with optional search, category, and department filters (Public / accessible to all users)
app.get('/api/resources', (req, res) => {
  const { category, department, semester, search } = req.query;
  let sql = 'SELECT * FROM resources WHERE 1=1';
  const params = [];

  if (category && category !== 'All') {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (department && department !== 'All') {
    sql += ' AND department = ?';
    params.push(department);
  }
  if (semester && semester !== 'All') {
    sql += ' AND semester LIKE ?';
    params.push(`%${semester}%`);
  }
  if (search) {
    sql += ' AND (title LIKE ? OR subject_name LIKE ? OR subject_code LIKE ? OR description LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  sql += ' ORDER BY created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// GET single resource by id
app.get('/api/resources/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Resource not found' });
  res.json(row);
});

// CREATE resource - Any user (signed in or guest student) can add resources!
app.post('/api/resources', (req, res) => {
  const { title, category, department, semester, subject_code, subject_name, year, doc_url, description, author_name, author_email } = req.body || {};

  if (!title || !category || !department || !subject_code || !doc_url) {
    return res.status(400).json({ error: 'Title, Category, Department, Subject Code, and Document Link are required.' });
  }

  const user = req.session?.user;
  const author = author_name?.trim() || user?.name || 'DEC Engineering Scholar';
  const email = author_email?.trim() || user?.email || (user ? `${user.role}@dumkaengg.edu.in` : 'contributor@dumkaengg.edu.in');
  const userId = user?.id || null;

  try {
    const info = db.prepare(`
      INSERT INTO resources (title, category, department, semester, subject_code, subject_name, year, doc_url, description, author_name, author_email, author_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title.trim(),
      category,
      department,
      semester || 'All Semesters',
      subject_code.trim().toUpperCase(),
      subject_name ? subject_name.trim() : title.trim(),
      year ? String(year).trim() : '2024-2026',
      doc_url.trim(),
      description ? description.trim() : 'Verified academic resource uploaded for Dumka Engineering College students.',
      author,
      email,
      userId
    );

    const created = db.prepare('SELECT * FROM resources WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ ok: true, message: 'Academic resource added successfully!', resource: created });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add resource: ' + err.message });
  }
});

// EDIT resource - Any user can improve or edit document details/links!
app.put('/api/resources/:id', (req, res) => {
  const { title, category, department, semester, subject_code, subject_name, year, doc_url, description } = req.body || {};
  const current = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);

  if (!current) {
    return res.status(404).json({ error: 'Resource not found.' });
  }

  try {
    db.prepare(`
      UPDATE resources
      SET title = COALESCE(?, title),
          category = COALESCE(?, category),
          department = COALESCE(?, department),
          semester = COALESCE(?, semester),
          subject_code = COALESCE(?, subject_code),
          subject_name = COALESCE(?, subject_name),
          year = COALESCE(?, year),
          doc_url = COALESCE(?, doc_url),
          description = COALESCE(?, description),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title?.trim() || null,
      category || null,
      department || null,
      semester || null,
      subject_code?.trim()?.toUpperCase() || null,
      subject_name?.trim() || null,
      year ? String(year).trim() : null,
      doc_url?.trim() || null,
      description?.trim() || null,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
    res.json({ ok: true, message: 'Resource successfully updated!', resource: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update resource: ' + err.message });
  }
});

// DELETE resource - Protected! Cannot be deleted by other users or arbitrary guests. Only institution HOD can delete.
app.delete('/api/resources/:id', auth, roles('hod'), (req, res) => {
  const current = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Resource not found.' });

  db.prepare('DELETE FROM resources WHERE id = ?').run(req.params.id);
  res.json({ ok: true, message: 'Resource safely archived by HOD.' });
});

// ----------------- DASHBOARD & CORE ATTENDANCE APIS -----------------
app.get('/api/dashboard',auth,(req,res)=>{
 const u=req.session.user; const today=new Date().toISOString().slice(0,10);
 if(u.role==='student'){
  const classes=db.prepare(`SELECT c.id,c.name,c.code,COUNT(a.id) total,SUM(CASE WHEN a.status IN ('Present','Late') THEN 1 ELSE 0 END) attended FROM enrollments e JOIN classes c ON c.id=e.class_id LEFT JOIN attendance a ON a.class_id=c.id AND a.student_id=? WHERE e.user_id=? GROUP BY c.id`).all(u.id,u.id).map(c=>({...c,percentage:c.total?Math.round(c.attended/c.total*100):0}));
  const recent=db.prepare(`SELECT a.*,c.name class_name,c.code FROM attendance a JOIN classes c ON c.id=a.class_id WHERE a.student_id=? ORDER BY a.marked_at DESC LIMIT 8`).all(u.id);
  const present=db.prepare("SELECT COUNT(*) n FROM attendance WHERE student_id=? AND status IN ('Present','Late')").get(u.id).n;
  const total=db.prepare('SELECT COUNT(*) n FROM attendance WHERE student_id=?').get(u.id).n;
  return res.json({summary:{attendance:total?Math.round(present/total*100):0,classes:classes.length,markedToday:db.prepare('SELECT COUNT(*) n FROM attendance WHERE student_id=? AND date(marked_at)=?').get(u.id,today).n},classes,recent});
 }
 const where=u.role==='faculty'?'WHERE c.faculty_id=?':''; const args=u.role==='faculty'?[u.id]:[];
 const classes=db.prepare(`SELECT c.*,COUNT(DISTINCT e.user_id) students,COUNT(DISTINCT a.id) scans FROM classes c LEFT JOIN enrollments e ON e.class_id=c.id LEFT JOIN attendance a ON a.class_id=c.id ${where} GROUP BY c.id ORDER BY c.name`).all(...args);
 const todayCount=db.prepare(`SELECT COUNT(*) n FROM attendance a JOIN classes c ON c.id=a.class_id ${u.role==='faculty'?'WHERE c.faculty_id=? AND ': 'WHERE'} date(a.marked_at)=?`).get(...(u.role==='faculty'?[u.id,today]:[today])).n;
 const recent=db.prepare(`SELECT a.*,u.name student_name,u.student_id,c.name class_name,c.code FROM attendance a JOIN users u ON u.id=a.student_id JOIN classes c ON c.id=a.class_id ${u.role==='faculty'?'WHERE c.faculty_id=?':''} ORDER BY a.marked_at DESC LIMIT 12`).all(...args);
 const students=db.prepare(`SELECT COUNT(*) n FROM users WHERE role='student' ${u.role==='faculty'?"AND id IN (SELECT user_id FROM enrollments e JOIN classes c ON c.id=e.class_id WHERE c.faculty_id=?)":""}`).get(...(u.role==='faculty'?[u.id]:[])).n;
 res.json({summary:{students,today:todayCount,classes:classes.length,attendanceRate:calcRate(u)},classes,recent});
});
function calcRate(u){ const row=db.prepare(`SELECT COUNT(*) total,SUM(CASE WHEN a.status IN ('Present','Late') THEN 1 ELSE 0 END) present FROM attendance a JOIN classes c ON c.id=a.class_id ${u.role==='faculty'?'WHERE c.faculty_id=?':''}`).get(...(u.role==='faculty'?[u.id]:[])); return row.total?Math.round(row.present/row.total*100):0; }
app.get('/api/classes',auth,(req,res)=>{ const u=req.session.user; let rows; if(u.role==='student') rows=db.prepare('SELECT c.* FROM classes c JOIN enrollments e ON e.class_id=c.id WHERE e.user_id=?').all(u.id); else if(u.role==='faculty') rows=db.prepare('SELECT * FROM classes WHERE faculty_id=?').all(u.id); else rows=db.prepare('SELECT * FROM classes').all(); res.json(rows); });
app.post('/api/sessions',auth,roles('faculty','hod'),async(req,res)=>{ try{ const {classId}=req.body; const u=req.session.user; const cls=db.prepare('SELECT * FROM classes WHERE id=?').get(classId); if(!cls) return res.status(404).json({error:'Class not found.'}); if(u.role==='faculty'&&cls.faculty_id!==u.id) return res.status(403).json({error:'This class is not assigned to you.'}); const token=crypto.randomBytes(24).toString('hex'); const wk=weekKey(); db.prepare('UPDATE sessions SET active=0 WHERE class_id=?').run(classId); const id=db.prepare('INSERT INTO sessions(class_id,faculty_id,token,week_key) VALUES(?,?,?,?)').run(classId,u.id,token,wk).lastInsertRowid; const qr=await QRCode.toDataURL(JSON.stringify({token,sessionId:id,week:wk}),{width:360,margin:2,color:{dark:'#102a43',light:'#ffffff'}}); res.json({id,token,week:wk,qr,className:cls.name}); }catch(e){res.status(500).json({error:'Could not create QR session.'});} });
app.post('/api/attendance/scan',auth,roles('student'),(req,res)=>{ const {token,latitude,longitude}=req.body||{}; if(!token||!Number.isFinite(Number(latitude))||!Number.isFinite(Number(longitude))) return res.status(400).json({error:'QR token and device location are required.'}); const u=req.session.user; const s=db.prepare('SELECT s.*,c.name class_name,c.id cid FROM sessions s JOIN classes c ON c.id=s.class_id WHERE s.token=? AND s.active=1').get(token); if(!s) return res.status(400).json({error:'This QR code is invalid or no longer active.'}); if(s.week_key!==weekKey()) return res.status(400).json({error:'This QR code has expired. Ask faculty for the current weekly QR.'}); const enrolled=db.prepare('SELECT 1 FROM enrollments WHERE user_id=? AND class_id=?').get(u.id,s.cid); if(!enrolled) return res.status(403).json({error:'You are not enrolled in this class.'}); const meters=distance(CAMPUS.lat,CAMPUS.lng,Number(latitude),Number(longitude)); if(meters>CAMPUS.radius) return res.status(403).json({error:`Outside campus boundary (${Math.round(meters)}m from campus). Attendance rejected.`}); const existing=db.prepare('SELECT id FROM attendance WHERE student_id=? AND session_id=?').get(u.id,s.id); if(existing) return res.status(409).json({error:'Attendance has already been marked for this session.'}); const lateAfter=Number(process.env.ATTENDANCE_LATE_AFTER_MINUTES||15); const sessionAge=Math.max(0,Math.floor((Date.now()-new Date(s.created_at+'Z').getTime())/60000)); const status=sessionAge>=lateAfter?'Late':'Present'; db.prepare('INSERT INTO attendance(student_id,class_id,session_id,status,latitude,longitude) VALUES(?,?,?,?,?,?)').run(u.id,s.cid,s.id,status,Number(latitude),Number(longitude)); res.json({ok:true,status,className:s.class_name,distance:Math.round(meters),message:`${status} attendance recorded for ${s.class_name}.`}); });
app.get('/api/reports',auth,roles('faculty','hod'),(req,res)=>{ const u=req.session.user; const {classId}=req.query; let sql=`SELECT a.id,a.status,a.marked_at,a.note,u.name student_name,u.student_id,c.name class_name,c.code FROM attendance a JOIN users u ON u.id=a.student_id JOIN classes c ON c.id=a.class_id WHERE 1=1`; const args=[]; if(u.role==='faculty'){sql+=' AND c.faculty_id=?';args.push(u.id);} if(classId){sql+=' AND c.id=?';args.push(classId);} sql+=' ORDER BY a.marked_at DESC'; res.json(db.prepare(sql).all(...args)); });
app.get('/api/students',auth,roles('faculty','hod'),(req,res)=>{ const u=req.session.user; const sql=`SELECT u.id,u.name,u.email,u.student_id,u.department,u.semester,COUNT(a.id) total,SUM(CASE WHEN a.status IN ('Present','Late') THEN 1 ELSE 0 END) attended FROM users u LEFT JOIN attendance a ON a.student_id=u.id WHERE u.role='student' ${u.role==='faculty'?'AND u.id IN (SELECT e.user_id FROM enrollments e JOIN classes c ON c.id=e.class_id WHERE c.faculty_id=?)':''} GROUP BY u.id ORDER BY u.name`; res.json(db.prepare(sql).all(...(u.role==='faculty'?[u.id]:[])).map(s=>({...s,percentage:s.total?Math.round(s.attended/s.total*100):0}))); });
app.patch('/api/attendance/:id',(req,res)=>{ if(!req.session.user||!['faculty','hod'].includes(req.session.user.role)) return res.status(403).json({error:'Not authorized.'}); const {status,note}=req.body||{}; if(!['Present','Absent','Late'].includes(status)) return res.status(400).json({error:'Invalid attendance status.'}); const a=db.prepare('SELECT a.*,c.faculty_id FROM attendance a JOIN classes c ON c.id=a.class_id WHERE a.id=?').get(req.params.id); if(!a) return res.status(404).json({error:'Record not found.'}); if(req.session.user.role==='faculty'&&a.faculty_id!==req.session.user.id) return res.status(403).json({error:'Not authorized for this class.'}); db.prepare('UPDATE attendance SET status=?,note=? WHERE id=?').run(status,String(note||'Updated by authorized staff').slice(0,250),a.id); res.json({ok:true}); });
app.get('/api/qr/current',auth,roles('faculty','hod'),(req,res)=>{ const u=req.session.user; const rows=db.prepare(`SELECT s.id,s.week_key,s.created_at,c.name class_name,c.code FROM sessions s JOIN classes c ON c.id=s.class_id WHERE s.active=1 ${u.role==='faculty'?'AND c.faculty_id=?':''} ORDER BY s.created_at DESC`).all(...(u.role==='faculty'?[u.id]:[])); res.json(rows); });
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'..','public','index.html')));

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT,()=>console.log(`\nATTENDIO SHIELD 3D running at http://localhost:${PORT}\n`));
}

module.exports = app;
