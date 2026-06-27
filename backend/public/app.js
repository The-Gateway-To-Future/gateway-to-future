// app.js - Gateway to Future Hub Frontend Handler

// Global Application State
const state = {
  token: localStorage.getItem('token') || null,
  user: null,
  courses: [],
  selectedLevel: 'ALL',
  activeCheckoutBookingId: null,
  activeCheckoutAmount: 0,
  activeCheckoutOrder: null,
};

const API_BASE = '/api';

// --- Initialization & Clocks ---
document.addEventListener('DOMContentLoaded', () => {
  initClocks();
  checkAuthOnLoad();
  loadCourses();
  
  // Set min date for booking date input to today
  const bookingDateInput = document.getElementById('bookingDate');
  if (bookingDateInput) {
    const today = new Date().toISOString().split('T')[0];
    bookingDateInput.min = today;
  }
});

// Running side-by-side timezone clocks
function initClocks() {
  const updateTimes = () => {
    try {
      const optionsTime = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
      const optionsDate = { month: 'short', day: 'numeric', year: 'numeric' };
      
      const now = new Date();
      
      // India Time (IST)
      const istTimeStr = now.toLocaleTimeString('en-US', { ...optionsTime, timeZone: 'Asia/Kolkata' });
      const istDateStr = now.toLocaleDateString('en-US', { ...optionsDate, timeZone: 'Asia/Kolkata' });
      
      // Germany Time (CET/CEST)
      const cetTimeStr = now.toLocaleTimeString('en-US', { ...optionsTime, timeZone: 'Europe/Berlin' });
      const cetDateStr = now.toLocaleDateString('en-US', { ...optionsDate, timeZone: 'Europe/Berlin' });
      
      document.getElementById('clockIst').textContent = istTimeStr;
      document.getElementById('dateIst').textContent = istDateStr;
      
      document.getElementById('clockCet').textContent = cetTimeStr;
      document.getElementById('dateCet').textContent = cetDateStr;
    } catch (err) {
      console.error('Error updating clocks:', err);
    }
  };
  
  updateTimes();
  setInterval(updateTimes, 1000);
}

// --- Authentication UI state ---
async function checkAuthOnLoad() {
  if (!state.token) {
    updateAuthUI(false);
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    
    if (res.status === 200) {
      const data = await res.json();
      state.user = data.user;
      updateAuthUI(true);
      loadDashboardData();
    } else {
      // Token expired or invalid
      logout();
    }
  } catch {
    updateAuthUI(false);
  }
}

function updateAuthUI(isLoggedIn) {
  const authSection = document.getElementById('authSection');
  const dashboard = document.getElementById('studentDashboard');
  const btnBookSlot = document.getElementById('btnBookSlot');
  
  if (isLoggedIn && state.user) {
    // Logged in
    authSection.innerHTML = `
      <span class="user-greeting">👋 Hi, ${state.user.name.split(' ')[0]} (${state.user.role})</span>
      <button class="btn btn-secondary" onclick="logout()">Sign Out</button>
    `;
    dashboard.classList.remove('hidden');
    document.getElementById('welcomeName').textContent = state.user.name;
    document.getElementById('profileField').textContent = state.user.preferred_field || 'Not Specified';
    document.getElementById('profileLevel').textContent = state.user.qualification || 'Not Specified';
    
    if (btnBookSlot) {
      btnBookSlot.disabled = false;
      btnBookSlot.textContent = 'Proceed to Payment (₹499)';
    }
    
    loadMaterials(state.selectedLevel);
  } else {
    // Logged out
    authSection.innerHTML = `
      <button class="btn btn-secondary" onclick="showAuthModal('login')">Sign In</button>
      <button class="btn btn-primary" onclick="showAuthModal('register')">Register</button>
    `;
    dashboard.classList.add('hidden');
    
    if (btnBookSlot) {
      btnBookSlot.disabled = true;
      btnBookSlot.textContent = 'Sign In to Book Session';
    }
    
    renderMockMaterials(false);
  }
}

// Modal handling
function showAuthModal(tab) {
  document.getElementById('authModal').classList.remove('hidden');
  switchAuthTab(tab);
}

function closeAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  
  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
  }
}

// --- API Request Handlers ---

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    if (res.ok) {
      state.token = data.token;
      state.user = data.user;
      localStorage.setItem('token', data.token);
      
      closeAuthModal();
      updateAuthUI(true);
      loadDashboardData();
      alert('Welcome back! Signed in successfully.');
    } else {
      alert(`Login failed: ${data.message}`);
    }
  } catch (err) {
    alert('Communication error during login.');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const phone = document.getElementById('regPhone').value;
  const qualification = document.getElementById('regQual').value;
  const preferred_field = document.getElementById('regField').value;
  
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone, qualification, preferred_field })
    });
    
    const data = await res.json();
    if (res.status === 211 || res.status === 200) {
      state.token = data.token;
      state.user = data.user;
      localStorage.setItem('token', data.token);
      
      closeAuthModal();
      updateAuthUI(true);
      loadDashboardData();
      alert('Registration successful! Welcome to Gateway to Future.');
    } else {
      alert(`Registration failed: ${data.message}`);
    }
  } catch (err) {
    alert('Communication error during registration.');
  }
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('token');
  updateAuthUI(false);
  
  // Reset date picker
  document.getElementById('bookingDate').value = '';
  document.getElementById('slotAvailability').classList.add('hidden');
}

// Load student details
async function loadDashboardData() {
  if (!state.token) return;
  loadBookings();
  loadAppointments();
}

// --- Courses Module ---
async function loadCourses() {
  const coursesGrid = document.getElementById('coursesGrid');
  try {
    const res = await fetch(`${API_BASE}/courses`);
    const data = await res.json();
    
    if (res.ok) {
      state.courses = data.courses;
      renderCourses();
    } else {
      coursesGrid.innerHTML = `<p class="text-muted">Failed to load courses: ${data.message}</p>`;
    }
  } catch (err) {
    coursesGrid.innerHTML = '<p class="text-muted">Error connecting to server to load course catalog.</p>';
  }
}

function renderCourses() {
  const coursesGrid = document.getElementById('coursesGrid');
  if (state.courses.length === 0) {
    coursesGrid.innerHTML = '<p class="text-muted">No courses available at this time.</p>';
    return;
  }
  
  coursesGrid.innerHTML = state.courses.map(c => `
    <div class="card glass course-card">
      <div class="course-header">
        <span class="badge badge-indigo">${c.level} level</span>
        <span class="badge badge-emerald">${c.capacity - c.enrolled_count} slots left</span>
      </div>
      <h3>${c.title}</h3>
      <p>${c.description}</p>
      <div class="course-meta">
        <span>📅 Starts: ${new Date(c.start_date).toLocaleDateString()}</span>
        <span>👥 Enrolled: ${c.enrolled_count}/${c.capacity}</span>
      </div>
      <div class="course-price-row">
        <span class="course-price">₹${c.price.toLocaleString('en-IN')}</span>
        <button class="btn btn-primary" onclick="handleBookCourse('${c.id}')">Book Course</button>
      </div>
    </div>
  `).join('');
}

async function handleBookCourse(courseId) {
  if (!state.token) {
    alert('Please sign in or register to book language classes.');
    showAuthModal('login');
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/courses/${courseId}/book`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await res.json();
    if (res.status === 211 || res.status === 200) {
      alert('Booking initiated! Complete your payment details to confirm registration.');
      loadDashboardData();
      window.scrollTo({ top: 200, behavior: 'smooth' });
    } else {
      alert(`Booking failed: ${data.message}`);
    }
  } catch {
    alert('Failed to process booking request.');
  }
}

async function loadBookings() {
  const bookingsList = document.getElementById('bookingsList');
  try {
    const res = await fetch(`${API_BASE}/courses/my-bookings`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    
    const data = await res.json();
    if (res.ok) {
      renderBookings(data.bookings);
    }
  } catch {}
}

function renderBookings(bookings) {
  const bookingsList = document.getElementById('bookingsList');
  if (bookings.length === 0) {
    bookingsList.innerHTML = '<p class="text-muted">No course bookings found yet. Explore courses below to register.</p>';
    return;
  }
  
  bookingsList.innerHTML = bookings.map(b => {
    const payButton = b.payment_status === 'unpaid' 
      ? `<button class="btn btn-emerald btn-sm" onclick="initiateCheckout('${b.id}', ${b.course_price}, '${b.course_title}')">Pay Course Fee</button>`
      : '';
      
    const statusColor = b.status === 'confirmed' ? 'text-emerald' : 'text-indigo';
    const payStatusColor = b.payment_status === 'paid' ? 'text-emerald' : 'text-muted';
    
    return `
      <div class="booking-item">
        <div class="booking-item-header">
          <div class="booking-item-title">${b.course_title}</div>
          <span class="badge ${b.status === 'confirmed' ? 'badge-emerald' : 'badge-indigo'}">${b.status}</span>
        </div>
        <div class="booking-item-details">
          Level: <strong>${b.course_level}</strong> | Price: <strong>₹${(b.course_price || 0).toLocaleString('en-IN')}</strong> | Paid: <strong class="${payStatusColor}">${b.payment_status}</strong>
        </div>
        <div class="booking-item-actions">
          ${payButton}
        </div>
      </div>
    `;
  }).join('');
}

// --- Counseling Slots Module ---
async function checkSlotAvailability() {
  const dateVal = document.getElementById('bookingDate').value;
  const displayPanel = document.getElementById('slotAvailability');
  const statusLabel = document.getElementById('slotStatusLabel');
  const timeLabel = document.getElementById('slotTimeLabel');
  
  if (!dateVal) {
    displayPanel.classList.add('hidden');
    return;
  }
  
  displayPanel.classList.remove('hidden');
  statusLabel.textContent = 'Checking slot availability...';
  statusLabel.className = 'slot-status-indicator';
  
  try {
    const res = await fetch(`${API_BASE}/appointments/available-slots?date=${dateVal}`);
    const data = await res.json();
    
    if (res.ok) {
      timeLabel.textContent = data.slot;
      if (data.available) {
        statusLabel.textContent = '● Available for Scheduling';
        statusLabel.classList.add('available');
      } else {
        statusLabel.textContent = '● Already Booked';
        statusLabel.classList.add('booked');
      }
    } else {
      statusLabel.textContent = `Error: ${data.message}`;
      statusLabel.classList.add('booked');
    }
  } catch {
    statusLabel.textContent = 'Error checking slot availability';
    statusLabel.classList.add('booked');
  }
}

async function handleBookAppointment(e) {
  e.preventDefault();
  if (!state.token) {
    alert('Please sign in or register to schedule strategy sessions.');
    return;
  }
  
  const date = document.getElementById('bookingDate').value;
  const notes = document.getElementById('bookingNotes').value;
  
  try {
    const res = await fetch(`${API_BASE}/payments/counseling/checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ date, notes })
    });
    
    const data = await res.json();
    if (res.status === 211 || res.status === 200) {
      state.activeCheckoutType = 'counseling';
      state.activeCheckoutDate = date;
      state.activeCheckoutNotes = notes;
      state.activeCheckoutAmount = 499;
      state.activeCheckoutOrder = data.razorpay_order;
      
      // Populate Checkout Modal
      document.getElementById('checkoutItemTitle').textContent = '1:1 Counseling Strategy Session';
      document.getElementById('checkoutAmountLabel').textContent = '₹499.00';
      document.getElementById('rzpOrderIdLabel').textContent = data.razorpay_order.id;
      
      showCheckoutScreen('select');
      document.getElementById('checkoutModal').classList.remove('hidden');
    } else {
      alert(`Booking checkout failed: ${data.message}`);
    }
  } catch {
    alert('Communication error initiating counseling booking.');
  }
}

async function loadAppointments() {
  try {
    const res = await fetch(`${API_BASE}/appointments/my-appointments`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    
    const data = await res.json();
    if (res.ok) {
      renderAppointments(data.appointments);
    }
  } catch {}
}

function renderAppointments(appointments) {
  const listPanel = document.getElementById('appointmentsList');
  if (appointments.length === 0) {
    listPanel.innerHTML = '<p class="text-muted">No scheduled counseling sessions. Book your 9:00 PM IST slot below.</p>';
    return;
  }
  
  listPanel.innerHTML = appointments.map(a => `
    <div class="appointment-item">
      <div class="appointment-item-header">
        <div class="appointment-item-title">Counseling Strategy Call</div>
        <span class="badge ${a.status === 'scheduled' ? 'badge-indigo' : 'badge-emerald'}">${a.status}</span>
      </div>
      <div class="appointment-item-details">
        Date: <strong>${a.appointment_date}</strong> | Slot: <strong>${a.time_slot}</strong>
        ${a.notes ? `<div class="mt-sm text-muted" style="margin-top:0.4rem; font-style:italic">Notes: "${a.notes}"</div>` : ''}
      </div>
    </div>
  `).join('');
}

// --- Payment simulated Checkout ---
async function initiateCheckout(bookingId, price, title) {
  state.activeCheckoutType = 'course';
  state.activeCheckoutBookingId = bookingId;
  state.activeCheckoutAmount = price;
  
  try {
    // 1. Create checkout order via API
    const res = await fetch(`${API_BASE}/payments/checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ bookingId })
    });
    
    const data = await res.json();
    if (res.status === 211 || res.status === 200) {
      state.activeCheckoutOrder = data.razorpay_order;
      
      // Populate Checkout Modal
      document.getElementById('checkoutItemTitle').textContent = title;
      document.getElementById('checkoutAmountLabel').textContent = `₹${price.toLocaleString('en-IN')}`;
      document.getElementById('rzpOrderIdLabel').textContent = data.razorpay_order.id;
      
      showCheckoutScreen('bank');
      document.getElementById('checkoutModal').classList.remove('hidden');
    } else {
      alert(`Checkout failed: ${data.message}`);
    }
  } catch {
    alert('Communication error establishing payment order.');
  }
}

function closeCheckoutModal() {
  document.getElementById('checkoutModal').classList.add('hidden');
}

function showCheckoutScreen(screen) {
  const selectScreen = document.getElementById('checkoutScreenSelect');
  const rzpScreen = document.getElementById('checkoutScreenRazorpay');
  const paypalScreen = document.getElementById('checkoutScreenPaypal');
  const bankScreen = document.getElementById('checkoutScreenBank');

  selectScreen.classList.add('hidden');
  rzpScreen.classList.add('hidden');
  paypalScreen.classList.add('hidden');
  bankScreen.classList.add('hidden');

  if (screen === 'select') {
    selectScreen.classList.remove('hidden');
  } else if (screen === 'razorpay') {
    rzpScreen.classList.remove('hidden');
  } else if (screen === 'paypal') {
    paypalScreen.classList.remove('hidden');
  } else if (screen === 'bank') {
    bankScreen.classList.remove('hidden');
  }
}

function selectPaymentMethod(method) {
  showCheckoutScreen(method);
}

async function simulatePayment(isSuccess) {
  // Close checkout modal
  closeCheckoutModal();
  
  if (!isSuccess) {
    alert('Payment canceled or declined.');
    return;
  }
  
  const orderId = state.activeCheckoutOrder.id;
  const paymentId = `pay_${Math.random().toString(36).substring(2, 10)}`;
  const signature = `mock_client_sig_${Math.random().toString(36).substring(2, 10)}`;
  
  try {
    if (state.activeCheckoutType === 'counseling') {
      const res = await fetch(`${API_BASE}/payments/counseling/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          appointment_date: state.activeCheckoutDate,
          appointment_notes: state.activeCheckoutNotes
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert('Payment simulated successfully! Counseling session scheduled.');
        document.getElementById('bookingDate').value = '';
        document.getElementById('bookingNotes').value = '';
        document.getElementById('slotAvailability').classList.add('hidden');
        loadDashboardData();
      } else {
        alert(`Verification failed: ${data.message}`);
      }
    } else {
      // Send mock success verification parameters for courses
      const res = await fetch(`${API_BASE}/payments/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert('Payment simulated successfully! Registration confirmed.');
        loadDashboardData();
        loadCourses(); // Refresh enrollment slots counts
      } else {
        alert(`Verification failed: ${data.message}`);
      }
    }
  } catch {
    alert('Error connecting to verify payment signature.');
  }
}

function confirmManualPayment(method) {
  closeCheckoutModal();
  if (state.activeCheckoutType === 'counseling') {
    document.getElementById('bookingDate').value = '';
    document.getElementById('bookingNotes').value = '';
    document.getElementById('slotAvailability').classList.add('hidden');
    
    const whatsappUrl = `https://wa.me/918126933346?text=${encodeURIComponent(`Hi Gateway to Future, I have completed my ₹499 counseling payment via ${method} for ${state.activeCheckoutDate}. Here is my receipt screenshot.`)}`;
    window.location.href = whatsappUrl;
  } else {
    const whatsappUrl = `https://wa.me/918126933346?text=${encodeURIComponent(`Hi Gateway to Future, I have completed my payment via ${method} for course enrollment. Here is my receipt screenshot.`)}`;
    window.location.href = whatsappUrl;
  }
}

// --- Materials Library Module ---
async function loadMaterials(level) {
  state.selectedLevel = level;
  
  // Highlight active filter tab
  const tabs = document.querySelectorAll('.filter-tab');
  tabs.forEach(tab => {
    const tabText = tab.textContent.toLowerCase();
    if ((level === 'ALL' && tabText.includes('all')) || 
        (level !== 'ALL' && tabText.includes(level.toLowerCase()))) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  const grid = document.getElementById('materialsGrid');
  if (!state.token) {
    renderMockMaterials(false);
    return;
  }
  
  grid.innerHTML = '<div class="loading-spinner">Loading files...</div>';
  
  try {
    const res = await fetch(`${API_BASE}/materials?level=${level}`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    
    const data = await res.json();
    if (res.ok) {
      renderMaterials(data.materials);
    } else {
      grid.innerHTML = `<p class="text-muted">Error: ${data.message}</p>`;
    }
  } catch {
    grid.innerHTML = '<p class="text-muted">Error loading materials library.</p>';
  }
}

function renderMaterials(materials) {
  const grid = document.getElementById('materialsGrid');
  if (materials.length === 0) {
    grid.innerHTML = '<p class="text-muted text-center padding-lg">No educational materials available for this filter level.</p>';
    return;
  }
  
  grid.innerHTML = materials.map(m => {
    const icon = m.type === 'PDF' ? '📄' : '🎥';
    const actionLabel = m.type === 'PDF' ? 'Download PDF' : 'Watch Video';
    
    // Video elements use embeds, PDFs use target blank downloads
    const linkTarget = m.type === 'VIDEO' ? `onclick="playVideoModal('${m.title}', '${m.url}')" href="#materials"` : `href="${m.url}" target="_blank"`;
    
    return `
      <div class="card glass material-card">
        <div class="material-icon">${icon}</div>
        <div class="material-content">
          <h4>${m.title}</h4>
          <p>${m.description}</p>
          <div class="material-download-row">
            <span class="material-badge">${m.level} resources</span>
            <a ${linkTarget} class="material-link">${actionLabel} →</a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Renders blurred simulated downloads for logged-out view
function renderMockMaterials(loggedIn) {
  const grid = document.getElementById('materialsGrid');
  
  const mockItems = [
    { title: 'Gateway to Future - Ausbildung Germany Guide (2026)', desc: 'Our flagship 50-page guide detailing Ausbildung requirements, vocational schools, salary expectations, and top target sectors (Nursing, IT, Mechatronics).', level: 'ALL', type: 'PDF' },
    { title: 'German Standard CV (Europass / Lebenslauf) Template', desc: 'Fully formatted, German-compliant resume template. Essential layout for securing Ausbildung contracts and direct interviews.', level: 'ALL', type: 'PDF' },
    { title: 'Goethe A1 German Vocabulary Prep Sheets', desc: 'Curated 650 words with English translations and usage examples. Essential study guide to guarantee passing your Goethe-Zertifikat A1.', level: 'A1', type: 'PDF' }
  ];
  
  grid.innerHTML = mockItems.map(m => `
    <div class="card glass material-card" style="opacity: 0.65; filter: blur(0.5px)">
      <div class="material-icon">${m.type === 'PDF' ? '📄' : '🎥'}</div>
      <div class="material-content">
        <h4>${m.title}</h4>
        <p>${m.desc}</p>
        <div class="material-download-row">
          <span class="material-badge">${m.level} resources</span>
          <span class="text-muted" style="font-size:0.85rem">🔐 Premium Content</span>
        </div>
      </div>
    </div>
  `).join('') + `
    <div style="grid-column: 1 / -1; text-align: center; margin-top: 1rem;">
      <button class="btn btn-primary" onclick="showAuthModal('login')">Sign In to Access Materials Library</button>
    </div>
  `;
}

// Helper to play embedded video
function playVideoModal(title, url) {
  // Basic video player trigger
  alert(`Playing Educational Video: "${title}"\nSource Link: ${url}`);
}

// Starfield background canvas runner
const canvas = document.getElementById('space');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let w, h, dpr, particles;
  
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.8);
    w = canvas.width = window.innerWidth * dpr;
    h = canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(100, Math.floor(window.innerWidth / 12));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      z: Math.random() * 1,
      r: Math.random() * 1.5 + 0.2,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
    }));
  }
  
  function draw() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx * (p.z + 0.3);
      p.y += p.vy * (p.z + 0.3);
      
      if (p.x < -20) p.x = window.innerWidth + 20;
      if (p.x > window.innerWidth + 20) p.x = -20;
      if (p.y < -20) p.y = window.innerHeight + 20;
      if (p.y > window.innerHeight + 20) p.y = -20;
      
      ctx.beginPath();
      ctx.fillStyle = `rgba(99, 102, 241, ${0.05 + p.z * 0.15})`;
      ctx.arc(p.x, p.y, p.r + p.z * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  
  window.addEventListener('resize', resize);
  resize();
  draw();
}
