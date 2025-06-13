import React, { useEffect, useState, useRef } from 'react';
import { Box, Paper, Typography, Button, TextField, MenuItem, Select, InputLabel, FormControl, Chip, Grid, Divider, LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress } from '@mui/material';
import axios from 'axios';

const allSources = [
  'Gelbe Seiten',
  'Yelp',
  'Firmenwebseiten',
  'Demo',
];

export default function CrawlingPage() {
  const [selectedSources, setSelectedSources] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [leadLimit, setLeadLimit] = useState(50);
  const [ort, setOrt] = useState('');
  const [jobs, setJobs] = useState([]);
  const [activeLog, setActiveLog] = useState([]); // Echte Logs
  const [loading, setLoading] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [activeCrawlJob, setActiveCrawlJob] = useState(null);
  const [umkreis, setUmkreis] = useState(999999);
  const pollingRef = useRef();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewCount, setPreviewCount] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetchJobs();
    // Prüfe beim Laden, ob ein Crawl-Job läuft
    const checkActiveCrawlJob = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/crawler/jobs');
        const jobs = res.data;
        // Finde den neuesten Crawl-Job mit Status pending oder running
        const active = jobs.find(j => (j.type === 'Crawling' || !j.type) && (j.status === 'pending' || j.status === 'running'));
        if (active) {
          setActiveCrawlJob(active);
          setProgress({ processed: active.processedLeads, total: active.totalLeads });
          pollingRef.current = setInterval(() => pollJobProgress(active.id), 2000);
        }
      } catch {}
    };
    checkActiveCrawlJob();
    return () => clearInterval(pollingRef.current);
  }, []);

  // Polling für laufende Jobs
  useEffect(() => {
    if (!activeCrawlJob) return;
    pollingRef.current = setInterval(() => pollJobProgress(activeCrawlJob.id), 2000);
    return () => clearInterval(pollingRef.current);
  }, [activeCrawlJob]);

  const fetchJobs = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/crawler/jobs');
      setJobs(res.data);
    } catch (err) {}
  };

  const pollJobProgress = async (id) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/crawler/jobs/${id}`);
      const job = res.data;
      if (job.status === 'finished' || job.status === 'error') {
        setProgress(null);
        setActiveCrawlJob(null);
        clearInterval(pollingRef.current);
        fetchJobs();
      } else {
        setProgress({ processed: job.processedLeads, total: job.totalLeads });
      }
    } catch (err) {
      if (err.message && (err.message.includes('Network Error') || (err.code && err.code === 'ERR_NETWORK'))) {
        setErrorMsg('Backend nicht erreichbar. Bitte Backend-Server starten!');
      } else {
        setErrorMsg('Fehler beim Abrufen des Crawl-Status.');
      }
      setProgress(null);
      setActiveCrawlJob(null);
      clearInterval(pollingRef.current);
    }
  };

  const handleStartJob = async () => {
    if (selectedSources.length === 0) return;
    setLoading(true);
    for (const source of selectedSources) {
      await axios.post('http://localhost:5000/api/crawler/jobs', {
        source,
        searchTerm,
        leadLimit,
        ort,
        umkreis,
      });
    }
    setLoading(false);
    setSelectedSources([]);
    setSearchTerm('');
    setLeadLimit(50);
    setOrt('');
    setUmkreis(999999);
    fetchJobs();
  };

  // Log eines Jobs laden
  const handleShowLog = async (jobId) => {
    setSelectedJobId(jobId);
    try {
      const res = await axios.get(`http://localhost:5000/api/crawler/jobs/${jobId}`);
      setActiveLog(res.data.error ? res.data.error.split('\n') : ['(Kein Log vorhanden)']);
    } catch {
      setActiveLog(['Fehler beim Laden des Logs.']);
    }
  };

  // Vorschau-Trefferzahl holen
  const fetchPreviewCount = async () => {
    setConfirmLoading(true);
    setErrorMsg(null);
    try {
      const res = await axios.get('http://localhost:5000/api/crawler/preview', {
        params: {
          source: selectedSources[0],
          searchTerm,
          ort,
          umkreis,
          leadLimit
        }
      });
      setPreviewCount(res.data.count);
    } catch (e) {
      setPreviewCount(null);
      setErrorMsg('Fehler beim Abrufen der Treffer-Vorschau.');
    }
    setConfirmLoading(false);
  };

  // Polling für Log (letzte 100 Zeilen)
  useEffect(() => {
    let logInterval;
    if (activeCrawlJob) {
      logInterval = setInterval(async () => {
        try {
          const res = await axios.get(`http://localhost:5000/api/crawler/jobs/${activeCrawlJob.id}`);
          let logLines = res.data.error ? res.data.error.split('\n') : [];
          if (logLines.length > 100) logLines = logLines.slice(-100);
          setActiveLog(logLines);
        } catch {
          setActiveLog(['Fehler beim Laden des Logs.']);
        }
      }, 2000);
    }
    return () => clearInterval(logInterval);
  }, [activeCrawlJob]);

  const handleOpenConfirm = async () => {
    if (selectedSources.length === 0) return;
    await fetchPreviewCount();
    setConfirmOpen(true);
  };

  const handleConfirmStart = async () => {
    setConfirmOpen(false);
    setLoading(true);
    setErrorMsg(null);
    try {
      let newJob = null;
      for (const source of selectedSources) {
        const res = await axios.post('http://localhost:5000/api/crawler/jobs', {
          source,
          searchTerm,
          leadLimit,
          ort,
          umkreis,
        });
        if (!newJob) newJob = res.data;
      }
      setSelectedSources([]);
      setSearchTerm('');
      setLeadLimit(50);
      setOrt('');
      setUmkreis(999999);
      fetchJobs();
      // Setze sofort das neue activeCrawlJob und starte das Polling
      if (newJob && newJob.id) {
        setActiveCrawlJob({
          id: newJob.id,
          processedLeads: 0,
          totalLeads: 0,
        });
        setProgress({ processed: 0, total: 0 });
        pollJobProgress(newJob.id); // Hole sofort den Status
      }
    } catch (e) {
      setErrorMsg('Fehler beim Starten des Crawl-Jobs.');
    }
    setLoading(false);
  };

  const handleAbort = async () => {
    if (!activeCrawlJob) return;
    try {
      await axios.patch(`http://localhost:5000/api/crawler/jobs/${activeCrawlJob.id}/status`, { status: 'error' });
      setErrorMsg('Crawl-Job wurde abgebrochen.');
      setActiveCrawlJob(null);
      setProgress(null);
      clearInterval(pollingRef.current);
      fetchJobs();
    } catch {
      setErrorMsg('Fehler beim Abbrechen des Crawl-Jobs.');
    }
  };

  return (
    <Box sx={{ p: { xs: 1, md: 4 }, background: '#f7fafd', minHeight: '100vh', color: '#23272f', width: '100%', maxWidth: '100vw', boxSizing: 'border-box' }}>
      <Typography variant="h4" fontWeight="bold" mb={3} sx={{ color: '#1a237e' }}>Crawling</Typography>
      {/* Konfigurationsbereich */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 3, background: '#fff', boxShadow: 2 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr 1fr 0.7fr 0.7fr 0.8fr' },
            gap: 2,
            alignItems: 'center',
            maxWidth: 1100,
            margin: '0 auto',
          }}
        >
          <FormControl fullWidth size="small" sx={{ maxWidth: 220 }}>
            <InputLabel>Quellen</InputLabel>
            <Select
              multiple
              value={selectedSources}
              onChange={e => setSelectedSources(e.target.value)}
              renderValue={selected => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map(value => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
              size="small"
            >
              {allSources.map(source => (
                <MenuItem key={source} value={source}>{source}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Ort/PLZ"
            value={ort}
            onChange={e => setOrt(e.target.value)}
            fullWidth
            required
            size="small"
            InputLabelProps={{ style: { fontSize: 14 } }}
            inputProps={{ style: { fontSize: 14 } }}
            sx={{ maxWidth: 160 }}
          />
          <TextField
            label="Suchbegriff (optional)"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            fullWidth
            size="small"
            InputLabelProps={{ style: { fontSize: 14 } }}
            inputProps={{ style: { fontSize: 14 } }}
            sx={{ maxWidth: 160 }}
          />
          <TextField
            label="Lead-Limit"
            type="number"
            value={leadLimit}
            onChange={e => setLeadLimit(Number(e.target.value))}
            fullWidth
            size="small"
            InputLabelProps={{ style: { fontSize: 14 } }}
            inputProps={{ style: { fontSize: 14 } }}
            sx={{ maxWidth: 120 }}
          />
          <TextField
            label="Umkreis (Meter)"
            type="number"
            value={umkreis}
            onChange={e => setUmkreis(Number(e.target.value))}
            fullWidth
            InputLabelProps={{ style: { fontSize: 14 } }}
            inputProps={{ style: { fontSize: 14 } }}
            sx={{ maxWidth: 120 }}
          />
          <Button variant="contained" color="primary" fullWidth onClick={handleOpenConfirm} disabled={loading || !!activeCrawlJob} sx={{ height: 56 }}>
            Crawl-Job starten
          </Button>
        </Box>
      </Paper>
      {/* Terminal-Log immer über der Crawl-Jobs-Übersicht anzeigen */}
      <Paper sx={{ p: 3, background: '#181c20', borderRadius: 3, minHeight: 180, color: '#0f0', fontFamily: 'Fira Mono, monospace', boxShadow: 2, mb: 4 }}>
        <Typography variant="h6" mb={2} sx={{ color: '#fff' }}>Terminal-Log (Live)</Typography>
        <Divider sx={{ mb: 1, background: '#333' }} />
        <Box sx={{ fontFamily: 'Fira Mono, monospace', color: '#0f0', background: 'transparent', minHeight: 100, maxHeight: 200, overflowY: 'auto', p: 1, fontSize: 15 }}>
          {activeLog.length === 0 ? <div>(Kein aktiver Crawl-Job)</div> : activeLog.slice(-100).map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </Box>
      </Paper>
      {/* Übersicht der Crawl-Jobs */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 3, background: '#fff', boxShadow: 2 }}>
        <Typography variant="h6" mb={2} sx={{ color: '#1a237e' }}>Crawl-Jobs Übersicht</Typography>
        {progress && progress.total > 0 && (
          <Box sx={{ mb: 2, width: 350, maxWidth: '90%' }}>
            <LinearProgress variant="determinate" value={progress.total > 0 ? (progress.processed / progress.total) * 100 : 0} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {progress.processed} von {progress.total} Leads gecrawlt
              {'  '}
              {progress.total > 0 && (
                <span style={{ marginLeft: 12, color: '#1a237e', fontWeight: 600 }}>
                  ({Math.round((progress.processed / progress.total) * 100)}%)
                </span>
              )}
              <Button variant="outlined" color="error" onClick={handleAbort} disabled={!activeCrawlJob} sx={{ ml: 2, height: 28, minWidth: 90 }}>
                Abbrechen
              </Button>
            </Typography>
          </Box>
        )}
        {errorMsg && (
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>{errorMsg}</Typography>
        )}
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', color: '#23272f', fontFamily: 'monospace', fontSize: 16, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f4ff' }}>
                <th style={{ textAlign: 'left', padding: 8 }}>ID</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Quelle</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Gestartet</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Beendet</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id} style={{ borderBottom: '1px solid #e3e3e3' }}>
                  <td style={{ padding: 8 }}>{job.id}</td>
                  <td style={{ padding: 8 }}>{job.source || job.type || '-'}</td>
                  <td style={{ padding: 8 }}>{job.status}</td>
                  <td style={{ padding: 8 }}>{job.started || ''}</td>
                  <td style={{ padding: 8 }}>{job.duration && job.duration !== '00:00:00' ? job.duration : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Paper>
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Crawl-Job bestätigen</DialogTitle>
        <DialogContent>
          {confirmLoading ? <CircularProgress /> : (
            <Box>
              <Typography variant="body1" mb={2}>
                <b>Geplante Trefferzahl:</b> {previewCount !== null ? previewCount : 'Unbekannt'}
              </Typography>
              <Typography variant="body2">Suchbegriff: <b>{searchTerm}</b></Typography>
              <Typography variant="body2">Ort/PLZ: <b>{ort}</b></Typography>
              <Typography variant="body2">Umkreis: <b>{umkreis}</b></Typography>
              <Typography variant="body2">Lead-Limit: <b>{leadLimit}</b></Typography>
            </Box>
          )}
          {errorMsg && <Typography color="error">{errorMsg}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Abbrechen</Button>
          <Button onClick={handleConfirmStart} disabled={confirmLoading || previewCount === null} variant="contained">Bestätigen & Starten</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 