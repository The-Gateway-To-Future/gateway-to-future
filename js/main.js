// main.js - Handles smooth scroll, reveal animations, and initializes background

// Smooth scrolling for internal anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const targetId = this.getAttribute('href').substring(1);
    const targetElem = document.getElementById(targetId);
    if (targetElem) {
      e.preventDefault();
      targetElem.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Reveal animations using IntersectionObserver
const revealElements = document.querySelectorAll('.reveal');
const observerOptions = {
  threshold: 0.1,
};
const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('fade-in');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);
revealElements.forEach(el => revealObserver.observe(el));

// Initialize 3D background if app.js exists
if (typeof initThreeJS === 'function') {
  initThreeJS();
}
