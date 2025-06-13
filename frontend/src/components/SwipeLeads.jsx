import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, CircularProgress, IconButton } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';

export default function SwipeLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [swiping, setSwiping] = useState(false);

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (leads.length === 0 && !loading) {
      const interval = setInterval(() => {
        fetchLeads();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [leads.length, loading]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handleSwipe('left');
      if (e.key === 'ArrowRight') handleSwipe('right');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line
  }, [current, leads]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/leads');
      const filtered = (res.data || []).filter(
        l => l.domain && (l.manual_status === null || l.manual_status === '' || l.manual_status === undefined)
      );
      setLeads(filtered);
      setCurrent(0);
    } catch (e) {
      setLeads([]);
    }
    setLoading(false);
  };

  const handleSwipe = useCallback(async (direction) => {
    if (swiping || current >= leads.length) return;
    setSwiping(true);
    const lead = leads[current];
    let manual_status = null;
    if (direction === 'right') manual_status = 'MGG';
    if (direction === 'left') manual_status = 'MGR';
    if (manual_status) {
      try {
        await axios.patch(`/api/leads/${lead.id}`, { manual_status });
      } catch {}
    }
    setCurrent((prev) => Math.min(prev + 1, leads.length));
    setSwiping(false);
  }, [swiping, current, leads]);

  if (loading) {
    return <Box height="100vh" display="flex" alignItems="center" justifyContent="center"><CircularProgress /></Box>;
  }

  if (!leads.length || current >= leads.length) {
    return (
      <Box height="100vh" display="flex" alignItems="center" justifyContent="center" flexDirection="column">
        <Typography variant="h5" color="text.secondary">Keine Leads zum Wipen verfügbar</Typography>
        <Typography variant="body2" color="text.secondary">Alle Leads wurden bereits manuell bewertet.<br />Neue Leads werden automatisch angezeigt, sobald sie verfügbar sind.</Typography>
      </Box>
    );
  }

  const lead = leads[current];
  let url = lead.domain;
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  return (
    <Box height="100vh" display="flex" flexDirection="column" alignItems="center" justifyContent="center">
      <Box sx={{ width: 900, maxWidth: '95vw', mb: 2 }}>
        <Typography variant="h6" sx={{ textAlign: 'center', fontWeight: 600 }}>
          {lead.firm_name ? `${lead.firm_name} – ${lead.domain}` : lead.domain}
        </Typography>
      </Box>
      <Box sx={{ width: 900, maxWidth: '95vw', height: '90vh', maxHeight: 1000, mb: 2, position: 'relative', background: '#fff', borderRadius: 4, boxShadow: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <iframe
          title={lead.domain}
          src={url}
          style={{ width: '100%', height: '100%', border: '1px solid #eee', borderRadius: 8 }}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      </Box>
      <Box display="flex" justifyContent="center" alignItems="center" mt={2} gap={2}>
        <IconButton color="error" onClick={() => handleSwipe('left')} size="large">
          <CloseIcon fontSize="inherit" />
        </IconButton>
        <IconButton color="success" onClick={() => handleSwipe('right')} size="large">
          <FavoriteIcon fontSize="inherit" />
        </IconButton>
      </Box>
    </Box>
  );
} 