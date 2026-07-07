import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Menu } from 'lucide-react'
import { useTheme } from '../ThemeContext'

export default function Layout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => { document.body.style.overflow = 'auto' }
  }, [mobileMenuOpen])

  return (
    <div className="layout-container">
      
      {/* Mobile Header */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button 
            onClick={() => setMobileMenuOpen(true)} 
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 4 }}
          >
            <Menu size={24} />
          </button>
          <span style={{ fontFamily: 'var(--font-brand)', fontSize: '1.2rem', color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
            <span style={{ color: 'var(--accent-threat)' }}>MAL</span>INTENT
          </span>
        </div>
        <button 
          onClick={toggleTheme} 
          style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', textTransform: 'uppercase' }}
        >
          {theme === 'dark' ? '◐ Light' : '◑ Dark'}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {mobileMenuOpen && (
        <div 
          className="mobile-sidebar-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Wrapper */}
      <div className={`sidebar-wrapper ${mobileMenuOpen ? 'open' : ''}`}>
        <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      </div>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
