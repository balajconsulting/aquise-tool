import React, { useEffect, useState, useRef } from 'react';
import { Box, Paper, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress, Divider, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, InputLabel, FormControl, LinearProgress, Alert } from '@mui/material';
import axios from 'axios';
import PhoneIcon from '@mui/icons-material/Phone';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import { io } from 'socket.io-client';

// Socket.io-Verbindung erstellen
const socket = io('http://localhost:5000');

export default function ScoringPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [progress, setProgress] = useState(null); // Fortschritt für Scoring-Job
  const [jobId, setJobId] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState([]);
  const [sortOrder, setSortOrder] = useState('desc');
  const [categoryFilter, setCategoryFilter] = useState('Alle');
  const [selectedLead, setSelectedLead] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [manualStatus, setManualStatus] = useState(''); // '', 'MGG', 'MGR'
  const [manualStatusSort, setManualStatusSort] = useState('none'); // 'asc', 'desc', 'none'
  const pollingRef = useRef();
  const [liveMode, setLiveMode] = useState(false);
  const [liveQueue, setLiveQueue] = useState([]); // bis zu 8 Datensätze
  const [liveCurrent, setLiveCurrent] = useState(null); // aktuell bewerteter Datensatz
  const [liveResults, setLiveResults] = useState([]); // Ergebnisse

  useEffect(() => {
    fetchLeads();
    // Prüfe beim Laden, ob ein Scoring-Job läuft
    const checkActiveScoringJob = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/crawler/jobs');
        const jobs = res.data;
        // Finde den neuesten Scoring-Job mit Status pending oder running
        const active = jobs.find(j => j.type === 'Scoring' && (j.status === 'pending' || j.status === 'running'));
        if (active) {
          setJobId(active.id);
          setScoring(true);
          setProgress({ processed: active.processedLeads, total: active.totalLeads });
          pollingRef.current = setInterval(() => pollJobProgress(active.id), 2000);
        }
      } catch {}
    };
    checkActiveScoringJob();
    // Clean up Polling bei Unmount
    return () => clearInterval(pollingRef.current);
  }, [page, limit, manualStatus]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = { limit, offset: (page - 1) * limit };
      if (manualStatus) params.manual_status = manualStatus;
      const res = await axios.get('http://localhost:5000/api/leads', { params });
      setLeads(res.data);
    } catch {}
    setLoading(false);
  };

  const pollJobProgress = async (id) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/crawler/jobs/${id}`);
      const job = res.data;
      if (job.status === 'finished') {
        setScoring(false);
        setProgress(null);
        setJobId(null);
        setErrorMsg(null);
        clearInterval(pollingRef.current);
        await fetchLeads();
      } else if (job.status === 'error') {
        setScoring(false);
        setProgress(null);
        setJobId(null);
        setErrorMsg('Scoring-Job wurde abgebrochen oder ist mit Fehler beendet.');
        clearInterval(pollingRef.current);
      } else {
        setProgress({
          processed: job.processedLeads,
          total: job.totalLeads
        });
      }
    } catch {
      setScoring(false);
      setProgress(null);
      setJobId(null);
      setErrorMsg('Fehler beim Abrufen des Scoring-Status.');
      clearInterval(pollingRef.current);
    }
  };

  const handleScoring = async () => {
    setScoring(true);
    setProgress(null);
    setJobId(null);
    try {
      const res = await axios.post('http://localhost:5000/api/scoring/run');
      const id = res.data.jobId;
      setJobId(id);
      pollingRef.current = setInterval(() => pollJobProgress(id), 2000);
    } catch {
      setScoring(false);
    }
  };

  const handleAbort = async () => {
    if (!jobId) return;
    try {
      await axios.patch(`http://localhost:5000/api/crawler/jobs/${jobId}/status`, { status: 'error' });
      setErrorMsg('Scoring-Job wurde abgebrochen.');
      setScoring(false);
      setProgress(null);
      setJobId(null);
      clearInterval(pollingRef.current);
    } catch {
      setErrorMsg('Fehler beim Abbrechen des Scoring-Jobs.');
    }
  };

  // Neue Hilfsfunktion: Details kategorisieren und Links erkennen
  const parseDetails = (detailsArr) => {
    const categories = {
      'CMS': [],
      'Technik': [],
      'Rechtliches': [],
      'SEO': [],
      'Social Media': [],
      'Abzüge': []
    };
    detailsArr.forEach((d) => {
      const lower = d.toLowerCase();
      if (lower.startsWith('cms:')) categories['CMS'].push(d);
      else if (lower.includes('https') || lower.includes('best practices') || lower.includes('performance')) categories['Technik'].push(d);
      else if (lower.includes('impressum')) categories['Rechtliches'].push(d);
      else if (lower.includes('seo') || lower.includes('barrierefreiheit')) categories['SEO'].push(d);
      else if (lower.includes('social')) categories['Social Media'].push(d);
      else if (lower.includes('fehlend') || lower.includes('kein') || lower.includes('abzug') || lower.includes('< 50')) categories['Abzüge'].push(d);
      else categories['Technik'].push(d);
    });
    return categories;
  };

  // Farbenlogik anpassen (Backend: Grün >=60, Gelb >=30, Rot <30)
  const getScoreColor = (score) => {
    if (score === 'none') return 'default';
    if (score >= 60) return 'success';
    if (score >= 30) return 'warning';
    return 'error';
  };

  // Link extrahieren, falls vorhanden
  const extractLink = (text) => {
    const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
    if (urlMatch) return urlMatch[1];
    // Social Media: Facebook, Instagram, LinkedIn, Twitter, YouTube
    const socialMatch = text.match(/(facebook|instagram|linkedin|twitter|youtube)\.com\/[\w\-_.]+/i);
    if (socialMatch) return 'https://' + socialMatch[0];
    return null;
  };

  const handleShowDetails = (lead) => {
    let details = [];
    try {
      details = JSON.parse(lead.scoring_details || '[]');
    } catch { details = []; }
    setSelectedDetails(details);
    setSelectedLead(lead);
    setDetailsOpen(true);
  };

  // Filter und Sortierung anwenden
  let filteredLeads = leads
    .filter(lead => categoryFilter === 'Alle' || lead.category === categoryFilter);
  if (manualStatusSort !== 'none') {
    filteredLeads = filteredLeads.sort((a, b) => {
      if (!a.manual_status) return 1;
      if (!b.manual_status) return -1;
      if (manualStatusSort === 'asc') return a.manual_status.localeCompare(b.manual_status);
      return b.manual_status.localeCompare(a.manual_status);
    });
  } else {
    filteredLeads = filteredLeads.sort((a, b) => {
      if (a.score === 'none') return 1;
      if (b.score === 'none') return -1;
      return sortOrder === 'asc' ? a.score - b.score : b.score - a.score;
    });
  }

  // Live-Scoring-Button nur anzeigen wenn Scoring läuft
  const LiveScoringButton = () => (
    scoring ? (
      <Button
        variant={liveMode ? 'contained' : 'outlined'}
        color="primary"
        startIcon={liveMode ? <PauseCircleOutlineIcon /> : <PlayCircleOutlineIcon />}
        onClick={() => setLiveMode(l => !l)}
      >
        {liveMode ? 'Live-Ansicht beenden' : 'Live-Scoring-Ansicht'}
      </Button>
    ) : null
  );

  // Filter-Komponente für bessere Übersichtlichkeit
  const FilterControls = () => (
    <Paper sx={{ p: 2, mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
      <Typography variant="subtitle1" sx={{ mr: 2, fontWeight: 'bold' }}>Filter:</Typography>
      
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Kategorie</InputLabel>
        <Select
          value={categoryFilter}
          label="Kategorie"
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <MenuItem value="Alle">Alle Kategorien</MenuItem>
          <MenuItem value="Grün">Grün (Score ≥ 60)</MenuItem>
          <MenuItem value="Gelb">Gelb (Score 30-59)</MenuItem>
          <MenuItem value="Rot">Rot (Score &lt; 30)</MenuItem>
          <MenuItem value="None">Keine Bewertung</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Status</InputLabel>
        <Select
          value={manualStatus}
          label="Status"
          onChange={e => { setManualStatus(e.target.value); setPage(1); }}
        >
          <MenuItem value="">Alle Status</MenuItem>
          <MenuItem value="MGG">MGG (Manuell Grün)</MenuItem>
          <MenuItem value="MGR">MGR (Manuell Rot)</MenuItem>
        </Select>
      </FormControl>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2">Sortierung:</Typography>
        <Button 
          variant="outlined" 
          size="small" 
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          startIcon={sortOrder === 'asc' ? <span>▲</span> : <span>▼</span>}
        >
          Score
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setManualStatusSort(manualStatusSort === 'asc' ? 'desc' : manualStatusSort === 'desc' ? 'none' : 'asc')}
          startIcon={manualStatusSort === 'asc' ? <span>▲</span> : manualStatusSort === 'desc' ? <span>▼</span> : <span>-</span>}
        >
          Status
        </Button>
      </Box>
    </Paper>
  );

  // Paging-Controls übersichtlicher gestalten
  const PagingControls = () => (
    <Paper sx={{ p: 2, my: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Typography variant="subtitle1" sx={{ mr: 2, fontWeight: 'bold' }}>Seite:</Typography>
      
      <Button 
        variant="outlined" 
        size="small" 
        onClick={() => setPage(page - 1)} 
        disabled={page === 1}
      >
        Zurück
      </Button>
      
      <Typography>Seite {page}</Typography>
      
      <Button 
        variant="outlined" 
        size="small" 
        onClick={() => setPage(page + 1)} 
        disabled={leads.length < limit}
      >
        Weiter
      </Button>

      <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />

      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>Einträge pro Seite</InputLabel>
        <Select
          value={limit}
          label="Einträge pro Seite"
          onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
        >
          <MenuItem value={10}>10 Einträge</MenuItem>
          <MenuItem value={25}>25 Einträge</MenuItem>
          <MenuItem value={50}>50 Einträge</MenuItem>
          <MenuItem value={100}>100 Einträge</MenuItem>
        </Select>
      </FormControl>
    </Paper>
  );

  // WebSocket-Verbindung für Live-Scoring
  useEffect(() => {
    if (!liveMode) {
      setLiveQueue([]);
      setLiveCurrent(null);
      setLiveResults([]);
      setProgress({ processed: 0, total: 0 });
      console.log('[Debug] LiveMode deaktiviert, States zurückgesetzt');
      return;
    }

    const handleScoringUpdate = (data) => {
      console.log('[Socket] scoring-status-update:', data);
      setLiveQueue(data.queue || []);
      setLiveCurrent(data.current || null);
      setLiveResults(data.results || []);
      setProgress(data.progress || { processed: 0, total: 0 });
    };

    socket.on('scoring-status-update', handleScoringUpdate);
    socket.on('connect', () => console.log('[Socket] Verbunden!'));
    socket.on('disconnect', () => console.log('[Socket] Getrennt!'));
    socket.on('connect_error', (err) => console.error('[Socket] Verbindungsfehler:', err));

    return () => {
      socket.off('scoring-status-update', handleScoringUpdate);
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
    };
  }, [liveMode]);

  // UI für die Live-Queue als Tabelle
  const LiveScoringQueue = () => (
    <Box mt={3} mb={3}>
      <Typography variant="h6" gutterBottom>Live-Scoring-Ansicht</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Firma</TableCell>
              <TableCell>Domain</TableCell>
              <TableCell>Telefon</TableCell>
              <TableCell>Score</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {liveQueue.map((lead) => {
              let scoreDisplay = '-';
              let scoreColor = 'default';
              if (typeof lead.score === 'number' && !isNaN(lead.score) && lead.score > 0) {
                scoreDisplay = lead.score;
                scoreColor = getScoreColor(lead.score);
              } else if (typeof lead.score === 'string' && lead.score !== '' && lead.score !== 'none') {
                scoreDisplay = lead.score;
              }
              const result = liveResults.find(r => r.id === lead.id);
              if (result && typeof result.score === 'number' && !isNaN(result.score) && result.score > 0) {
                scoreDisplay = result.score;
                scoreColor = getScoreColor(result.score);
              }
              const isCurrent = liveCurrent && lead.id === liveCurrent.id;
              return (
                <TableRow key={lead.id} selected={isCurrent} sx={isCurrent ? { backgroundColor: 'rgba(25, 118, 210, 0.08)' } : {}}>
                  <TableCell>{lead.firm_name}</TableCell>
                  <TableCell>{lead.domain}</TableCell>
                  <TableCell>{lead.phone}</TableCell>
                  <TableCell>
                    {scoreDisplay !== '-' ? (
                      <Chip label={scoreDisplay} color={scoreColor} />
                    ) : (
                      scoreDisplay
                    )}
                  </TableCell>
                  <TableCell>{isCurrent ? 'Wird bewertet...' : (scoreDisplay !== '-' ? 'Fertig' : 'Wartet')}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // Fortschrittsanzeige auch im Live-Modus anzeigen
  const processed = progress && typeof progress.processed === 'number' ? progress.processed : 0;
  const total = progress && typeof progress.total === 'number' ? progress.total : 0;
  const progressData = liveMode && liveCurrent && liveQueue.length > 0 && typeof liveCurrent === 'object' && progress ? progress : progress;

  console.log('[Render] LiveQueue:', liveQueue);
  console.log('[Render] LiveCurrent:', liveCurrent);
  console.log('[Render] LiveResults:', liveResults);
  console.log('[Render] Progress:', progress);

  return (
    <Box sx={{ p: { xs: 1, md: 4 }, background: '#f7fafd', minHeight: '100vh', color: '#23272f', width: '100%', maxWidth: '100vw', boxSizing: 'border-box' }}>
      <Typography variant="h4" fontWeight="bold" mb={3} sx={{ color: '#1a237e' }}>Analyse & Scoring</Typography>
      
      {/* Aktions-Buttons */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleScoring} 
          disabled={scoring || progress !== null}
          startIcon={scoring || progress !== null ? <CircularProgress size={20} /> : null}
        >
          Scoring für neue Leads starten
        </Button>
        
        {progress && (
          <Button variant="outlined" color="error" onClick={handleAbort} disabled={!jobId}>
            Abbrechen
          </Button>
        )}
        
        <LiveScoringButton />
        
        {scoring && liveMode && (
          <Typography color="textSecondary" variant="body2">
            Bis zu 8 Datensätze werden live angezeigt
          </Typography>
        )}
      </Paper>

      {/* Fortschrittsanzeige */}
      {((progress && !liveMode) || (liveMode && progress)) && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ width: '100%' }}>
            <LinearProgress 
              variant="determinate" 
              value={total > 0 ? (processed / total) * 100 : 0} 
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {`${processed} von ${total} Leads bewertet${total > 0 ? ` (${Math.round((processed / total) * 100)}%)` : ''}`}
            </Typography>
          </Box>
        </Paper>
      )}

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3 }}>{errorMsg}</Alert>
      )}

      {/* Live-Scoring oder normale Ansicht */}
      {scoring && liveMode ? (
        <LiveScoringQueue />
      ) : (
        <React.Fragment>
          <FilterControls />
          <Paper sx={{ p: 3, borderRadius: 3, background: '#fff', boxShadow: 2 }}>
            <PagingControls />
            
            <Typography variant="h6" mb={2} sx={{ color: '#1a237e' }}>Lead-Übersicht</Typography>
            <Divider sx={{ mb: 2 }} />
            
            {loading ? <CircularProgress /> : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Firma</TableCell>
                      <TableCell>Domain</TableCell>
                      <TableCell>Telefon</TableCell>
                      <TableCell>Score</TableCell>
                      <TableCell>Kategorie</TableCell>
                      <TableCell
                        style={{ cursor: 'pointer', fontWeight: 'bold' }}
                        onClick={() => setManualStatusSort(manualStatusSort === 'asc' ? 'desc' : manualStatusSort === 'desc' ? 'none' : 'asc')}
                      >
                        Manueller Status {manualStatusSort === 'asc' ? '▲' : manualStatusSort === 'desc' ? '▼' : ''}
                      </TableCell>
                      <TableCell>Letzte Bewertung</TableCell>
                      <TableCell>Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLeads.map(lead => (
                      <TableRow key={lead.id}>
                        <TableCell>{lead.firm_name}</TableCell>
                        <TableCell>{lead.domain}</TableCell>
                        <TableCell>
                          {lead.phone ? (
                            <a href={`tel:${lead.phone.replace(/[^0-9+]/g, '')}`} style={{ textDecoration: 'none' }}>
                              <PhoneIcon color="primary" />
                            </a>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {lead.score === 'none' ? (
                            <Chip label="Keine Website" color="default" />
                          ) : (
                            <Chip label={lead.score} color={getScoreColor(lead.score)} />
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip label={lead.category} color={getScoreColor(lead.score)} />
                        </TableCell>
                        <TableCell>
                          {lead.manual_status ? (
                            <Chip label={lead.manual_status} color={lead.manual_status === 'MGG' ? 'success' : 'error'} size="small" />
                          ) : null}
                        </TableCell>
                        <TableCell>{lead.last_checked ? new Date(lead.last_checked).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>
                          <Button size="small" variant="outlined" onClick={() => handleShowDetails(lead)}>Details</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
          <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)}>
            <DialogTitle>
              Scoring-Details
              {selectedLead && selectedLead.manual_status && (
                <Chip
                  label={selectedLead.manual_status}
                  color={selectedLead.manual_status === 'MGG' ? 'success' : 'error'}
                  size="small"
                  sx={{ ml: 2, fontWeight: 'bold' }}
                />
              )}
            </DialogTitle>
            <DialogContent>
              {selectedDetails.length === 0 ? (
                <Typography variant="body2">Keine Details vorhanden.</Typography>
              ) : (
                (() => {
                  const cats = parseDetails(selectedDetails);
                  return (
                    <Box>
                      {/* CMS-Info */}
                      {cats['CMS'].length > 0 && (
                        <Box mb={2}>
                          <Typography variant="subtitle1" fontWeight="bold">CMS</Typography>
                          {cats['CMS'].map((d, i) => <Typography key={i} sx={{ mb: 0.5 }}>{d}</Typography>)}
                        </Box>
                      )}
                      {/* Technik */}
                      {cats['Technik'].length > 0 && (
                        <Box mb={2}>
                          <Typography variant="subtitle1" fontWeight="bold">Technik</Typography>
                          {cats['Technik'].map((d, i) => <Typography key={i} sx={{ mb: 0.5 }}>{d}</Typography>)}
                        </Box>
                      )}
                      {/* Rechtliches */}
                      {cats['Rechtliches'].length > 0 && (
                        <Box mb={2}>
                          <Typography variant="subtitle1" fontWeight="bold">Rechtliches</Typography>
                          {cats['Rechtliches'].map((d, i) => {
                            const link = extractLink(d);
                            return <Typography key={i} sx={{ mb: 0.5 }}>{link ? <a href={link} target="_blank" rel="noopener noreferrer">{d}</a> : d}</Typography>;
                          })}
                        </Box>
                      )}
                      {/* SEO */}
                      {cats['SEO'].length > 0 && (
                        <Box mb={2}>
                          <Typography variant="subtitle1" fontWeight="bold">SEO & Barrierefreiheit</Typography>
                          {cats['SEO'].map((d, i) => <Typography key={i} sx={{ mb: 0.5 }}>{d}</Typography>)}
                        </Box>
                      )}
                      {/* Social Media */}
                      {cats['Social Media'].length > 0 && (
                        <Box mb={2}>
                          <Typography variant="subtitle1" fontWeight="bold">Social Media</Typography>
                          {cats['Social Media'].map((d, i) => {
                            const link = extractLink(d);
                            return <Typography key={i} sx={{ mb: 0.5 }}>{link ? <a href={link} target="_blank" rel="noopener noreferrer">{d}</a> : d}</Typography>;
                          })}
                        </Box>
                      )}
                      {/* Abzüge */}
                      {cats['Abzüge'].length > 0 && (
                        <Box mb={2}>
                          <Typography variant="subtitle1" fontWeight="bold" color="error">Abzüge</Typography>
                          {cats['Abzüge'].map((d, i) => <Typography key={i} sx={{ mb: 0.5 }}>{d}</Typography>)}
                        </Box>
                      )}
                    </Box>
                  );
                })()
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>Schließen</Button>
            </DialogActions>
          </Dialog>
        </React.Fragment>
      )}
    </Box>
  );
} 