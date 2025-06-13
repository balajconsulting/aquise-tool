import React from 'react';
import { NavLink } from 'react-router-dom';
import { Stack } from '@fluentui/react';

const sidebarLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/scoring', label: 'Analyse & Scoring' },
  { to: '/settings', label: 'Einstellungen' },
  // Weitere Links nach Bedarf
];

export default function Sidebar() {
  return (
    <div style={{ width: 220, background: '#23272f', color: '#fff', minHeight: '100vh', paddingTop: 32 }}>
      <Stack tokens={{ childrenGap: 16 }}>
        <div style={{ fontWeight: 'bold', fontSize: 22, textAlign: 'center', marginBottom: 32 }}>Akquise-Tool</div>
        {sidebarLinks.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => ({
              display: 'block',
              padding: '12px 24px',
              color: isActive ? '#61dafb' : '#fff',
              textDecoration: 'none',
              fontWeight: isActive ? 700 : 400,
              background: isActive ? '#181c20' : 'transparent',
              borderRadius: 6,
              margin: '0 8px',
            })}
          >
            {link.label}
          </NavLink>
        ))}
      </Stack>
    </div>
  );
} 