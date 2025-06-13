import React, { useContext, useEffect, useState } from 'react';
import { Box, Button, Typography, Stack, Link } from '@mui/material';
import { UserContext } from './UserContext';
import axios from 'axios';

export default function DashboardPage() {
  const { user, setUser, setToken } = useContext(UserContext);
  const [stats, setStats] = useState({});
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchJobs()]);
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/leads/stats');
      setStats(res.data);
    } catch {}
  };

  const fetchJobs = async () => {
    try {
      const res = await axios.get('/api/crawler/jobs');
      setJobs(res.data);
    } catch {}
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
  };

  const handleCrawl = async () => {
    await axios.post('/api/crawler/jobs', { source: 'default' });
    fetchJobs();
  };

  const handleScoring = async () => {
    await axios.post('/api/scoring/run');
    fetchJobs();
  };

  const handleSwipe = () => {
    window.location.hash = '#/swiper';
  };

  const offeneLeads = (stats.totalLeads ?? 0) - (stats.actions ?? 0);
  const fehlerhafteJobs = jobs.filter(j => j.status === 'error').length;
  const neueLeads = stats.newLeads || 0;

  return (
    <Box sx={{ minHeight: '100vh', width: '100vw', bgcolor: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', pt: 8 }}>
      {/* Kopfbereich */}
      <Box sx={{ width: '100%', maxWidth: 520, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 8 }}>
        <Typography variant="h5" fontWeight={600} sx={{ color: '#222' }}>Willkommen zurück{user?.username ? `, ${user.username}` : ''}</Typography>
        <Link href="#" underline="hover" sx={{ color: '#888', fontSize: 16 }} onClick={handleLogout}>Logout</Link>
      </Box>

      {/* Statistiken */}
      <Stack direction="row" spacing={6} sx={{ mb: 8 }}>
        <StatMinimal label="Leads gesamt" value={stats.totalLeads} />
        <StatMinimal label="Neue Leads" value={neueLeads} />
        <StatMinimal label="Offene Leads" value={offeneLeads} />
        <StatMinimal label="Fehlerhafte Jobs" value={fehlerhafteJobs} error={fehlerhafteJobs > 0} />
      </Stack>

      {/* Aktionen */}
      <Stack direction="row" spacing={4} sx={{ mb: 4 }}>
        <Button variant="outlined" size="large" sx={{ px: 5, fontSize: 18, borderRadius: 2, textTransform: 'none' }} onClick={handleCrawl} disabled={loading}>Neue Leads crawlen</Button>
        <Button variant="outlined" size="large" sx={{ px: 5, fontSize: 18, borderRadius: 2, textTransform: 'none' }} onClick={handleScoring} disabled={loading}>Scoring starten</Button>
      </Stack>
      <Link href="#" underline="hover" sx={{ color: '#888', fontSize: 16, mt: 2 }} onClick={handleSwipe}>Swipeboard öffnen</Link>
    </Box>
  );
}

function StatMinimal({ label, value, error }) {
  return (
    <Box sx={{ minWidth: 120, minHeight: 80, px: 3, py: 2, bgcolor: '#fafbfc', borderRadius: 2, boxShadow: '0 1px 4px #f0f0f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: error ? '1.5px solid #e53935' : '1.5px solid #e0e0e0' }}>
      <Typography variant="h4" fontWeight={700} sx={{ color: error ? '#e53935' : '#222', mb: 0.5 }}>{value ?? '-'}</Typography>
      <Typography variant="body2" sx={{ color: '#888', fontWeight: 500 }}>{label}</Typography>
    </Box>
  );
} 