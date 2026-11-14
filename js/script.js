/* ==========================================================================
   The Gateway to Future (GTF) - Master Client JavaScript
   Twin-Brand Architecture, Firebase SDK SSO Bridge & Dynamic Lead Engine
   Headquarters: Ketschendorfer Weg 33, 12683 Berlin
   ========================================================================== */

// ── 1. Google Cloud Firebase & Firestore Initialization ────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyDMknBXArsfivplUufLG3_m8fhCiHP2jKE",
    authDomain: "gateway-to-future.firebaseapp.com",
    projectId: "gateway-to-future",
    storageBucket: "gateway-to-future.firebasestorage.app",
    messagingSenderId: "923620323895",
    appId: "1:923620323895:web:e71b783b8641f2025105b2"
};

let db = null;
let auth = null;

if (typeof firebase !== 'undefined') {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        auth = firebase.auth();
        console.log('[GTF] Firebase Client SDK connected successfully to gateway-to-future.');
    } catch (err) {
        console.warn('[GTF] Firebase Client SDK initialization notice:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {

    // ── 2. Unified SSO (Single Sign-On) Bridge ─────────────────────────────────
    function updateSsoHeader(userName) {
        if (!userName) return;
        const shortName = userName.trim().split(' ')[0];
        
        // Desktop Header Button
        const desktopGreeting = document.getElementById('desktop-user-greeting');
        const desktopBadge = document.getElementById('portal-badge-indicator');
        const desktopBtn = document.getElementById('portal-btn-desktop');
        
        if (desktopGreeting) {
            desktopGreeting.innerHTML = `Welcome, ${shortName} <i class="fa-solid fa-circle-check" style="color: #ffd166; font-size: 0.85em; margin-left: 4px;"></i>`;
        }
        if (desktopBadge) {
            desktopBadge.textContent = 'Active';
            desktopBadge.style.background = '#10b981';
            desktopBadge.style.color = '#ffffff';
            desktopBadge.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.6)';
        }
        if (desktopBtn) {
            desktopBtn.href = 'https://app.gatewaytofuture.com/dashboard';
            desktopBtn.setAttribute('title', `Logged in as ${userName}. Click to open Student Dashboard.`);
        }

        // Mobile Header Button
        const mobileGreeting = document.getElementById('mobile-user-greeting');
        const mobileBtn = document.getElementById('portal-btn-mobile');
        if (mobileGreeting) {
            mobileGreeting.textContent = shortName;
        }
        if (mobileBtn) {
            mobileBtn.href = 'https://app.gatewaytofuture.com/dashboard';
        }
    }

    // A. Check Firebase Auth State
    if (auth) {
        auth.onAuthStateChanged((user) => {
            if (user) {
                const displayName = user.displayName || user.email.split('@')[0];
                updateSsoHeader(displayName);
                localStorage.setItem('gtf_student_user', JSON.stringify({
                    email: user.email,
                    name: displayName,
                    uid: user.uid
                }));
            }
        });
    }

    // B. Check Local Storage / Cached Session
    try {
        const cachedUserRaw = localStorage.getItem('gtf_student_user');
        if (cachedUserRaw) {
            const cachedUser = JSON.parse(cachedUserRaw);
            if (cachedUser && (cachedUser.name || cachedUser.email)) {
                updateSsoHeader(cachedUser.name || cachedUser.email.split('@')[0]);
            }
        }
    } catch (e) {
        // ignore storage errors
    }

    // ── 3. Dynamic Lead-Gen Form & Placement Test Handler (Firestore Connected) ──
    const leadForm = document.getElementById('lead-gen-form');
    const leadSuccessModal = document.getElementById('lead-success-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    if (leadForm) {
        leadForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = document.getElementById('lead-submit-btn');
            const originalBtnContent = submitBtn.innerHTML;

            const fullName = document.getElementById('lead-fullname').value.trim();
            const email = document.getElementById('lead-user-email').value.trim().toLowerCase();
            const phone = document.getElementById('lead-user-phone').value.trim();
            const targetCourse = document.getElementById('lead-target-course').value;

            if (!fullName || !email || !phone || !targetCourse) {
                alert('Please complete all required fields.');
                return;
            }

            // Loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Provisioning Portal Access...';

            const payload = {
                fullName,
                email,
                phone,
                targetCourse,
                source: 'main_website_placement_widget',
                createdAt: (typeof firebase !== 'undefined' && firebase.firestore) 
                    ? firebase.firestore.FieldValue.serverTimestamp() 
                    : new Date()
            };

            // 1. Direct Write to Cloud Firestore ('leads' collection)
            try {
                if (db) {
                    await db.collection('leads').add(payload);
                    console.log('[GTF] Lead successfully recorded in Cloud Firestore (leads collection).');
                }
            } catch (err) {
                console.warn('[GTF] Firestore client write notice (falling back to API bridge):', err);
            }

            // 2. Dispatch to Enquiries API & N8N Automation Webhook
            try {
                fetch('https://app.gatewaytofuture.com/api/enquiries', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: fullName,
                        email,
                        phone,
                        targetCourse,
                        message: 'Free 3-Minute Placement Test & B1/B2 PDF Vault Unlock Request'
                    })
                }).catch((apiErr) => console.warn('[GTF] Enquiries API dispatch notice:', apiErr));
            } catch (netErr) {
                // Non-blocking
            }

            // 3. Cache Lead User Locally & Activate SSO Header
            try {
                localStorage.setItem('gtf_student_user', JSON.stringify({
                    name: fullName,
                    email,
                    phone,
                    course: targetCourse
                }));
                updateSsoHeader(fullName);
            } catch (e) {
                // ignore
            }

            // 4. Launch Celebration Modal
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnContent;

            const modalMsg = document.getElementById('lead-success-message');
            const modalLink = document.getElementById('modal-portal-link');
            if (modalMsg) {
                modalMsg.innerHTML = `Hallo <strong>${fullName}</strong>! Your profile has been recorded in the shared Berlin cloud. Your authentic 61-page 122 Säulen B2 Grammatik book, B1 materials, and 3-minute placement test are ready on the Exam Portal.`;
            }
            if (modalLink) {
                modalLink.href = `https://app.gatewaytofuture.com/login?email=${encodeURIComponent(email)}`;
            }

            if (leadSuccessModal) {
                leadSuccessModal.classList.add('active');
                leadSuccessModal.setAttribute('aria-hidden', 'false');
            }

            leadForm.reset();
        });
    }

    // Modal Close
    if (modalCloseBtn && leadSuccessModal) {
        modalCloseBtn.addEventListener('click', () => {
            leadSuccessModal.classList.remove('active');
            leadSuccessModal.setAttribute('aria-hidden', 'true');
        });
        leadSuccessModal.addEventListener('click', (e) => {
            if (e.target === leadSuccessModal) {
                leadSuccessModal.classList.remove('active');
                leadSuccessModal.setAttribute('aria-hidden', 'true');
            }
        });
    }

    // ── 4. Strategy Call Form Submission Handler ──────────────────────────────
    const strategyForm = document.getElementById('strategy-form');
    if (strategyForm) {
        strategyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = strategyForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;

            const name = document.getElementById('strat-name').value.trim();
            const email = document.getElementById('strat-email').value.trim().toLowerCase();
            const phone = document.getElementById('strat-phone').value.trim();
            const pathway = document.getElementById('strat-pathway').value;
            const message = document.getElementById('strat-message').value.trim();

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Booking...';

            // Log to Firestore if available
            try {
                if (db) {
                    await db.collection('leads').add({
                        fullName: name,
                        email,
                        phone,
                        targetCourse: pathway,
                        source: 'strategy_call_booking',
                        message,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            } catch (err) {
                console.warn('[GTF] Strategy booking firestore notice:', err);
            }

            // Also forward to enquiries API
            try {
                fetch('https://app.gatewaytofuture.com/api/enquiries', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        email,
                        phone,
                        targetCourse: pathway,
                        message: `Strategy Call Booking (₹1,000): ${message}`
                    })
                }).catch(() => {});
            } catch (e) {}

            alert(`Thank you, ${name}! Your Strategy Call Request has been received. Founders Ashutosh Sharma & Sarbjit Kour will confirm your 9:00 PM IST slot via WhatsApp.`);
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            strategyForm.reset();
        });
    }

    // ── 5. Reveal Animations on Scroll ─────────────────────────────────────────
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    const revealElements = document.querySelectorAll(
        '.program-card, .blocked-card, .settlement-card, .founder-card, .roadmap-step, .placement-card'
    );
    revealElements.forEach((el) => {
        el.classList.add('reveal');
        observer.observe(el);
    });

    // ── 6. Header Shadow on Scroll ────────────────────────────────────────────
    const header = document.querySelector('header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 30) {
                header.style.boxShadow = '0 4px 20px rgba(10, 22, 40, 0.08)';
            } else {
                header.style.boxShadow = 'none';
            }
        });
    }

    // ── 7. Mobile Hamburger Navigation Toggle ─────────────────────────────────
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = navMenu.classList.toggle('active');
            navToggle.classList.toggle('active', isOpen);
            navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        // Close menu when a link inside is clicked
        navMenu.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    console.log('[GTF] Master Client Application & SSO Bridge initialized.');
});
