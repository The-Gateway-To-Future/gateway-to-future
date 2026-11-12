/* ==========================================================================
   The Gateway to Future (GTF) - Smooth Interactive JavaScript
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Reveal Animations on Scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.program-card, .blocked-card, .settlement-card, .founder-card, .roadmap-step');
    revealElements.forEach(el => {
        el.classList.add('reveal');
        observer.observe(el);
    });

    // 2. Lead Magnet Download Form Handler
    const downloadForm = document.getElementById('download-form');
    if (downloadForm) {
        downloadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const submitBtn = downloadForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;

            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Sending Workbook... 🎁';

            setTimeout(() => {
                alert('Thank you! Your Free A1 German Starter Workbook has been sent to your email. Check your inbox!');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                downloadForm.reset();
            }, 1000);
        });
    }

    // 3. Strategy Call Form Submission Handler
    const strategyForm = document.getElementById('strategy-form');
    if (strategyForm) {
        strategyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const submitBtn = strategyForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;

            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Processing Booking...';

            setTimeout(() => {
                alert('Strategy Call Request Received! Our Berlin team (Ashutosh & Sarbjit) will confirm your 9:00 PM IST slot via WhatsApp/Email.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                strategyForm.reset();
            }, 1000);
        });
    }

    // 4. Header Shadow on Scroll
    const header = document.querySelector('header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 30) {
                header.style.boxShadow = '0 4px 20px rgba(15, 23, 42, 0.08)';
            } else {
                header.style.boxShadow = 'none';
            }
        });
    }

    // 5. Mobile Hamburger Navigation Toggle
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
        navMenu.querySelectorAll('a').forEach(link => {
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

    console.log('GTF Original Master Application initialized successfully.');
});
