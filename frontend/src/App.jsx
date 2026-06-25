import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { useEffect } from 'react';
import ThemeToggle from './components/ThemeToggle';
import Home from './pages/Home';
import About from './pages/About';
import Courses from './pages/Courses';
import Blog from './pages/Blog';
import Resources from './pages/Resources';
import Contact from './pages/Contact';
import CrmAgent from './pages/CrmAgent';
import CallCenter from './pages/CallCenter';
import Community from './pages/Community';

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
      <div className="bg-glow-container">
        <div className="bg-glow-1"></div>
        <div className="bg-glow-2"></div>
      </div>
      <header className="site-header">
        <div className="logo">GTF</div>
        <nav className="menu" style={{ display: 'flex', alignItems: 'center' }}>
          <Link to="/">Home</Link>
          <Link to="/courses">Programs</Link>
          <Link to="/about">About</Link>
          <Link to="/resources">Resources</Link>
          <Link to="/blog">Blog</Link>
          <Link to="/crm-agent" style={{ color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))", fontWeight: "bold" }}>🤖 AI CRM Agent</Link>
          <Link to="/call-center" style={{ color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))", fontWeight: "bold", marginLeft: "1rem" }}>📞 Call Center</Link>
          <Link to="/community" style={{ color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))", fontWeight: "bold", marginLeft: "1rem" }}>📢 Community</Link>
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
          <Route path="/crm-agent" element={<CrmAgent />} />
          <Route path="/call-center" element={<CallCenter />} />
          <Route path="/community" element={<Community />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <p>© 2026 The Gateway To Future. All rights reserved.</p>
      </footer>
    </HelmetProvider>
  );
}

export default App;
