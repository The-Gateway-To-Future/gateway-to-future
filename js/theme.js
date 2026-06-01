// theme.js - Handles dark mode toggle and persistence

(function () {
  const toggleBtn = document.getElementById('theme-toggle');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  // Apply saved theme or system preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.body.classList.toggle('dark', savedTheme === 'dark');
  } else {
    document.body.classList.toggle('dark', prefersDark.matches);
  }

  // Update button label based on current mode
  const updateButton = () => {
    const isDark = document.body.classList.contains('dark');
    toggleBtn.textContent = isDark ? '☀️' : '🌙';
    toggleBtn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  };

  // Initial button state
  updateButton();

  // Listen for toggle click
  toggleBtn.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateButton();
  });

  // React to system preference changes
  prefersDark.addEventListener('change', e => {
    if (!localStorage.getItem('theme')) {
      document.body.classList.toggle('dark', e.matches);
      updateButton();
    }
  });
})();
