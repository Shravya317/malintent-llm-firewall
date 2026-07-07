/**
 * HorizontalBarChart.jsx — Top Targeted Applications.
 *
 * Visualizes the specific internal systems or endpoints (e.g., HR System, CRM)
 * that are receiving the most attack traffic in a horizontal bar format.
 *
 * @component
 */
import { useState } from 'react'
import React from 'react'

export default function HorizontalBarChart({ data, loading, error }) {
  // Filter out safe, sort by pct descending, take top 5
  const displayData = (data || [])
    .filter(item => item.label.toLowerCase() !== 'safe' && item.pct > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5)

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--card-radius)',
        boxShadow: 'var(--card-shadow)',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--card-shadow)'; }}
    >
      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', color: 'var(--text-primary)', margin: '0 0 24px', fontWeight: 600 }}>
        Top Attack Categories
      </h3>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 16, width: '100%', borderRadius: 4 }} />
          ))}
        </div>
      ) : error ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-threat)', fontFamily: 'var(--font-mono)' }}>Failed to load data</div>
      ) : displayData.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>No threats found</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, justifyContent: 'space-around' }}>
          {displayData.map((item, idx) => (
            <div 
              key={item.label}
              style={{ display: 'grid', gridTemplateColumns: '100px 1fr 40px', alignItems: 'center', gap: 12 }}
              onMouseEnter={e => {
                e.currentTarget.querySelector('.bar-fill').style.opacity = '1';
                e.currentTarget.querySelector('.bar-fill').style.boxShadow = `0 0 8px ${item.color}`;
                e.currentTarget.querySelector('.label').style.color = 'var(--text-primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.querySelector('.bar-fill').style.opacity = '0.85';
                e.currentTarget.querySelector('.bar-fill').style.boxShadow = 'none';
                e.currentTarget.querySelector('.label').style.color = 'var(--text-secondary)';
              }}
            >
              <div 
                className="label"
                style={{ 
                  fontFamily: 'var(--font-sans)', 
                  fontSize: '0.8rem', 
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  transition: 'color 0.2s ease'
                }}
                title={item.label}
              >
                {item.label}
              </div>
              <div style={{ height: 8, background: 'var(--border-faint)', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                <div 
                  className="bar-fill"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    background: item.color,
                    borderRadius: 4,
                    width: `${item.pct}%`,
                    opacity: 0.85,
                    transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease, box-shadow 0.2s ease'
                  }}
                />
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-faint)', textAlign: 'right' }}>
                {Math.round(item.pct)}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
