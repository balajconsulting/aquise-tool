import React from "react";
import LeadsDashboard from "./components/LeadsDashboard";
import ScoringPage from "./components/ScoringPage";
import { ThemeProvider } from '@fluentui/react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import { useContext } from 'react';
import { UserContext } from './components/UserContext';
import UserMenu from './components/UserMenu';
import { UserProvider } from './components/UserContext';
import ProfilePage from './components/ProfilePage';
import SettingsPage from './components/SettingsPage';
import Sidebar from './components/Sidebar';

function AppRoutes() {
  const { user } = useContext(UserContext);
  if (!user) {
    return <LoginPage />;
  }
  return (
    <Routes>
      <Route path="/dashboard" element={<LeadsDashboard />} />
      <Route path="/scoring" element={<ScoringPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/change-password" element={<ProfilePage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<LeadsDashboard />} />
    </Routes>
  );
}

function AppLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <nav style={{ display: 'flex', gap: 24, padding: 16, background: '#f7fafd', borderBottom: '1px solid #e3e3e3', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 24 }}>
            <Link to="/dashboard" style={{ fontWeight: 600, color: '#1a237e', textDecoration: 'none' }}>Dashboard</Link>
            <Link to="/scoring" style={{ fontWeight: 600, color: '#1a237e', textDecoration: 'none' }}>Analyse & Scoring</Link>
          </div>
          <UserMenu />
        </nav>
        <div style={{ flex: 1 }}>
          <AppRoutes />
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <Router>
          <AppLayout />
        </Router>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App; 