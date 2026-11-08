const $ = s => document.querySelector(s);
let me = null, activePage = 'home', scanner = null, lastQr = null;
let active3DAnimId = null;
let allResources = [];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(url, opts = {}) {
  const r = await fetch('/api' + url, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Something went wrong');
  return d;
}

function toast(msg, error = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show' + (error ? ' error' : '');
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => t.className = 'toast', 3600);
}

function initials(name) {
  return name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
}

function dateLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

// ----------------- PHOTO DATA -----------------
const campusPhotos = [
  {
    tag: 'CAMPUS ENTRANCE & MAIN BLOCK',
    title: 'Dumka Engineering College Academic Block',
    desc: 'The official campus building of Dumka Engineering College located at Shivapahar / Sonwadangal, Dumka, Jharkhand. Center of technical excellence and advanced academic training.',
    img: '/dec-campus-main.jpg',
    meta: 'Sonwadangal, Dumka · Established 2013'
  },
  {
    tag: 'STUDENT LIFE & COLLABORATION',
    title: 'Collaborative Study & Peer Learning',
    desc: 'B.Tech undergraduates collaborating on technical coursework, algorithms, and multidisciplinary engineering team projects.',
    img: '/dec-students-study.jpg',
    meta: 'Department Labs & Study Zones'
  },
  {
    tag: 'TECHNICAL WORKSHOPS & LABS',
    title: 'Advanced Engineering & Computing Laboratories',
    desc: 'Modernized hardware, embedded systems, civil CAD/CAM, and advanced programming laboratories for hands-on practical learning.',
    img: '/dec-tech-lab.jpg',
    meta: 'Hands-on Engineering Labs'
  },
  {
    tag: 'CAMPUS INFRASTRUCTURE',
    title: 'Modern Academic Facility & Library Complex',
    desc: 'Contemporary infrastructure supporting five major engineering disciplines: CSE, ECE, EE, ME, and Civil Engineering with high-speed digital connectivity.',
    img: '/dec-campus-building.jpg',
    meta: 'Central Library & Admin Block'
  },
  {
    tag: 'STUDENT ACTIVITIES & TECH CLUBS',
    title: 'DEC Student Body & Technical Chapters',
    desc: 'Enthusiastic engineering students organizing tech symposiums, hackathons, cultural festivals, and community outreach initiatives.',
    img: '/dec-students-group.jpg',
    meta: 'Student Clubs & Technical Societies'
  },
  {
    tag: 'SMART LECTURE HALLS',
    title: 'Interactive Smart Classrooms & Seminars',
    desc: 'Acoustically treated lecture halls equipped with projection systems, interactive screens, and verified geofenced attendance scanners.',
    img: '/dec-lecture-hall.jpg',
    meta: 'Digital Interactive Classrooms'
  }
];

// ----------------- THREE.JS 3D SCENE GENERATORS -----------------
function cleanup3D() {
  if (active3DAnimId) {
    cancelAnimationFrame(active3DAnimId);
    active3DAnimId = null;
  }
}

// 1. HERO 3D PARTICLE & GEOFENCE SPHERE BACKGROUND
function initHero3DScene(canvas) {
  if (!canvas || !window.THREE) return;
  cleanup3D();

  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || 600;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
  camera.position.z = 24;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Geofence Hologram Globe Wireframe
  const globeGeo = new THREE.IcosahedronGeometry(7.5, 3);
  const globeMat = new THREE.MeshBasicMaterial({
    color: 0x0d9488,
    wireframe: true,
    transparent: true,
    opacity: 0.28
  });
  const globe = new THREE.Mesh(globeGeo, globeMat);
  globe.position.set(7, 0, -2);
  scene.add(globe);

  // Concentric Orbit Radar Rings
  const ringGeo1 = new THREE.RingGeometry(8.5, 8.6, 64);
  const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
  const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
  ring1.position.copy(globe.position);
  ring1.rotation.x = Math.PI / 3;
  scene.add(ring1);

  const ringGeo2 = new THREE.RingGeometry(10.2, 10.3, 64);
  const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x5eead4, side: THREE.DoubleSide, transparent: true, opacity: 0.25 });
  const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
  ring2.position.copy(globe.position);
  ring2.rotation.y = Math.PI / 4;
  scene.add(ring2);

  // Digital Campus Particles (350 floating points)
  const particleCount = 350;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 45;
    positions[i + 1] = (Math.random() - 0.5) * 30;
    positions[i + 2] = (Math.random() - 0.5) * 20;

    colors[i] = 0.05 + Math.random() * 0.2;     // R
    colors[i + 1] = 0.65 + Math.random() * 0.35; // G
    colors[i + 2] = 0.85 + Math.random() * 0.15; // B
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const particleMat = new THREE.PointsMaterial({
    size: 0.22,
    vertexColors: true,
    transparent: true,
    opacity: 0.85
  });

  const particleSystem = new THREE.Points(particleGeo, particleMat);
  scene.add(particleSystem);

  let mouseX = 0, mouseY = 0;
  const onMouseMove = e => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener('mousemove', onMouseMove);

  const animate = () => {
    active3DAnimId = requestAnimationFrame(animate);

    globe.rotation.y += 0.0035;
    globe.rotation.x += 0.0015;

    ring1.rotation.z += 0.004;
    ring2.rotation.z -= 0.003;

    particleSystem.rotation.y += 0.0008;
    particleSystem.rotation.x += 0.0004;

    camera.position.x += (mouseX * 2 - camera.position.x) * 0.04;
    camera.position.y += (-mouseY * 2 - camera.position.y) * 0.04;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  };
  animate();

  const onResize = () => {
    if (!canvas) return;
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || 600;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);
}

// 2. INTERACTIVE 3D CAMPUS RADAR & GEOFENCE DEMO
function initInteractiveCampus3D(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.THREE) return;

  const width = canvas.clientWidth || 600;
  const height = canvas.clientHeight || 380;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 10, 18);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const gridHelper = new THREE.PolarGridHelper(9, 16, 8, 64, 0x0d9488, 0x1e3a5f);
  gridHelper.position.y = -0.5;
  scene.add(gridHelper);

  const bldgGroup = new THREE.Group();

  const bldgGeo = new THREE.CylinderGeometry(2, 2.4, 2.5, 6);
  const bldgMat = new THREE.MeshStandardMaterial({ color: 0x0f335b, roughness: 0.3, metalness: 0.8 });
  const mainBlock = new THREE.Mesh(bldgGeo, bldgMat);
  mainBlock.position.y = 0.75;
  bldgGroup.add(mainBlock);

  const domeGeo = new THREE.SphereGeometry(1.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const domeMat = new THREE.MeshStandardMaterial({ color: 0x14b8a6, roughness: 0.2, metalness: 0.9 });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.y = 2;
  bldgGroup.add(dome);

  const wingGeo = new THREE.BoxGeometry(1.5, 1.4, 3.8);
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f });
  const wing1 = new THREE.Mesh(wingGeo, wingMat);
  wing1.position.set(2.4, 0.3, 0);
  bldgGroup.add(wing1);

  const wing2 = new THREE.Mesh(wingGeo, wingMat);
  wing2.position.set(-2.4, 0.3, 0);
  bldgGroup.add(wing2);

  scene.add(bldgGroup);

  const boundaryGeo = new THREE.TorusGeometry(7.2, 0.08, 16, 100);
  const boundaryMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
  const boundaryRing = new THREE.Mesh(boundaryGeo, boundaryMat);
  boundaryRing.rotation.x = Math.PI / 2;
  boundaryRing.position.y = -0.4;
  scene.add(boundaryRing);

  const radarGeo = new THREE.ConeGeometry(7.2, 0.2, 32, 1, true, 0, Math.PI / 3);
  const radarMat = new THREE.MeshBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
  const radar = new THREE.Mesh(radarGeo, radarMat);
  radar.rotation.x = Math.PI / 2;
  radar.position.y = -0.38;
  scene.add(radar);

  const ambLight = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambLight);

  const dirLight = new THREE.DirectionalLight(0x5eead4, 1.5);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);

  let isDragging = false, prevX = 0;
  canvas.addEventListener('mousedown', e => { isDragging = true; prevX = e.clientX; });
  window.addEventListener('mouseup', () => { isDragging = false; });
  window.addEventListener('mousemove', e => {
    if (isDragging) {
      const deltaX = e.clientX - prevX;
      bldgGroup.rotation.y += deltaX * 0.01;
      gridHelper.rotation.y += deltaX * 0.01;
      prevX = e.clientX;
    }
  });

  const anim = () => {
    requestAnimationFrame(anim);
    if (!isDragging) {
      bldgGroup.rotation.y += 0.005;
      gridHelper.rotation.y += 0.005;
    }
    radar.rotation.z -= 0.025;
    renderer.render(scene, camera);
  };
  anim();
}

// ----------------- PUBLIC NAVIGATION & VIEWS -----------------
function renderPublicNav(active = 'home') {
  return `
    <header class="public-navbar">
      <div class="brand" onclick="navigatePublic('home')">
        <span class="brand-mark">A</span>
        <div>
          ATTENDIO <b>SHIELD 3D</b>
          <div style="font-size: 11.5px; color: var(--muted); font-weight: 600; letter-spacing: 0.5px;">DUMKA ENGINEERING COLLEGE</div>
        </div>
      </div>
      <nav class="public-nav-links">
        <button class="${active === 'home' ? 'active' : ''}" onclick="navigatePublic('home')">3D Home</button>
        <button class="${active === 'resources' ? 'active' : ''}" onclick="navigatePublic('resources')">📚 Syllabus & PYQs</button>
        <button class="${active === 'gallery' ? 'active' : ''}" onclick="navigatePublic('gallery')">Campus Gallery</button>
        <button class="${active === 'academics' ? 'active' : ''}" onclick="navigatePublic('academics')">Academics & Labs</button>
        <button class="${active === 'about' ? 'active' : ''}" onclick="navigatePublic('about')">About DEC</button>
        <button class="btn-signin" onclick="navigatePublic('login')">Portal Login →</button>
      </nav>
    </header>
  `;
}

function renderPublicFooter() {
  return `
    <footer class="public-footer">
      <div class="public-footer-inner">
        <div>
          <div class="brand" style="color: white; margin-bottom: 16px;">
            <span class="brand-mark">A</span>
            <div>
              ATTENDIO <b>SHIELD 3D</b>
              <div style="font-size: 12px; color: #94a3b8; font-weight: 500;">DUMKA ENGINEERING COLLEGE</div>
            </div>
          </div>
          <p style="font-size: 15.5px; line-height: 1.75; max-width: 480px; margin: 0 0 18px;">
            Dumka Engineering College (Govt. of Jharkhand PPP Mode & Techno India Group). Powered by Attendio Shield with real-time 3D geofence presence verification and open student academic repository.
          </p>
          <div style="font-size: 14px; color: #5eead4;">
            📍 Near Government Polytechnic, Shivapahar / Sonwadangal, Dumka, Jharkhand - 814101
          </div>
        </div>
        <div>
          <h4>Academic & Resource Hub</h4>
          <ul>
            <li><a href="javascript:void(0)" onclick="navigatePublic('resources')">📚 JUT B.Tech Official Syllabus</a></li>
            <li><a href="javascript:void(0)" onclick="navigatePublic('resources')">📝 Previous Year Questions (PYQs)</a></li>
            <li><a href="javascript:void(0)" onclick="navigatePublic('gallery')">Campus & Student Photos</a></li>
            <li><a href="javascript:void(0)" onclick="navigatePublic('academics')">Departments & 3D Labs</a></li>
            <li><a href="javascript:void(0)" onclick="navigatePublic('login')">Student & Faculty Portal</a></li>
          </ul>
        </div>
        <div>
          <h4>Academic Branches</h4>
          <ul>
            <li>Computer Science & Engineering</li>
            <li>Electronics & Communication Engg.</li>
            <li>Mechanical Engineering</li>
            <li>Electrical Engineering</li>
            <li>Civil Engineering</li>
          </ul>
        </div>
      </div>
      <div class="public-footer-bottom">
        <div>© 2026 Dumka Engineering College · Attendio Shield 3D Attendance System. All rights reserved.</div>
        <div style="display: flex; gap: 20px;">
          <span>Geofence GPS: 24.2676° N, 87.2486° E</span>
          <span style="color: #10b981; font-weight:700;">3D Radar & Academic Hub: Online ●</span>
        </div>
      </div>
    </footer>
  `;
}

// 1. PAGE: 3D HOME
function publicHomePage() {
  return `
    ${renderPublicNav('home')}
    <section class="hero-section-3d">
      <canvas id="hero3DCanvas" class="threejs-bg-canvas"></canvas>
      <div class="hero-container-3d canvas-overlay-content">
        <div>
          <div class="badge-3d">
            <span>●</span> 3D CAMPUS RADAR ACTIVE · DEC DUMKA
          </div>
          <h1 class="hero-title">
            Smart Attendance,<br>
            <em>Verified in 3D Space.</em>
          </h1>
          <p class="hero-lead">
            Welcome to the official 3D interactive attendance and academic management platform of Dumka Engineering College. Combining satellite GPS perimeter verification with rotating weekly cryptographic tokens and an open student syllabus & PYQ portal.
          </p>
          <div class="hero-actions">
            <button class="btn-hero-primary" onclick="navigatePublic('login')">
              Access Institutional Portal <span>→</span>
            </button>
            <button class="btn-hero-secondary" onclick="navigatePublic('resources')">
              📚 Browse Syllabus & PYQs
            </button>
          </div>
        </div>

        <div>
          <div class="hero-3d-stack">
            <div class="hero-3d-floating-badge">3D SECURE GEOFENCE · 500M</div>
            <div class="hero-3d-main-card tilt-3d">
              <img src="/dec-campus-main.jpg" alt="Dumka Engineering College Academic Block">
              <div class="hero-3d-overlay">
                <span class="badge" style="background:#0d9488; color:white; font-size:12px; margin-bottom:8px;">OFFICIAL CAMPUS HEADQUARTERS</span>
                <h4 style="margin: 0 0 6px; font-size: 20px; font-weight: 800;">Dumka Engineering College (DEC)</h4>
                <p style="margin: 0; font-size: 14px; color: #cbd5e1;">Established in 2013 under PPP Mode by Govt. of Jharkhand and Techno India Group.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 3D Interactive Campus Model & Geofence Radar Card -->
    <section class="section-pad" style="background: #ffffff;">
      <div class="section-container">
        <div class="model-3d-card tilt-3d">
          <div class="model-3d-header">
            <div>
              <span class="badge-3d" style="font-size: 11px;">INTERACTIVE 3D VISUALIZER</span>
              <h3 style="font-family:'Manrope',sans-serif; font-size: 22px; font-weight: 800; color: var(--primary); margin: 6px 0 0;">
                DEC Shivapahar Campus 3D Geofence Matrix
              </h3>
            </div>
            <div style="font-size: 14px; color: var(--muted); font-weight: 600;">
              Coordinates: <b style="color:var(--primary);">24.2676° N, 87.2486° E</b> (Radius: 500m)
            </div>
          </div>
          <div class="model-3d-body">
            <div class="model-3d-instruction">
              <span>🖱️</span> Click & drag in 3D to rotate college citadel model
            </div>
            <canvas id="campusRadarCanvas" class="geofence-canvas"></canvas>
            <div class="geofence-info-pill">
              <div><span class="live-dot"></span><b>Real-Time Defense:</b> Satellite checks reject any remote or simulated coordinates.</div>
              <button class="text-btn" style="color:#5eead4;" onclick="navigatePublic('resources')">Open Syllabus & PYQs →</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Academic Resources Preview Strip -->
    <section class="section-pad" style="background: #f8fafc; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);">
      <div class="section-container">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 35px; flex-wrap: wrap; gap: 16px;">
          <div>
            <div class="section-tag">ACADEMIC HUB</div>
            <h2 class="section-title" style="margin-bottom: 6px;">Syllabus & Past Year Questions (PYQs)</h2>
            <p class="section-desc" style="margin: 0;">Verified curriculum guidelines & exam papers for all semesters. Open for any student or faculty to add & improve.</p>
          </div>
          <button class="btn-primary" onclick="navigatePublic('resources')">Explore All Resources & Papers →</button>
        </div>

        <div class="features-grid">
          <div class="feature-box tilt-3d" style="cursor: pointer;" onclick="navigatePublic('resources')">
            <div class="feature-box-icon">📑</div>
            <h3>JUT B.Tech Official Syllabus</h3>
            <p>Module-wise credit outlines, AICTE model guidelines, laboratory frameworks, and textbook recommendations for CSE, ECE, ME, EE, and CE.</p>
            <div style="margin-top: 16px; color: var(--accent-teal); font-weight: 700; font-size: 14px;">Open Official Syllabus →</div>
          </div>

          <div class="feature-box tilt-3d" style="cursor: pointer;" onclick="navigatePublic('resources')">
            <div class="feature-box-icon">📝</div>
            <h3>End-Semester Question Papers (PYQs)</h3>
            <p>Authentic past year question papers (2020-2025) with answer keys and model solutions contributed by students and faculty across disciplines.</p>
            <div style="margin-top: 16px; color: var(--accent-teal); font-weight: 700; font-size: 14px;">Browse Solved PYQs →</div>
          </div>

          <div class="feature-box tilt-3d" style="cursor: pointer;" onclick="navigatePublic('resources')">
            <div class="feature-box-icon">🛡️</div>
            <h3>Community Add & Edit Access</h3>
            <p>Every student and faculty member can upload documents or update link details anytime. Existing verified records are protected from unauthorized deletion.</p>
            <div style="margin-top: 16px; color: var(--accent-teal); font-weight: 700; font-size: 14px;">Contribute a Resource →</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Campus Life & Photos -->
    <section class="section-pad">
      <div class="section-container">
        <div class="section-head">
          <div class="section-tag">CAMPUS IN ACTION</div>
          <h2 class="section-title">Life at Dumka Engineering College</h2>
          <p class="section-desc">
            Discover our active campus community, state-of-the-art technological laboratories, and collaborative student spaces.
          </p>
        </div>
        <div class="photo-gallery-grid">
          ${campusPhotos.slice(0, 3).map(p => `
            <div class="gallery-card tilt-3d">
              <div class="gallery-card-img-wrap">
                <img src="${p.img}" alt="${esc(p.title)}">
                <span class="gallery-tag-pill">${p.tag}</span>
              </div>
              <div class="gallery-card-body">
                <h3>${esc(p.title)}</h3>
                <p>${esc(p.desc)}</p>
                <div class="gallery-meta">
                  <span>${esc(p.meta)}</span>
                  <a href="javascript:void(0)" onclick="navigatePublic('gallery')" style="color: var(--accent-teal); font-weight: 700; text-decoration: none;">View 3D gallery →</a>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    ${renderPublicFooter()}
  `;
}

// 2. PAGE: SYLLABUS & PYQ REPOSITORY (Interactive Add & Edit)
function publicResourcesPage() {
  return `
    ${renderPublicNav('resources')}
    <section class="hero-section-3d" style="min-height: 290px; padding: 45px 5% 55px;">
      <canvas id="hero3DCanvas" class="threejs-bg-canvas"></canvas>
      <div class="section-container canvas-overlay-content" style="text-align: center; width: 100%;">
        <div class="badge-3d">ACADEMIC RESOURCE MATRIX</div>
        <h1 class="hero-title" style="margin-bottom: 12px; font-size: clamp(34px, 4vw, 52px);">
          B.Tech Syllabus & Past Year Questions (PYQs)
        </h1>
        <p class="hero-lead" style="margin: 0 auto 24px; max-width: 760px;">
          Access verified JUT / Dumka Engineering College curriculum guidelines, mid-sem tests, and end-sem question papers. Any user can contribute or edit resources.
        </p>
        <div>
          <button class="btn-hero-primary" onclick="openAddResourceModal()">
            ＋ Add New Syllabus / PYQ Resource
          </button>
        </div>
      </div>
    </section>

    <section class="section-pad">
      <div class="section-container">
        <!-- Filter Toolbar -->
        <div class="card-3d-glass" style="padding: 24px 28px; margin-bottom: 35px; border-radius: var(--radius-md);">
          <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap; justify-content: space-between;">
            <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; flex: 1; min-width: 280px;">
              <input id="resSearch" class="field" style="max-width: 300px;" placeholder="🔍 Search subjects, codes (CS301), topics..." oninput="filterResources()">
              <select id="resCategory" class="field" style="max-width: 170px;" onchange="filterResources()">
                <option value="All">All Categories</option>
                <option value="Syllabus">📑 Syllabus</option>
                <option value="PYQ">📝 PYQs (Question Papers)</option>
                <option value="Lecture Notes">📖 Lecture Notes</option>
                <option value="Lab Manual">🔬 Lab Manuals</option>
              </select>
              <select id="resDept" class="field" style="max-width: 200px;" onchange="filterResources()">
                <option value="All">All Departments</option>
                <option value="Computer Science">Computer Science (CSE)</option>
                <option value="Electronics & Comm.">Electronics & Comm. (ECE)</option>
                <option value="Mechanical">Mechanical Engineering (ME)</option>
                <option value="Electrical">Electrical Engineering (EE)</option>
                <option value="Civil">Civil Engineering (CE)</option>
              </select>
            </div>
            <button class="btn-primary" onclick="openAddResourceModal()">
              ＋ Contribute Document
            </button>
          </div>
        </div>

        <div id="resourceGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 26px;">
          <div class="empty">Loading official academic documents…</div>
        </div>
      </div>
    </section>
    ${renderPublicFooter()}
  `;
}

async function loadResources() {
  const grid = $('#resourceGrid');
  if (!grid) return;
  try {
    const list = await api('/resources');
    allResources = list;
    renderResourceList(list);
  } catch (err) {
    grid.innerHTML = `<div class="panel danger-hint">${esc(err.message)}</div>`;
  }
}

function renderResourceList(items) {
  const grid = $('#resourceGrid');
  if (!grid) return;
  if (!items.length) {
    grid.innerHTML = `<div class="empty" style="grid-column: 1/-1;">No resources match your filter. Be the first to add one!</div>`;
    return;
  }

  grid.innerHTML = items.map(res => `
    <div class="gallery-card tilt-3d" style="background: white; border-radius: var(--radius-md);">
      <div style="padding: 22px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
        <span class="badge" style="background: ${res.category === 'Syllabus' ? '#ccfbf1' : '#fef3c7'}; color: ${res.category === 'Syllabus' ? '#0f766e' : '#b45309'}; font-weight: 800;">
          ${res.category === 'Syllabus' ? '📑 SYLLABUS' : '📝 ' + esc(res.category)}
        </span>
        <span style="font-size: 13px; font-weight: 700; color: var(--muted); background: #f8fafc; padding: 4px 10px; border-radius: 6px; border: 1px solid var(--line);">
          ${esc(res.subject_code)}
        </span>
      </div>

      <div class="gallery-card-body" style="padding: 22px 24px;">
        <h3 style="font-size: 19px; line-height: 1.4; margin-bottom: 8px;">${esc(res.title)}</h3>
        <div style="font-size: 13.5px; color: var(--accent-teal); font-weight: 700; margin-bottom: 12px;">
          ${esc(res.department)} · ${esc(res.semester)} Sem ${res.year ? `· Year ${esc(res.year)}` : ''}
        </div>
        <p style="font-size: 14.5px; color: var(--ink-secondary); line-height: 1.6; margin-bottom: 20px;">
          ${esc(res.description || 'Verified academic resource for Dumka Engineering College students.')}
        </p>

        <div style="margin-top: auto; display: flex; flex-direction: column; gap: 12px;">
          <div style="font-size: 12.5px; color: var(--muted); display: flex; justify-content: space-between;">
            <span>Contributed by: <b>${esc(res.author_name)}</b></span>
            <span>${new Date(res.created_at).toLocaleDateString()}</span>
          </div>

          <div style="display: flex; gap: 10px; padding-top: 14px; border-top: 1px solid #f1f5f9;">
            <button class="btn-primary" style="flex: 1; text-align: center; font-size: 14px; padding: 10px 14px; cursor: pointer;" onclick="viewDocumentModal(${res.id})">
              📄 View Document
            </button>
            <a href="${esc(res.doc_url)}" target="_blank" rel="noopener" class="text-btn" style="border: 1px solid var(--line); font-size: 13.5px; padding: 8px 12px; text-decoration: none; display: flex; align-items: center;" title="Open in new window">
              ↗
            </a>
            <button class="text-btn" style="border: 1px solid var(--line); font-size: 13.5px; padding: 8px 14px;" onclick="openEditResourceModal(${res.id})">
              ✏️ Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function filterResources() {
  const search = $('#resSearch')?.value.toLowerCase().trim() || '';
  const cat = $('#resCategory')?.value || 'All';
  const dept = $('#resDept')?.value || 'All';

  const filtered = allResources.filter(r => {
    const matchesCat = cat === 'All' || r.category === cat;
    const matchesDept = dept === 'All' || r.department === dept;
    const matchesSearch = !search ||
      r.title.toLowerCase().includes(search) ||
      r.subject_code.toLowerCase().includes(search) ||
      r.subject_name.toLowerCase().includes(search) ||
      (r.description && r.description.toLowerCase().includes(search));
    return matchesCat && matchesDept && matchesSearch;
  });

  renderResourceList(filtered);
}

// MODAL: ADD RESOURCE (Any user can add!)
function openAddResourceModal() {
  showModal(`
    <div class="modal-head">
      <h3>Add Syllabus or PYQ Document</h3>
      <button class="close" onclick="closeModal()">×</button>
    </div>
    <p style="font-size: 14.5px; color: var(--muted); margin-bottom: 20px;">
      Contribute course guidelines, previous year exam papers, or lecture notes. Open to all students & faculty.
    </p>

    <form id="addResourceForm" onsubmit="submitNewResource(event)">
      <div class="form-group">
        <label>Document Title *</label>
        <input id="newResTitle" class="field" placeholder="e.g. Operating Systems (CS501) JUT 2024 End-Sem Question Paper" required>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div class="form-group">
          <label>Category *</label>
          <select id="newResCategory" class="field" required>
            <option value="Syllabus">📑 Syllabus</option>
            <option value="PYQ" selected>📝 PYQ (Question Paper)</option>
            <option value="Lecture Notes">📖 Lecture Notes</option>
            <option value="Lab Manual">🔬 Lab Manual</option>
          </select>
        </div>
        <div class="form-group">
          <label>Department *</label>
          <select id="newResDept" class="field" required>
            <option value="Computer Science">Computer Science (CSE)</option>
            <option value="Electronics & Comm.">Electronics & Comm. (ECE)</option>
            <option value="Mechanical">Mechanical Engineering (ME)</option>
            <option value="Electrical">Electrical Engineering (EE)</option>
            <option value="Civil">Civil Engineering (CE)</option>
          </select>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;">
        <div class="form-group">
          <label>Subject Code *</label>
          <input id="newResCode" class="field" placeholder="CS501" required>
        </div>
        <div class="form-group">
          <label>Semester</label>
          <input id="newResSem" class="field" placeholder="5th">
        </div>
        <div class="form-group">
          <label>Academic Year</label>
          <input id="newResYear" class="field" placeholder="2024">
        </div>
      </div>

      <div class="form-group">
        <label>Document Link / URL * (PDF or Cloud Drive)</label>
        <input id="newResUrl" type="url" class="field" placeholder="https://jutranchi.ac.in/... or Google Drive URL" required>
      </div>

      <div class="form-group">
        <label>Description / Notes</label>
        <textarea id="newResDesc" class="field" style="min-height: 80px;" placeholder="Mention topics covered, question pattern, or difficulty notes..."></textarea>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div class="form-group">
          <label>Your Name</label>
          <input id="newResAuthor" class="field" placeholder="${me ? esc(me.name) : 'Student / Faculty Name'}">
        </div>
        <div class="form-group">
          <label>Contact Email</label>
          <input id="newResEmail" type="email" class="field" placeholder="${me ? esc(me.email) : 'yourname@college.edu'}">
        </div>
      </div>

      <button type="submit" class="btn-primary full" id="btnAddResSubmit">
        Upload & Publish Document <span>→</span>
      </button>
    </form>
  `);
}

async function submitNewResource(e) {
  e.preventDefault();
  const btn = $('#btnAddResSubmit');
  btn.disabled = true;
  btn.textContent = 'Publishing…';

  try {
    const payload = {
      title: $('#newResTitle').value,
      category: $('#newResCategory').value,
      department: $('#newResDept').value,
      subject_code: $('#newResCode').value,
      semester: $('#newResSem').value,
      year: $('#newResYear').value,
      doc_url: $('#newResUrl').value,
      description: $('#newResDesc').value,
      author_name: $('#newResAuthor').value || (me ? me.name : 'DEC Contributor'),
      author_email: $('#newResEmail').value || (me ? me.email : 'student@dumkaengg.edu.in')
    };

    const res = await api('/resources', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    closeModal();
    toast(res.message || 'Resource published successfully!');
    await loadResources();
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
  }
}

// MODAL: EDIT RESOURCE (Any user can edit details/links)
function openEditResourceModal(id) {
  const item = allResources.find(x => x.id === id);
  if (!item) return toast('Resource not found', true);

  showModal(`
    <div class="modal-head">
      <h3>Edit Resource Details</h3>
      <button class="close" onclick="closeModal()">×</button>
    </div>
    <p style="font-size: 14.5px; color: var(--muted); margin-bottom: 20px;">
      Update document titles, URLs, or notes. (Protected: deletion is restricted to preserve student access).
    </p>

    <form id="editResourceForm" onsubmit="submitEditResource(event, ${id})">
      <div class="form-group">
        <label>Title *</label>
        <input id="editResTitle" class="field" value="${esc(item.title)}" required>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div class="form-group">
          <label>Category</label>
          <select id="editResCategory" class="field">
            <option value="Syllabus" ${item.category === 'Syllabus' ? 'selected' : ''}>📑 Syllabus</option>
            <option value="PYQ" ${item.category === 'PYQ' ? 'selected' : ''}>📝 PYQ</option>
            <option value="Lecture Notes" ${item.category === 'Lecture Notes' ? 'selected' : ''}>📖 Lecture Notes</option>
            <option value="Lab Manual" ${item.category === 'Lab Manual' ? 'selected' : ''}>🔬 Lab Manual</option>
          </select>
        </div>
        <div class="form-group">
          <label>Department</label>
          <select id="editResDept" class="field">
            <option value="Computer Science" ${item.department === 'Computer Science' ? 'selected' : ''}>Computer Science</option>
            <option value="Electronics & Comm." ${item.department === 'Electronics & Comm.' ? 'selected' : ''}>Electronics & Comm.</option>
            <option value="Mechanical" ${item.department === 'Mechanical' ? 'selected' : ''}>Mechanical</option>
            <option value="Electrical" ${item.department === 'Electrical' ? 'selected' : ''}>Electrical</option>
            <option value="Civil" ${item.department === 'Civil' ? 'selected' : ''}>Civil</option>
          </select>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;">
        <div class="form-group">
          <label>Subject Code</label>
          <input id="editResCode" class="field" value="${esc(item.subject_code)}">
        </div>
        <div class="form-group">
          <label>Semester</label>
          <input id="editResSem" class="field" value="${esc(item.semester || '')}">
        </div>
        <div class="form-group">
          <label>Year</label>
          <input id="editResYear" class="field" value="${esc(item.year || '')}">
        </div>
      </div>

      <div class="form-group">
        <label>Document URL Link *</label>
        <input id="editResUrl" type="url" class="field" value="${esc(item.doc_url)}" required>
      </div>

      <div class="form-group">
        <label>Description</label>
        <textarea id="editResDesc" class="field" style="min-height: 80px;">${esc(item.description || '')}</textarea>
      </div>

      <div style="display: flex; gap: 12px; margin-top: 20px;">
        <button type="submit" class="btn-primary full" id="btnEditResSubmit">
          Save Changes <span>✓</span>
        </button>
      </div>
    </form>
  `);
}

async function submitEditResource(e, id) {
  e.preventDefault();
  const btn = $('#btnEditResSubmit');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const payload = {
      title: $('#editResTitle').value,
      category: $('#editResCategory').value,
      department: $('#editResDept').value,
      subject_code: $('#editResCode').value,
      semester: $('#editResSem').value,
      year: $('#editResYear').value,
      doc_url: $('#editResUrl').value,
      description: $('#editResDesc').value
    };

    const res = await api('/resources/' + id, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    closeModal();
    toast(res.message || 'Resource updated successfully!');
    await loadResources();
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
  }
}

// MODAL: DIRECT IN-APP 3D DOCUMENT VIEWER
function viewDocumentModal(id) {
  const item = allResources.find(x => x.id === id);
  if (!item) return toast('Resource not found', true);

  showModal(`
    <div class="modal-head">
      <div>
        <span class="badge" style="background:#ccfbf1;color:#0f766e;font-size:12px;margin-bottom:6px;display:inline-block;">
          ${esc(item.category)} · ${esc(item.subject_code)}
        </span>
        <h3 style="font-size: 20px; line-height: 1.3;">${esc(item.title)}</h3>
      </div>
      <button class="close" onclick="closeModal()">×</button>
    </div>
    <div style="font-size: 13.5px; color: var(--muted); margin-bottom: 15px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
      <span>Department: <b>${esc(item.department)}</b> (${esc(item.semester)} Sem)</span>
      <a href="${esc(item.doc_url)}" target="_blank" rel="noopener" style="color: var(--accent-teal); font-weight: 700; text-decoration: none;">
        Open in new tab ↗
      </a>
    </div>

    <div style="width: 100%; height: 500px; border-radius: var(--radius-sm); overflow: hidden; border: 1.5px solid var(--line); background: #f8fafc;">
      <iframe src="${esc(item.doc_url)}" style="width: 100%; height: 100%; border: 0;" title="${esc(item.title)}"></iframe>
    </div>

    <div style="margin-top: 18px; display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 13px; color: var(--muted);">Contributed by ${esc(item.author_name)}</span>
      <button class="btn-primary" onclick="closeModal()">Close Document</button>
    </div>
  `);
}

// 3. PAGE: CAMPUS GALLERY
function publicGalleryPage() {
  return `
    ${renderPublicNav('gallery')}
    <section class="hero-section-3d" style="min-height: 280px; padding: 40px 5% 50px;">
      <canvas id="hero3DCanvas" class="threejs-bg-canvas"></canvas>
      <div class="section-container canvas-overlay-content" style="text-align: center; width:100%;">
        <div class="badge-3d">VISUAL 3D ARCHITECTURE</div>
        <h1 class="hero-title" style="margin-bottom: 12px; font-size: clamp(34px, 4vw, 50px);">Dumka Engineering College Campus & Students</h1>
        <p class="hero-lead" style="margin: 0 auto; max-width: 720px;">
          Explore live campus photos, lecture facilities, cutting-edge engineering labs, and vibrant student life across our departments.
        </p>
      </div>
    </section>

    <section class="section-pad">
      <div class="section-container">
        <div class="photo-gallery-grid">
          ${campusPhotos.map(p => `
            <div class="gallery-card tilt-3d">
              <div class="gallery-card-img-wrap">
                <img src="${p.img}" alt="${esc(p.title)}">
                <span class="gallery-tag-pill">${p.tag}</span>
              </div>
              <div class="gallery-card-body">
                <h3>${esc(p.title)}</h3>
                <p>${esc(p.desc)}</p>
                <div class="gallery-meta">
                  <span>${esc(p.meta)}</span>
                  <span style="color: var(--accent-teal); font-weight: 700;">DEC Campus</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
    ${renderPublicFooter()}
  `;
}

// 4. PAGE: ACADEMICS & LABS
function publicAcademicsPage() {
  const departments = [
    {
      name: 'Computer Science & Engineering',
      code: 'CSE',
      seats: '60 Seats',
      labs: 'Advanced Programming Lab, AI & Data Science Center, Cloud Computing Facility',
      desc: 'Focusing on algorithms, artificial intelligence, cyber security, distributed computing, and full-stack software development.',
      img: '/dec-tech-lab.jpg'
    },
    {
      name: 'Electronics & Communication Engineering',
      code: 'ECE',
      seats: '60 Seats',
      labs: 'Digital Signal Processing, VLSI Design Lab, Microprocessor & Embedded Systems',
      desc: 'Encompassing semiconductor physics, modern wireless telecommunications, robotics, and integrated circuit engineering.',
      img: '/dec-lecture-hall.jpg'
    },
    {
      name: 'Mechanical Engineering',
      code: 'ME',
      seats: '60 Seats',
      labs: 'Fluid Mechanics, Thermodynamics Lab, Central Mechanical Workshop, CAD/CAM Studio',
      desc: 'Developing expertise in machine design, thermal sciences, additive manufacturing, and industrial automation.',
      img: '/dec-campus-building.jpg'
    },
    {
      name: 'Electrical Engineering',
      code: 'EE',
      seats: '60 Seats',
      labs: 'Power Systems Lab, Electric Machines Lab, Control Systems & Simulation',
      desc: 'Specializing in smart grid technologies, renewable energy integration, high-voltage systems, and power electronics.',
      img: '/dec-students-study.jpg'
    },
    {
      name: 'Civil Engineering',
      code: 'CE',
      seats: '60 Seats',
      labs: 'Geotechnical Engineering, Concrete Technology Lab, Surveying Field Unit',
      desc: 'Training engineers in structural resilience, environmental water management, and sustainable highway infrastructure.',
      img: '/dec-campus-main.jpg'
    }
  ];

  return `
    ${renderPublicNav('academics')}
    <section class="hero-section-3d" style="min-height: 280px; padding: 40px 5% 50px;">
      <canvas id="hero3DCanvas" class="threejs-bg-canvas"></canvas>
      <div class="section-container canvas-overlay-content" style="text-align: center; width:100%;">
        <div class="badge-3d">ACADEMIC EXCELLENCE</div>
        <h1 class="hero-title" style="margin-bottom: 12px; font-size: clamp(34px, 4vw, 50px);">Departments & Laboratory Infrastructure</h1>
        <p class="hero-lead" style="margin: 0 auto; max-width: 740px;">
          Dumka Engineering College offers undergraduate B.Tech degree programs affiliated with Jharkhand University of Technology (JUT) and approved by AICTE.
        </p>
      </div>
    </section>

    <section class="section-pad">
      <div class="section-container">
        <div style="display: grid; gap: 32px;">
          ${departments.map(d => `
            <div class="tilt-3d" style="display: grid; grid-template-columns: 300px 1fr; background: white; border: 1px solid var(--line); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-sm);">
              <div style="position: relative; height: 100%; min-height: 220px;">
                <img src="${d.img}" alt="${d.name}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                <span class="badge" style="position: absolute; top: 14px; left: 14px; background: rgba(7,25,47,0.85); color: white; font-weight:800;">${d.code}</span>
              </div>
              <div style="padding: 28px 34px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                  <h3 style="font-family: 'Manrope', sans-serif; font-size: 23px; font-weight: 800; color: var(--primary); margin: 0;">${d.name}</h3>
                  <span class="badge" style="background: var(--accent-teal-light); color: var(--accent-teal); font-weight:700;">${d.seats}</span>
                </div>
                <p style="font-size: 16px; color: var(--ink-secondary); line-height: 1.65; margin: 0 0 18px;">${d.desc}</p>
                <div style="background: #f8fafc; padding: 14px 20px; border-radius: var(--radius-sm); border: 1px solid #e2e8f0; font-size: 14.5px;">
                  <b style="color: var(--primary);">Key Facilities & Labs:</b> <span style="color: var(--ink-secondary);">${d.labs}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
    ${renderPublicFooter()}
  `;
}

// 5. PAGE: ABOUT DEC
function publicAboutPage() {
  return `
    ${renderPublicNav('about')}
    <section class="hero-section-3d" style="min-height: 280px; padding: 40px 5% 50px;">
      <canvas id="hero3DCanvas" class="threejs-bg-canvas"></canvas>
      <div class="section-container canvas-overlay-content" style="text-align: center; width:100%;">
        <div class="badge-3d">ABOUT THE INSTITUTION</div>
        <h1 class="hero-title" style="margin-bottom: 12px; font-size: clamp(34px, 4vw, 50px);">Dumka Engineering College</h1>
        <p class="hero-lead" style="margin: 0 auto; max-width: 740px;">
          Established in 2013 by the Government of Jharkhand under Public-Private Partnership (PPP) mode with Techno India Group.
        </p>
      </div>
    </section>

    <section class="section-pad">
      <div class="section-container">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 45px; align-items: center; margin-bottom: 70px;">
          <div>
            <div class="section-tag">VISION & MISSION</div>
            <h2 class="section-title">Catalyzing Technical Innovation in Santhal Pargana</h2>
            <p style="font-size: 16.5px; line-height: 1.8; color: var(--ink-secondary); margin-bottom: 20px;">
              Dumka Engineering College was founded with the dedicated mission of bringing world-class engineering education to the youth of Jharkhand. Located in the sub-capital city of Dumka, the college has established modern academic blocks, residential quarters, sports fields, and extensive digital library facilities.
            </p>
            <p style="font-size: 16.5px; line-height: 1.8; color: var(--ink-secondary);">
              Managed by Techno India Group—one of Eastern India's largest educational networks—students benefit from corporate training, industry-relevant curriculum, and placement assistance with top global software and core engineering firms.
            </p>
          </div>
          <div>
            <div class="tilt-3d" style="border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-3d); border: 4px solid #ffffff;">
              <img src="/dec-campus-main.jpg" alt="Dumka Engineering College Campus" style="width: 100%; height: 380px; object-fit: cover; display: block;">
            </div>
          </div>
        </div>

        <div class="features-grid">
          <div class="feature-box tilt-3d">
            <div class="feature-box-icon">🏛️</div>
            <h3>Institutional Governance</h3>
            <p>Run collaboratively by the Government of Jharkhand & Techno India Group. Affiliated to Jharkhand University of Technology (JUT), Ranchi and approved by AICTE, New Delhi.</p>
          </div>
          <div class="feature-box tilt-3d">
            <div class="feature-box-icon">🌳</div>
            <h3>Peaceful Eco-Campus</h3>
            <p>Set across a spacious green campus near Shivapahar, providing a calm, focused environment free from metropolitan noise and pollution.</p>
          </div>
          <div class="feature-box tilt-3d">
            <div class="feature-box-icon">🛡️</div>
            <h3>Smart Campus Integration</h3>
            <p>Equipped with high-speed campus WiFi, smart biometric and geofenced attendance verification, modern hostel complexes, and 24/7 security surveillance.</p>
          </div>
        </div>
      </div>
    </section>
    ${renderPublicFooter()}
  `;
}

// 6. PAGE: LOGIN
function publicLoginPage() {
  return `
    ${renderPublicNav('login')}
    <div style="padding: 40px 5%; background: var(--bg); min-height: calc(100vh - 180px); display: flex; align-items: center; justify-content: center;">
      <div class="auth-panel-container tilt-3d">
        <div class="auth-art-side">
          <div>
            <div class="brand" style="color: white; margin-bottom: 22px;">
              <span class="brand-mark">A</span>
              <div>
                ATTENDIO <b>SHIELD 3D</b>
                <div style="font-size: 11.5px; color: #99f6e4;">DUMKA ENGINEERING COLLEGE</div>
              </div>
            </div>
            <div class="eyebrow" style="color: #5eead4; margin-bottom: 8px;">VERIFIED 3D PORTAL ACCESS</div>
            <h1 style="font-family: 'Manrope', sans-serif; font-size: 36px; font-weight: 800; line-height: 1.15; margin: 0 0 16px;">
              Campus Presence,<br><span style="color: #5eead4;">Guaranteed.</span>
            </h1>
            <p style="font-size: 15.5px; color: #cbd5e1; line-height: 1.7; max-width: 380px;">
              Sign in with your verified institutional ID to view attendance records, scan weekly class QR tokens, or generate classroom sessions.
            </p>
          </div>
          <div style="margin-top: 30px;">
            <div style="display: flex; align-items: center; gap: 10px; font-size: 14px; color: #ccfbf1;">
              <span class="live-dot"></span>
              Dumka Campus GPS Perimeter Synchronized
            </div>
          </div>
        </div>

        <div class="auth-form-side">
          <div style="font-size: 12.5px; font-weight: 800; letter-spacing: 1.5px; color: var(--accent-teal);">SECURE SIGN IN</div>
          <h2>Access Your Workspace</h2>
          <p style="color: var(--muted); font-size: 15px; margin: 0 0 28px;">Enter your institutional credentials below.</p>

          <form id="loginForm">
            <div class="form-group">
              <label>Institutional Email</label>
              <input id="email" type="email" class="field" placeholder="student@attendio.demo" required autocomplete="username">
            </div>

            <div class="form-group">
              <label>Password</label>
              <div class="password-wrap">
                <input id="password" type="password" class="field" placeholder="••••••••••••" required autocomplete="current-password">
                <button type="button" class="show-pass" id="showPass">SHOW</button>
              </div>
            </div>

            <button class="btn-primary full" type="submit" id="submitLogin">
              Sign In to Portal <span>→</span>
            </button>
          </form>

          <details class="demo-box">
            <summary>Click here to view Demo Logins</summary>
            <div class="demo-box-content">
              <div>👨‍🎓 <b>Student:</b> <code style="background:#e2e8f0;padding:3px 7px;border-radius:4px;">student@attendio.demo</code></div>
              <div>👨‍🏫 <b>Faculty:</b> <code style="background:#e2e8f0;padding:3px 7px;border-radius:4px;">faculty@attendio.demo</code></div>
              <div>🏛️ <b>HOD:</b> <code style="background:#e2e8f0;padding:3px 7px;border-radius:4px;">hod@attendio.demo</code></div>
              <div style="margin-top: 10px; color: var(--accent-teal); font-weight: 700;">Password for all accounts: <code>Attendio@123</code></div>
            </div>
          </details>
        </div>
      </div>
    </div>
    ${renderPublicFooter()}
  `;
}

function navigatePublic(page) {
  activePage = page;
  const app = $('#app');
  if (page === 'home') {
    app.innerHTML = publicHomePage();
    initHero3DScene(document.getElementById('hero3DCanvas'));
    initInteractiveCampus3D('campusRadarCanvas');
  } else if (page === 'resources') {
    app.innerHTML = publicResourcesPage();
    initHero3DScene(document.getElementById('hero3DCanvas'));
    loadResources();
  } else if (page === 'gallery') {
    app.innerHTML = publicGalleryPage();
    initHero3DScene(document.getElementById('hero3DCanvas'));
  } else if (page === 'academics') {
    app.innerHTML = publicAcademicsPage();
    initHero3DScene(document.getElementById('hero3DCanvas'));
  } else if (page === 'about') {
    app.innerHTML = publicAboutPage();
    initHero3DScene(document.getElementById('hero3DCanvas'));
  } else if (page === 'login') {
    app.innerHTML = publicLoginPage();
    attachLoginHandlers();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function attachLoginHandlers() {
  const showPassBtn = $('#showPass');
  if (showPassBtn) {
    showPassBtn.onclick = () => {
      const p = $('#password');
      p.type = p.type === 'password' ? 'text' : 'password';
      showPassBtn.textContent = p.type === 'password' ? 'SHOW' : 'HIDE';
    };
  }

  const form = $('#loginForm');
  if (form) {
    form.onsubmit = async e => {
      e.preventDefault();
      const b = $('#submitLogin');
      b.disabled = true;
      b.textContent = 'Signing in…';
      try {
        const d = await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: $('#email').value,
            password: $('#password').value
          })
        });
        me = d.user;
        renderApp();
      } catch (err) {
        toast(err.message, true);
      } finally {
        b.disabled = false;
        b.innerHTML = 'Sign In to Portal <span>→</span>';
      }
    };
  }
}

// ----------------- AUTHENTICATED APP / DASHBOARD -----------------
function renderApp() {
  cleanup3D();
  document.body.classList.add('inside');
  $('#app').innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <div class="brand" onclick="go('overview')">
          <span class="brand-mark">A</span>
          <div>
            ATTENDIO <b>SHIELD 3D</b>
            <div style="font-size: 11px; color: #94a3b8; font-weight: 600;">DUMKA ENGG. COLLEGE</div>
          </div>
        </div>

        <div class="side-label">ACADEMIC WORKSPACE</div>
        <nav class="nav" id="nav"></nav>

        <div class="sidebar-bottom">
          <div class="profile-mini">
            <div class="avatar">${initials(me.name)}</div>
            <div>
              <b>${esc(me.name)}</b>
              <small>${esc(me.role)} · ${esc(me.department || 'DEC')}</small>
            </div>
          </div>
          <button class="logout" id="logout">↗ &nbsp; Sign out</button>
        </div>
      </aside>

      <section class="main">
        <header class="topbar">
          <div class="topbar-left">
            <button class="mobile-menu" id="mobileMenu">☰</button>
            <div>
              <h2 id="pageTitle">Overview</h2>
              <p>DUMKA ENGINEERING COLLEGE / <span id="crumb">OVERVIEW</span></p>
            </div>
          </div>
          <div class="top-right">
            <span class="hide-mobile"><i class="live-dot"></i> 3D Campus Geofence Active (500m)</span>
            <button class="text-btn" onclick="navigatePublic('resources')" style="border: 1px solid var(--line); font-size: 13.5px; padding: 6px 14px;">📚 Syllabus & PYQs</button>
            <button class="text-btn" onclick="navigatePublic('home')" style="border: 1px solid var(--line); font-size: 13.5px; padding: 6px 14px;">3D Website</button>
            <div class="avatar">${initials(me.name)}</div>
          </div>
        </header>
        <div class="content" id="content"></div>
      </section>
    </div>
  `;

  const items = [
    ['overview', '▦', 'Dashboard'],
    ['hub', '📚', 'Syllabus & PYQ Hub'],
    ...(me.role === 'student' ? [
      ['scan', '▣', 'Scan Attendance'],
      ['my-attendance', '◷', 'My Records']
    ] : [
      ['classes', '▤', 'Courses & Classes'],
      ['students', '♙', 'Students Directory'],
      ['reports', '▥', 'Attendance Reports'],
      ...(me.role === 'hod' ? [['manage', '⚙', 'College Administration']] : [])
    ]),
    ['campus-view', '🏛️', '3D Campus View']
  ];

  $('#nav').innerHTML = items.map(([id, ico, label]) => `
    <button data-page="${id}" class="${id === 'overview' ? 'active' : ''}">
      <span class="ico">${ico}</span>${label}
    </button>
  `).join('');

  $('#nav').onclick = e => {
    const b = e.target.closest('[data-page]');
    if (b) go(b.dataset.page);
  };

  $('#logout').onclick = logout;
  $('#mobileMenu').onclick = () => $('#sidebar').classList.toggle('open');
  go('overview');
}

async function logout() {
  try {
    await api('/auth/logout', { method: 'POST' });
  } finally {
    me = null;
    document.body.classList.remove('inside');
    navigatePublic('home');
  }
}

function go(page) {
  activePage = page;
  $('#sidebar')?.classList.remove('open');
  document.querySelectorAll('[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === page));

  const titles = {
    overview: '3D Attendance Dashboard',
    hub: 'Academic Repository: Syllabus & PYQs',
    scan: 'Mark Attendance (Camera)',
    'my-attendance': 'My Attendance History',
    classes: 'Courses & Classroom Sessions',
    students: 'Enrolled Students',
    reports: 'Attendance Analytics & Reports',
    manage: 'Department Administration',
    'campus-view': '3D Campus & Facilities'
  };

  $('#pageTitle').textContent = titles[page] || 'Overview';
  $('#crumb').textContent = (titles[page] || 'Overview').toUpperCase();
  renderPage(page);
}

function stat(label, value, sub, icon) {
  return `
    <div class="stat tilt-3d">
      <div class="stat-head">
        <span>${label}</span>
        <span class="stat-icon">${icon}</span>
      </div>
      <strong>${value}</strong>
      <small>${sub}</small>
    </div>
  `;
}

function panel(title, sub, body, action = '') {
  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h3>${title}</h3>
          ${sub ? `<div class="panel-sub">${sub}</div>` : ''}
        </div>
        ${action}
      </div>
      ${body}
    </section>
  `;
}

function status(s) {
  return `<span class="status ${esc(s)}">${esc(s)}</span>`;
}

function table(headers, rows) {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>${headers.map(x => `<th>${x}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="${headers.length}" class="empty">No records found yet.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

async function renderPage(page) {
  const root = $('#content');
  root.innerHTML = '<div class="empty">Loading your workspace…</div>';
  try {
    if (page === 'overview') return await overview(root);
    if (page === 'hub') return dashboardHubPage(root);
    if (page === 'scan') return scanPage(root);
    if (page === 'my-attendance') return await myAttendance(root);
    if (page === 'classes') return await classesPage(root);
    if (page === 'students') return await studentsPage(root);
    if (page === 'reports') return await reportsPage(root);
    if (page === 'manage') return await managePage(root);
    if (page === 'campus-view') return campusViewPage(root);
  } catch (e) {
    root.innerHTML = `<div class="panel">${esc(e.message)}</div>`;
  }
}

// DASHBOARD OVERVIEW
async function overview(root) {
  const d = await api('/dashboard'), s = d.summary;
  let stats, main;

  const campusBanner = `
    <div class="dashboard-campus-banner-3d tilt-3d">
      <div class="banner-3d-visual">
        <img src="/dec-campus-main.jpg" alt="Dumka Engineering College Academic Block">
        <span class="banner-photo-tag">📍 DEC Shivapahar Campus</span>
      </div>
      <div class="banner-content">
        <div class="eyebrow">DUMKA ENGINEERING COLLEGE · ACTIVE 3D RADAR</div>
        <h2>Welcome to DEC Smart Attendance Portal</h2>
        <p>
          Presence verification is actively enforced via real-time satellite geofencing (500m campus radius) and rotating weekly cryptographic tokens.
        </p>
        <div class="banner-stats">
          <div class="banner-stat-item">
            <b>24.2676° N, 87.2486° E</b>
            <span>GPS Anchor Coordinates</span>
          </div>
          <div class="banner-stat-item">
            <b>500m</b>
            <span>Geofence Radius</span>
          </div>
          <div class="banner-stat-item">
            <b>AICTE / JUT</b>
            <span>Institutional Affiliation</span>
          </div>
        </div>
      </div>
    </div>
  `;

  if (me.role === 'student') {
    stats = stat('ATTENDANCE RATE', s.attendance + '%', 'Across all registered classes', '◉')
      + stat('ENROLLED COURSES', s.classes, 'Your active semester subjects', '▤')
      + stat('CHECK-INS TODAY', s.markedToday, 'Attendance marked today', '✓')
      + stat('STUDENT ID', esc(me.studentId || '—'), 'Registered roll number', '♙');

    const rows = d.classes.map(c => `
      <div class="class-row">
        <div class="class-symbol">▤</div>
        <div class="class-info">
          <b>${esc(c.name)}</b>
          <small>${esc(c.code)} · ${c.attended || 0}/${c.total || 0} sessions attended</small>
          <div class="progress"><i style="width:${c.percentage}%"></i></div>
        </div>
        <span class="percent">${c.percentage}%</span>
      </div>
    `).join('') || '<div class="empty">No classes assigned yet.</div>';

    main = `
      <div class="grid-main">
        <div>
          ${panel('Course Progress', 'Attendance breakdown by subject', `<div class="class-list">${rows}</div>`, '<button class="text-btn" onclick="go(\'my-attendance\')">VIEW DETAILED HISTORY →</button>')}
          ${recentTable(d.recent, true)}
        </div>
        <div>
          <section class="panel scan-panel tilt-3d">
            <h3>Mark Attendance</h3>
            <div class="panel-sub">Scan your faculty-generated weekly QR code inside the campus.</div>
            <div class="scan-big">▦</div>
            <button class="btn-scan" onclick="go('scan')">Open QR Camera Scanner →</button>
            <div class="scan-help">Location permission is required to verify your campus presence.</div>
          </section>
          ${panel('Academic Resources Hub', 'Official Coursework & Question Papers', `
            <div style="font-size: 14.5px; line-height: 1.6; color: var(--ink-secondary); margin-bottom: 14px;">
              Directly access JUT B.Tech official syllabus, question papers, and solutions.
            </div>
            <button class="btn-primary full" onclick="go('hub')">Open Syllabus & PYQs →</button>
          `)}
        </div>
      </div>
    `;
  } else {
    stats = stat('TOTAL STUDENTS', s.students, 'Students under your department', '♙')
      + stat('TODAY’S CHECK-INS', s.today, 'Attendance entries recorded today', '✓')
      + stat('ACTIVE COURSES', s.classes, 'Class sections in your scope', '▤')
      + stat('AVERAGE ATTENDANCE', s.attendanceRate + '%', 'Overall departmental presence', '◉');

    const rows = d.classes.map(c => `
      <div class="class-row">
        <div class="class-symbol">▤</div>
        <div class="class-info">
          <b>${esc(c.name)}</b>
          <small>${esc(c.code)} · ${c.students} enrolled students</small>
        </div>
        <span class="badge">${c.scans} check-ins</span>
      </div>
    `).join('') || '<div class="empty">No classes assigned.</div>';

    main = `
      <div class="grid-main">
        <div>
          ${panel('Active Class Sections', 'Live student engagement across courses', `<div class="class-list">${rows}</div>`, '<button class="text-btn" onclick="go(\'classes\')">ALL COURSES →</button>')}
          ${recentTable(d.recent, false)}
        </div>
        <div>
          ${panel('Quick Operations', 'Frequently accessed tools', `
            <div class="quick-actions">
              <button class="action" onclick="go('classes')">
                <span>▤</span>
                <b>Class Directory</b>
              </button>
              <button class="action" onclick="go('reports')">
                <span>▥</span>
                <b>Export Reports</b>
              </button>
              <button class="action" onclick="go('students')">
                <span>♙</span>
                <b>Student Roster</b>
              </button>
              <button class="action" onclick="createQrPrompt()">
                <span>▦</span>
                <b>Generate QR</b>
              </button>
            </div>
          `)}
          ${panel('Campus Security Protocol', 'DEC Geofence Parameters', `
            <div class="hint">
              ● <b>Location:</b> Dumka Engineering College, Jharkhand<br>
              ● <b>Geofencing:</b> 500m circle around latitude 24.2676, longitude 87.2486<br>
              ● <b>Cryptographic QR:</b> 192-bit weekly token rotation<br>
              ● <b>Duplicate Guard:</b> Enforces single check-in per session
            </div>
          `)}
        </div>
      </div>
    `;
  }

  root.innerHTML = `
    <div class="welcome">
      <div>
        <h1>${me.role === 'student' ? 'Welcome back' : 'Good day'}, ${esc(me.name.split(' ')[0])}.</h1>
        <p>Dumka Engineering College 3D Smart Attendance Portal</p>
      </div>
      <div class="date-chip">◷ &nbsp;${dateLabel()}</div>
    </div>
    ${campusBanner}
    <div class="stats">${stats}</div>
    ${main}
  `;
}

// PAGE: DASHBOARD SYLLABUS & PYQ HUB
function dashboardHubPage(root) {
  root.innerHTML = `
    <div class="welcome">
      <div>
        <h1>Academic Syllabus & PYQ Hub</h1>
        <p>Browse, add, or update course guidelines and past year examination questions.</p>
      </div>
      <button class="btn-primary" onclick="openAddResourceModal()">＋ Add New Document</button>
    </div>

    <!-- Filter Toolbar -->
    <div class="card-3d-glass" style="padding: 20px 24px; margin-bottom: 28px; border-radius: var(--radius-md);">
      <div style="display: flex; gap: 14px; align-items: center; flex-wrap: wrap;">
        <input id="resSearch" class="field" style="max-width: 320px;" placeholder="🔍 Search syllabus, PYQs, subject code..." oninput="filterResources()">
        <select id="resCategory" class="field" style="max-width: 180px;" onchange="filterResources()">
          <option value="All">All Categories</option>
          <option value="Syllabus">📑 Syllabus</option>
          <option value="PYQ">📝 PYQs</option>
          <option value="Lecture Notes">📖 Lecture Notes</option>
          <option value="Lab Manual">🔬 Lab Manuals</option>
        </select>
        <select id="resDept" class="field" style="max-width: 220px;" onchange="filterResources()">
          <option value="All">All Departments</option>
          <option value="Computer Science">Computer Science</option>
          <option value="Electronics & Comm.">Electronics & Comm.</option>
          <option value="Mechanical">Mechanical</option>
          <option value="Electrical">Electrical</option>
          <option value="Civil">Civil</option>
        </select>
      </div>
    </div>

    <div id="resourceGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 24px;">
      <div class="empty">Loading academic repository…</div>
    </div>
  `;
  loadResources();
}

function recentTable(rows, student) {
  const trs = rows.map(a => `
    <tr>
      <td><b>${student ? esc(a.class_name) : esc(a.student_name)}</b></td>
      <td>${student ? esc(a.code) : esc(a.student_id || '')}</td>
      <td>${new Date(a.marked_at).toLocaleString()}</td>
      <td>${status(a.status)}</td>
    </tr>
  `).join('');
  return panel('Recent Check-ins', 'Latest timestamped attendance logs', table([student ? 'COURSE NAME' : 'STUDENT NAME', student ? 'CODE' : 'ROLL NUMBER', 'TIMESTAMP', 'STATUS'], trs));
}

// PAGE: SCANNER
function scanPage(root) {
  root.innerHTML = `
    <div class="welcome">
      <div>
        <h1>Mark Attendance via QR</h1>
        <p>Scan your faculty's current weekly QR code while located within Dumka Engineering College campus.</p>
      </div>
      <span class="badge" style="background: #ccfbf1; color: #0f766e;">GEOFENCE ACTIVE (500M)</span>
    </div>
    <div class="grid-main">
      <div>
        ${panel('QR Code Camera Scanner', 'Allow camera and GPS access when prompted', `
          <div id="reader" class="scanner"></div>
          <div class="hint">
            Your device's location will be verified against the official DEC campus boundary right after scanning.
          </div>
          <div id="scanResult"></div>
          <button class="btn-primary full" id="startScan">Start Camera Scanner</button>
          <button class="text-btn" id="stopScan" style="width: 100%; margin-top: 14px; text-align: center;">STOP CAMERA</button>
        `)}
      </div>
      <div>
        ${panel('Attendance Verification Checklist', 'Requirements for successful validation', `
          <div class="class-list">
            <div class="class-row">
              <div class="class-symbol">01</div>
              <div class="class-info">
                <b>Be Physically on Campus</b>
                <small>GPS must place you within the 500m Dumka campus perimeter.</small>
              </div>
            </div>
            <div class="class-row">
              <div class="class-symbol">02</div>
              <div class="class-info">
                <b>Use Current Weekly QR</b>
                <small>Weekly tokens expire automatically when rotated by faculty.</small>
              </div>
            </div>
            <div class="class-row">
              <div class="class-symbol">03</div>
              <div class="class-info">
                <b>Course Enrollment</b>
                <small>You must be officially registered in the specific subject.</small>
              </div>
            </div>
            <div class="class-row">
              <div class="class-symbol">04</div>
              <div class="class-info">
                <b>One Scan Per Session</b>
                <small>Duplicate scans for the same session are rejected.</small>
              </div>
            </div>
          </div>
        `)}
      </div>
    </div>
  `;
  $('#startScan').onclick = startScanner;
  $('#stopScan').onclick = stopScanner;
}

async function startScanner() {
  try {
    if (!window.Html5Qrcode) throw Error('Camera scanner library is loading. Please check internet connection.');
    if (scanner) await stopScanner();
    scanner = new Html5Qrcode('reader');
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      async decoded => {
        await stopScanner();
        let data;
        try { data = JSON.parse(decoded); } catch { data = { token: decoded }; }
        if (!data.token) throw Error('QR code format is not recognized.');
        markAttendance(data.token);
      },
      () => {}
    );
    $('#startScan').textContent = 'Scanner Active…';
  } catch (e) {
    toast(e.message, true);
  }
}

async function stopScanner() {
  if (scanner) {
    try {
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch (e) {}
    scanner = null;
  }
  if ($('#startScan')) $('#startScan').textContent = 'Start Camera Scanner';
}

async function markAttendance(token) {
  const out = $('#scanResult');
  out.innerHTML = '<div class="hint">Checking GPS position and verifying Dumka Engineering College boundary…</div>';
  if (!navigator.geolocation) {
    out.innerHTML = '<div class="hint danger-hint">Geolocation is not supported by your browser.</div>';
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async pos => {
      try {
        const d = await api('/attendance/scan', {
          method: 'POST',
          body: JSON.stringify({
            token,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          })
        });
        out.innerHTML = `<div class="hint" style="background:#dcfce7;color:#166534;border-color:#bbf7d0;">✓ ${esc(d.message)} (${d.distance}m from campus center)</div>`;
        toast(d.message);
      } catch (e) {
        out.innerHTML = `<div class="hint danger-hint">${esc(e.message)}</div>`;
        toast(e.message, true);
      }
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    e => {
      out.innerHTML = `<div class="hint danger-hint">Location access failed: ${esc(e.message)}. Please enable GPS permission and retry.</div>`;
    }
  );
}

// PAGE: MY ATTENDANCE
async function myAttendance(root) {
  const d = await api('/dashboard');
  const rows = d.recent.map(a => `
    <tr>
      <td><b>${esc(a.class_name)}</b></td>
      <td>${esc(a.code)}</td>
      <td>${new Date(a.marked_at).toLocaleString()}</td>
      <td>${status(a.status)}</td>
    </tr>
  `).join('');

  root.innerHTML = `
    <div class="welcome">
      <div>
        <h1>My Attendance History</h1>
        <p>Complete academic session logs for your enrolled semester courses.</p>
      </div>
    </div>
    <div class="stats">
      ${stat('OVERALL RATE', d.summary.attendance + '%', 'Across all registered classes', '◉')}
      ${stat('REGISTERED COURSES', d.summary.classes, 'Enrolled subjects', '▤')}
      ${stat('CHECK-INS TODAY', d.summary.markedToday, 'Today’s presence', '✓')}
      ${stat('ROLL NUMBER', esc(me.studentId || '—'), 'Registered Roll ID', '♙')}
    </div>
    <div class="grid-main">
      <div>
        ${panel('Attendance Record Register', 'Complete check-in logs', table(['COURSE NAME', 'CODE', 'TIMESTAMP', 'STATUS'], rows))}
      </div>
      <div>
        ${panel('Subject-wise Performance', 'Attendance requirement is minimum 75%', `
          <div class="class-list">
            ${d.classes.map(c => `
              <div class="class-row">
                <div class="class-info">
                  <b>${esc(c.name)}</b>
                  <small>${c.attended || 0} of ${c.total || 0} sessions attended</small>
                  <div class="progress"><i style="width:${c.percentage}%"></i></div>
                </div>
                <b class="percent">${c.percentage}%</b>
              </div>
            `).join('')}
          </div>
        `)}
      </div>
    </div>
  `;
}

// PAGE: CLASSES
async function classesPage(root) {
  const rows = await api('/classes');
  root.innerHTML = `
    <div class="welcome">
      <div>
        <h1>Course Management</h1>
        <p>${me.role === 'student' ? 'Your enrolled B.Tech courses' : 'Class sections assigned to your department'}</p>
      </div>
      ${me.role !== 'student' ? '<button class="btn-primary" onclick="createQrPrompt()">＋ Generate Weekly QR</button>' : ''}
    </div>
    <div class="stats">
      ${stat('TOTAL COURSES', rows.length, 'Available sections', '▤')}
      ${stat('DEPARTMENT', esc(me.department || 'All Departments'), 'Academic unit', '🏛️')}
    </div>
    <div class="grid-main">
      <div>
        ${panel('Course Directory', 'Course specifications & weekly QR controls', `
          <div class="class-list">
            ${rows.map(c => `
              <div class="class-row">
                <div class="class-symbol">▤</div>
                <div class="class-info">
                  <b>${esc(c.name)}</b>
                  <small>${esc(c.code)} · ${esc(c.department)} · Semester ${esc(c.semester)}</small>
                </div>
                ${me.role !== 'student' ? `<button class="text-btn" onclick="createQr(${c.id})">GENERATE QR →</button>` : ''}
              </div>
            `).join('') || '<div class="empty">No classes available.</div>'}
          </div>
        `)}
      </div>
      <div>
        ${panel('QR Token Rotation Strategy', 'Anti-fraud classroom protocol', `
          <div class="hint">
            Each new QR session generates a fresh cryptographic hash. Creating a new weekly QR automatically deactivates prior tokens, ensuring only present students scan during class.
          </div>
        `)}
      </div>
    </div>
  `;
}

async function createQrPrompt() {
  const c = await api('/classes');
  if (!c.length) return toast('No classes available.', true);
  showModal(`
    <div class="modal-head">
      <h3>Generate Weekly Classroom QR</h3>
      <button class="close" onclick="closeModal()">×</button>
    </div>
    <p>Select a course below. A new secure QR token will be generated. The previous QR session will be immediately deactivated.</p>
    <div class="form-group">
      <label>Select Course</label>
      <select id="qrClass" class="field">
        ${c.map(x => `<option value="${x.id}">${esc(x.name)} (${esc(x.code)})</option>`).join('')}
      </select>
    </div>
    <button class="btn-primary full" onclick="createQr(Number(document.querySelector('#qrClass').value))">Generate Dynamic QR Code →</button>
  `);
}

async function createQr(id) {
  try {
    const d = await api('/sessions', { method: 'POST', body: JSON.stringify({ classId: id }) });
    lastQr = d;
    showModal(`
      <div class="modal-head">
        <h3>Weekly QR Generated</h3>
        <button class="close" onclick="closeModal()">×</button>
      </div>
      <div class="qr-box">
        <span class="badge" style="background:#ccfbf1;color:#0f766e;margin-bottom:12px;display:inline-block;">${esc(d.week)} · ACTIVE NOW</span>
        <h3 style="margin: 0 0 14px; font-family:'Manrope',sans-serif; color:var(--primary);">${esc(d.className)}</h3>
        <img src="${d.qr}" alt="Attendance QR Code">
        <div class="qr-token">${esc(d.token)}</div>
        <p style="font-size: 14px; color: var(--muted); margin: 12px 0 20px;">
          Project this QR on the classroom projector or screen. Students must scan with GPS enabled from within the Dumka Engineering College campus.
        </p>
        <button class="btn-primary" onclick="downloadQr()">↓ Download QR Image</button>
      </div>
    `);
    toast('New classroom QR session activated');
  } catch (e) {
    toast(e.message, true);
  }
}

function downloadQr() {
  if (!lastQr) return;
  const a = document.createElement('a');
  a.href = lastQr.qr;
  a.download = `attendio-dec-${lastQr.week}.png`;
  a.click();
}

// PAGE: STUDENTS
async function studentsPage(root) {
  const rows = await api('/students');
  const trs = rows.map(s => `
    <tr>
      <td><b>${esc(s.name)}</b></td>
      <td>${esc(s.student_id || '—')}</td>
      <td>${esc(s.department)}</td>
      <td>Semester ${esc(s.semester || '—')}</td>
      <td><b style="color:var(--primary); font-size:15px;">${s.percentage}%</b></td>
    </tr>
  `).join('');

  root.innerHTML = `
    <div class="welcome">
      <div>
        <h1>Enrolled Students Directory</h1>
        <p>Comprehensive roster with aggregate attendance percentage across all sessions.</p>
      </div>
      <span class="badge">${rows.length} STUDENTS ENROLLED</span>
    </div>
    ${panel('Student Attendance Performance', 'Percentages calculated against total scheduled sessions', table(['STUDENT NAME', 'ROLL NUMBER', 'DEPARTMENT', 'SEMESTER', 'AGGREGATE ATTENDANCE'], trs))}
  `;
}

// PAGE: REPORTS
async function reportsPage(root) {
  const [rows, classes] = await Promise.all([api('/reports'), api('/classes')]);
  root.innerHTML = `
    <div class="welcome">
      <div>
        <h1>Attendance Reports & Register</h1>
        <p>Review, filter, and export verified attendance records.</p>
      </div>
      <button class="btn-primary" onclick="exportCsv()">↓ Export CSV Spreadsheet</button>
    </div>
    <div class="toolbar">
      <select id="filterClass">
        <option value="">All Courses</option>
        ${classes.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
      </select>
      <input id="filterDate" type="date">
      <button class="btn-primary" onclick="filterReports()">Apply Filters</button>
      <button class="text-btn" onclick="go('reports')">Reset Filters</button>
    </div>
    <div id="reportTable">${reportTable(rows)}</div>
  `;
  window.reportRows = rows;
}

function reportTable(rows) {
  return panel('Attendance Register', `${rows.length} recorded check-ins`, table(
    ['STUDENT NAME', 'ROLL ID', 'COURSE', 'DATE & TIME', 'STATUS', 'ACTION'],
    rows.map(a => `
      <tr>
        <td><b>${esc(a.student_name)}</b></td>
        <td>${esc(a.student_id || '')}</td>
        <td>${esc(a.class_name)}</td>
        <td>${new Date(a.marked_at).toLocaleString()}</td>
        <td>${status(a.status)}</td>
        <td><button class="text-btn" onclick="editAttendance(${a.id},'${a.status}')">EDIT</button></td>
      </tr>
    `).join('')
  ));
}

async function filterReports() {
  try {
    const cls = $('#filterClass').value, date = $('#filterDate').value;
    let rows = await api('/reports' + (cls ? '?classId=' + cls : ''));
    if (date) rows = rows.filter(r => r.marked_at.slice(0, 10) === date);
    window.reportRows = rows;
    $('#reportTable').innerHTML = reportTable(rows);
  } catch (e) {
    toast(e.message, true);
  }
}

function exportCsv() {
  const rows = window.reportRows || [];
  if (!rows.length) return toast('No report records to export.', true);
  const cols = ['student_name', 'student_id', 'class_name', 'status', 'marked_at', 'note'];
  const csv = [
    cols.join(','),
    ...rows.map(r => cols.map(k => '"' + String(r[k] ?? '').replace(/"/g, '""') + '"').join(','))
  ].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'DEC-Attendance-Report.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

function editAttendance(id, current) {
  showModal(`
    <div class="modal-head">
      <h3>Correct Attendance Status</h3>
      <button class="close" onclick="closeModal()">×</button>
    </div>
    <p>Authorized faculty and HOD members can manually correct a record with an audit justification.</p>
    <div class="form-group">
      <label>Attendance Status</label>
      <select class="field" id="editStatus">
        <option ${current === 'Present' ? 'selected' : ''}>Present</option>
        <option ${current === 'Late' ? 'selected' : ''}>Late</option>
        <option ${current === 'Absent' ? 'selected' : ''}>Absent</option>
      </select>
    </div>
    <div class="form-group">
      <label>Reason / Note</label>
      <input class="field" id="editNote" placeholder="e.g. Approved medical leave or network correction">
    </div>
    <button class="btn-primary full" onclick="saveAttendance(${id})">Save Correction</button>
  `);
}

async function saveAttendance(id) {
  try {
    await api('/attendance/' + id, {
      method: 'PATCH',
      body: JSON.stringify({
        status: $('#editStatus').value,
        note: $('#editNote').value
      })
    });
    closeModal();
    toast('Attendance record successfully updated');
    go('reports');
  } catch (e) {
    toast(e.message, true);
  }
}

// PAGE: ADMINISTRATION (HOD)
async function managePage(root) {
  const qr = await api('/qr/current');
  root.innerHTML = `
    <div class="welcome">
      <div>
        <h1>College Administration & Security</h1>
        <p>Department-level oversight and active QR session governance.</p>
      </div>
      <span class="badge" style="background: #e0f2fe; color: #0369a1;">HOD ACCESS GRANTED</span>
    </div>
    <div class="stats">
      ${stat('ACTIVE QR SESSIONS', qr.length, 'Currently valid classroom sessions', '▦')}
      ${stat('DEPARTMENT', esc(me.department || 'All Departments'), 'Scope of governance', '🏛️')}
    </div>
    ${panel('Active Classroom QR Sessions', 'Currently authorized sessions accepting student attendance', table(
      ['COURSE NAME', 'CODE', 'WEEK KEY', 'ACTIVATED AT'],
      qr.map(x => `
        <tr>
          <td><b>${esc(x.class_name)}</b></td>
          <td>${esc(x.code)}</td>
          <td><span class="badge">${esc(x.week_key)}</span></td>
          <td>${new Date(x.created_at).toLocaleString()}</td>
        </tr>
      `).join('')
    ))}
    ${panel('Campus Geofence Configuration', 'DEC Campus Boundary Parameters', `
      <div class="hint">
        <b>Dumka Engineering College Geofence Coordinates:</b> Latitude 24.2676, Longitude 87.2486.<br>
        <b>Validation Radius:</b> 500 Meters from central academic block.<br>
        <b>Late Arrival Threshold:</b> 15 minutes after session activation.<br>
        Changes to boundary coordinates can be configured by system administrators in the server environment variables.
      </div>
    `)}
  `;
}

// PAGE: 3D CAMPUS VIEW INSIDE DASHBOARD
function campusViewPage(root) {
  root.innerHTML = `
    <div class="welcome">
      <div>
        <h1>Dumka Engineering College Highlights & 3D Radar</h1>
        <p>Interactive 3D model, academic blocks, student laboratories, and campus facilities.</p>
      </div>
      <button class="btn-primary" onclick="navigatePublic('home')">Launch 3D Website ↗</button>
    </div>

    <div class="model-3d-card tilt-3d" style="margin-bottom: 30px;">
      <div class="model-3d-header">
        <div>
          <span class="badge-3d" style="font-size: 11px;">INTERACTIVE 3D RADAR</span>
          <h3 style="font-family:'Manrope',sans-serif; font-size: 20px; font-weight: 800; color: var(--primary); margin: 6px 0 0;">
            Dumka Engineering College Central Complex 3D Radar
          </h3>
        </div>
        <div style="font-size: 13.5px; color: var(--muted); font-weight: 600;">
          Campus Radius: <b style="color:var(--primary);">500m</b>
        </div>
      </div>
      <div class="model-3d-body" style="height: 360px;">
        <canvas id="dashboardRadarCanvas" class="geofence-canvas"></canvas>
      </div>
    </div>

    <div class="photo-gallery-grid">
      ${campusPhotos.map(p => `
        <div class="gallery-card tilt-3d">
          <div class="gallery-card-img-wrap">
            <img src="${p.img}" alt="${esc(p.title)}">
            <span class="gallery-tag-pill">${p.tag}</span>
          </div>
          <div class="gallery-card-body">
            <h3>${esc(p.title)}</h3>
            <p>${esc(p.desc)}</p>
            <div class="gallery-meta">
              <span>${esc(p.meta)}</span>
              <span style="color: var(--accent-teal); font-weight: 700;">DEC Campus</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  setTimeout(() => initInteractiveCampus3D('dashboardRadarCanvas'), 50);
}

// ----------------- MODAL HELPERS -----------------
function showModal(html) {
  closeModal();
  const d = document.createElement('div');
  d.className = 'modal-backdrop';
  d.id = 'modal';
  d.innerHTML = `<div class="modal tilt-3d">${html}</div>`;
  d.onclick = e => { if (e.target === d) closeModal(); };
  document.body.append(d);
}

function closeModal() {
  document.querySelector('#modal')?.remove();
}

// Export functions to window
window.go = go;
window.createQr = createQr;
window.createQrPrompt = createQrPrompt;
window.downloadQr = downloadQr;
window.closeModal = closeModal;
window.editAttendance = editAttendance;
window.saveAttendance = saveAttendance;
window.filterReports = filterReports;
window.exportCsv = exportCsv;
window.navigatePublic = navigatePublic;
window.openAddResourceModal = openAddResourceModal;
window.openEditResourceModal = openEditResourceModal;
window.submitNewResource = submitNewResource;
window.submitEditResource = submitEditResource;
window.filterResources = filterResources;
window.viewDocumentModal = viewDocumentModal;

// Initialize app
async function boot() {
  try {
    const d = await api('/auth/me');
    if (d.user) {
      me = d.user;
      renderApp();
      return;
    }
  } catch (e) {}
  navigatePublic('home');
}

boot();
