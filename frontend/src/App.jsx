import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ThemeToggle from './components/ThemeToggle';
import Layout from './components/Layout';
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
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </Layout>
      </Router>
    </HelmetProvider>
  );
}

export default App;

