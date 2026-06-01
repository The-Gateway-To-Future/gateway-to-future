import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { useEffect } from 'react';
import ThemeToggle from './components/ThemeToggle';
import Home from './pages/Home';
import About from './pages/About';
import Courses from './pages/Courses';
import Blog from './pages/Blog';
import Resources from './pages/Resources';
import Contact from './pages/Contact';

function App() {
  const location = useLocation();
  // Apply light theme on Home page, preserve saved theme elsewhere
  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'light';
    if (location.pathname === '/') {
      document.documentElement.dataset.theme = 'light';
    } else {
      document.documentElement.dataset.theme = saved;
    }
  }, [location]);

  return (
    <HelmetProvider>
      <Router>
        <header className="site-header">
          <div className="logo">GTF</div>
          <nav className="menu">
            <Link to="/">Home</Link>
            <Link to="/courses">Programs</Link>
            <Link to="/about">About</Link>
            <Link to="/resources">Resources</Link>
            <Link to="/blog">Blog</Link>
            <Link className="cta-mini" to="/contact">Book strategy call</Link>
          </nav>
          {location.pathname !== '/' && <ThemeToggle />}
        </header>
        <main className="site-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </main>
        <footer className="site-footer">
          <p>© 2026 The Gateway To Future. All rights reserved.</p>
        </footer>
      </Router>
    </HelmetProvider>
  );
}

export default App;
