import React, { useEffect, useState, useRef } from 'react';
import { Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Chip, Box, CircularProgress } from '@mui/material';
import axios from 'axios';

const statusColor = status => {
  switch (status) {
    case 'Läuft': return 'info';
    case 'running': return 'info';
    case 'Abgeschlossen': return 'success';
    case 'finished': return 'success';
    case 'Fehler': return 'error';
    case 'error': return 'error';
    case 'pending': return 'warning';
    default: return 'default';
  }
};

function jobsEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return false;
  }
  return true;
}

function JobsMonitoringPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState({});
  const jobsRef = useRef([]);

  const fetchJobs = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/crawler/jobs');
      const newJobs = res.data;
      if (!jobsEqual(newJobs, jobsRef.current)) {
        setJobs(newJobs);
        jobsRef.current = newJobs;
      }
    } catch (e) {
      setJobs([]);
      jobsRef.current = [];
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000); // Polling alle 5s
    return () => clearInterval(interval);
  }, []);

  const handleRestart = async (id) => {
    setRestarting(r => ({ ...r, [id]: true }));
    try {
      await axios.patch(`http://localhost:5000/api/crawler/jobs/${id}/restart`);
      await fetchJobs();
    } catch {}
    setRestarting(r => ({ ...r, [id]: false }));
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        Jobs & Monitoring
      </Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Typ</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Gestartet</TableCell>
              <TableCell>Dauer</TableCell>
              <TableCell>Ergebnis</TableCell>
              <TableCell>Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center"><CircularProgress /></TableCell></TableRow>
            ) : jobs.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">Keine Jobs gefunden</TableCell></TableRow>
            ) : jobs.map(job => (
              <TableRow key={job.id}>
                <TableCell>{job.type}</TableCell>
                <TableCell><Chip label={job.status} color={statusColor(job.status)} /></TableCell>
                <TableCell>{job.started}</TableCell>
                <TableCell>{job.duration}</TableCell>
                <TableCell>{job.result}</TableCell>
                <TableCell>
                  <Button size="small" variant="outlined" sx={{ mr: 1 }}>Details</Button>
                  {(job.status === 'Fehler' || job.status === 'error') && (
                    <Button size="small" color="error" variant="contained" onClick={() => handleRestart(job.id)} disabled={!!restarting[job.id]}>
                      {restarting[job.id] ? <CircularProgress size={18} /> : 'Neu starten'}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default JobsMonitoringPage; 