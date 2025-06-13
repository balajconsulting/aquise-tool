import React, { useEffect, useState } from 'react';
import { Box, Typography, Stack, ToggleButtonGroup, ToggleButton, CircularProgress } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import axios from 'axios';

const PERIODS = [
  { label: '1 Tag', value: '1d' },
  { label: '7 Tage', value: '7d' },
  { label: '30 Tage', value: '30d' },
];

export default function StatsPage() {
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line
  }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      // API: /api/leads/stats/timeseries?period=1d|7d|30d
      const res = await axios.get(`/api/leads/stats/timeseries?period=${period}`);
      setStats(res.data);
    } catch (e) {
      setError('Fehler beim Laden der Statistiken');
    }
    setLoading(false);
  };

  return (
    <Box sx={{ p: { xs: 1, md: 4 }, background: '#fff', minHeight: '100vh', color: '#23272f', width: '100%', maxWidth: '100vw', boxSizing: 'border-box' }}>
      <Typography variant="h4" fontWeight={700} mb={4}>Statistiken</Typography>
      <Stack direction="row" spacing={2} mb={4}>
        <ToggleButtonGroup value={period} exclusive onChange={(_, v) => v && setPeriod(v)}>
          {PERIODS.map(p => (
            <ToggleButton key={p.value} value={p.value}>{p.label}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>
      {loading ? <CircularProgress /> : error ? <Typography color="error">{error}</Typography> : stats && (
        <Stack spacing={6}>
          <Box>
            <Typography variant="h6" mb={2}>Leads pro Tag</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.leadsPerDay} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#2b6cb0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
          <Box>
            <Typography variant="h6" mb={2}>Durchschnittlicher Score</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={stats.avgScorePerDay} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="avgScore" stroke="#38a169" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
          <Box>
            <Typography variant="h6" mb={2}>Neue Leads pro Tag</Typography>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.newLeadsPerDay} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
          <Box>
            <Typography variant="h6" mb={2}>Fehlerhafte Jobs pro Tag</Typography>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.failedJobsPerDay} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#e53935" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Stack>
      )}
    </Box>
  );
} 