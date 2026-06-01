import React from 'react';
import { Link } from 'react-router-dom';
import ThreeBackground from './ThreeBackground';
import ThemeToggle from './ThemeToggle';

export default function Layout({ children }) {
  return (
    <>
      <ThreeBackground />
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
        {/* ThemeToggle shown on all pages except home */}
        <ThemeToggle />
      </header>
      <main id="content" className="shell">
        {children}
      </main>
      <footer className="site-footer">
        <p>© 2026 The Gateway To Future. All rights reserved.</p>
      </footer>
    </>
  );
}
