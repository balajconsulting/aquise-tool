import React, { useEffect, useState } from "react";
import { DetailsList, DetailsListLayoutMode, SelectionMode, IconButton, Stack, Text } from "@fluentui/react";
import { Chip } from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import { initializeIcons } from '@fluentui/react/lib/Icons';
import axios from "axios";

initializeIcons();

const columns = [
  { key: 'firm_name', name: 'Firma', fieldName: 'firm_name', minWidth: 100, maxWidth: 200, isResizable: true },
  { key: 'domain', name: 'Domain', fieldName: 'domain', minWidth: 100, maxWidth: 200, isResizable: true },
  { key: 'phone', name: 'Telefon', fieldName: 'phone', minWidth: 100, maxWidth: 150, isResizable: true, onRender: (item) => item.phone ? <a href={`tel:${item.phone.replace(/[^\d+]/g, '')}`} style={{ textDecoration: 'none' }}><PhoneIcon color="primary" /></a> : null },
  { key: 'email', name: 'E-Mail', fieldName: 'email', minWidth: 100, maxWidth: 200, isResizable: true },
  { key: 'score', name: 'Score', fieldName: 'score', minWidth: 50, maxWidth: 80, isResizable: true },
  { key: 'manual_status', name: 'Manueller Status', fieldName: 'manual_status', minWidth: 120, maxWidth: 150, isResizable: true, onRender: (item) => item.manual_status ? <Chip label={item.manual_status} color={item.manual_status === 'MGG' ? 'success' : 'error'} size="small" /> : null },
  { key: 'actions', name: 'Aktionen', fieldName: 'actions', minWidth: 80, maxWidth: 100, isResizable: false, onRender: (item, idx, col) => null },
];

const LeadsDashboard = () => {
  const [stats, setStats] = useState({ totalLeads: 0, avgScore: 0, newLeads: 0, actions: 0 });
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [crawlStats, setCrawlStats] = useState({ totalJobs: 0, finished: 0, error: 0, avgDuration: 0 });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [manualStatus, setManualStatus] = useState(''); // '', 'MGG', 'MGR'

  useEffect(() => {
    fetchStats();
    fetchLeads();
    fetchCrawlStats();
    // eslint-disable-next-line
  }, [page, limit, manualStatus]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/leads/stats");
      setStats(res.data);
    } catch (err) {
      // Fehlerbehandlung
    }
    setLoading(false);
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = { limit, offset: (page - 1) * limit };
      if (manualStatus) params.manual_status = manualStatus;
      const res = await axios.get('http://localhost:5000/api/leads', { params });
      setLeads(res.data);
    } catch (err) {
      // Fehlerbehandlung
    }
    setLoading(false);
  };

  const fetchCrawlStats = async () => {
    try {
      // Simulierte API, ggf. im Backend ergänzen
      const res = await axios.get('http://localhost:5000/api/crawler/jobs/stats');
      setCrawlStats(res.data);
    } catch (err) {
      // Fehlerbehandlung
    }
  };

  const deleteLead = async (id) => {
    await axios.delete(`http://localhost:5000/api/leads/${id}`);
    fetchLeads();
    fetchStats();
  };

  const handleDelete = deleteLead;

  const columnsWithActions = columns.map(col =>
    col.key === 'actions'
      ? {
          ...col,
          onRender: (item) => (
            <IconButton iconProps={{ iconName: 'Delete' }} title="Löschen" ariaLabel="Löschen" onClick={() => handleDelete(item.id)} />
          ),
        }
      : col
  );

  return (
    <Stack tokens={{ childrenGap: 20, padding: 32 }}>
      <Text variant="xxLarge">Leads</Text>
      <Stack horizontal tokens={{ childrenGap: 20 }}>
      </Stack>
      <div style={{ marginTop: 32 }}>
        <Text variant="xLarge">Leads Übersicht</Text>
        <DetailsList
          items={leads}
          columns={columnsWithActions}
          setKey="set"
          layoutMode={DetailsListLayoutMode.justified}
          selectionMode={SelectionMode.none}
          styles={{ root: { background: "white", borderRadius: 8, boxShadow: "0 2px 8px #eee" } }}
          enableShimmer={loading}
        />
      </div>
    </Stack>
  );
};

export default LeadsDashboard;

function StatCard({ label, value, loading }) {
  return (
    <div style={{ minWidth: 160, minHeight: 80, background: '#f4f6fa', borderRadius: 12, boxShadow: '0 2px 8px #eee', padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#2b6cb0' }}>{loading ? '...' : value}</div>
      <div style={{ fontSize: 14, color: '#555', marginTop: 4 }}>{label}</div>
    </div>
  );
} 