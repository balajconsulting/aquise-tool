import React, { useState, useContext } from 'react';
import { Box, CssBaseline, Drawer, Toolbar, Typography, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TableChartIcon from '@mui/icons-material/TableChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FavoriteIcon from '@mui/icons-material/Favorite';
import JobsMonitoringPage from './components/JobsMonitoringPage';
import CrawlingPage from './components/CrawlingPage';
import ScoringPage from './components/ScoringPage';
import SwipeLeads from './components/SwipeLeads';
import SettingsPage from './components/SettingsPage';
import LeadsDashboard from './components/LeadsDashboard';
import DashboardPage from './components/DashboardPage';
import { UserProvider, UserContext } from './components/UserContext';
import LoginPage from './components/LoginPage';
import StatsPage from './components/StatsPage';

const drawerWidth = 220;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon /> },
  { text: 'Leads', icon: <TableChartIcon /> },
  { text: 'Statistiken', icon: <BarChartIcon /> },
  { text: 'Crawling', icon: <BarChartIcon /> },
  { text: 'Analyse & Scoring', icon: <AssessmentIcon /> },
  { text: 'Swiper', icon: <FavoriteIcon color="error" /> },
  { text: 'Jobs & Monitoring', icon: <SettingsIcon color="info" /> },
  { text: 'Einstellungen', icon: <SettingsIcon /> },
];

function MainContent({ page }) {
  switch (page) {
    case 'Dashboard': return <DashboardPage />;
    case 'Leads': return <LeadsDashboard />;
    case 'Statistiken': return <StatsPage />;
    case 'Crawling': return <CrawlingPage />;
    case 'Analyse & Scoring': return <ScoringPage />;
    case 'Swiper': return <SwipeLeads />;
    case 'Jobs & Monitoring': return <JobsMonitoringPage />;
    case 'Einstellungen': return <SettingsPage />;
    default: return <DashboardPage />;
  }
}

function App() {
  const [page, setPage] = useState('Dashboard');
  const { user } = useContext(UserContext);

  if (!user) {
    // Zeige NUR das Login, wenn nicht eingeloggt
    return <LoginPage onLogin={() => setPage('Dashboard')} />;
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#f4f6f8', maxWidth: '100vw', overflowX: 'hidden' }}>
      <CssBaseline />
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', background: '#23272f', color: '#fff' },
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
            Akquise-Tool
          </Typography>
        </Toolbar>
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton sx={{ color: '#fff', '&:hover': { background: '#1a1d22' } }} onClick={() => setPage(item.text)}>
                <ListItemIcon sx={{ color: '#fff' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, maxWidth: 'calc(100vw - 220px)', overflowX: 'auto' }}>
        <MainContent page={page} />
      </Box>
    </Box>
  );
}

export default function AppWithProvider() {
  return (
    <UserProvider>
      <App />
    </UserProvider>
  );
}
