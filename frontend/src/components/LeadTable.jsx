import React, { useEffect, useState } from 'react';
import { DetailsList, DetailsListLayoutMode, SelectionMode, PrimaryButton, IconButton, Stack, Text } from '@fluentui/react';
import { initializeIcons } from '@fluentui/react/lib/Icons';
import axios from 'axios';
import PhoneIcon from '@mui/icons-material/Phone';

initializeIcons();

const columns = [
  { key: 'firm_name', name: 'Firma', fieldName: 'firm_name', minWidth: 100, maxWidth: 200, isResizable: true },
  { key: 'domain', name: 'Domain', fieldName: 'domain', minWidth: 100, maxWidth: 200, isResizable: true },
  { key: 'phone', name: 'Telefon', fieldName: 'phone', minWidth: 100, maxWidth: 150, isResizable: true, onRender: (item) => item.phone ? <a href={`tel:${item.phone.replace(/[^\d+]/g, '')}`} style={{ textDecoration: 'none' }}><PhoneIcon color="primary" /></a> : null },
  { key: 'email', name: 'E-Mail', fieldName: 'email', minWidth: 100, maxWidth: 200, isResizable: true },
  { key: 'score', name: 'Score', fieldName: 'score', minWidth: 50, maxWidth: 80, isResizable: true },
  { key: 'actions', name: 'Aktionen', fieldName: 'actions', minWidth: 80, maxWidth: 100, isResizable: false, onRender: (item, idx, col) => null },
];

const LeadTable = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [manualStatus, setManualStatus] = useState(''); // '', 'MGG', 'MGR'

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line
  }, [page, limit, manualStatus]);

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

  const deleteLead = async (id) => {
    await axios.delete(`http://localhost:5000/api/leads/${id}`);
    fetchLeads();
  };

  const columnsWithActions = columns.map(col =>
    col.key === 'actions'
      ? {
          ...col,
          onRender: (item) => (
            <IconButton iconProps={{ iconName: 'Delete' }} title="Löschen" ariaLabel="Löschen" onClick={() => deleteLead(item.id)} />
          ),
        }
      : col
  );

  return (
    <Stack tokens={{ childrenGap: 20 }}>
      <Text variant="xLarge">Leads Übersicht</Text>
      <Stack horizontal tokens={{ childrenGap: 10 }}>
        <label>Status-Filter:</label>
        <select value={manualStatus} onChange={e => { setManualStatus(e.target.value); setPage(1); }}>
          <option value="">Alle</option>
          <option value="MGG">MGG</option>
          <option value="MGR">MGR</option>
        </select>
        <label>Pro Seite:</label>
        <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <PrimaryButton text="Zurück" disabled={page === 1} onClick={() => setPage(page - 1)} />
        <Text>Seite {page}</Text>
        <PrimaryButton text="Weiter" onClick={() => setPage(page + 1)} />
      </Stack>
      <DetailsList
        items={leads}
        columns={columnsWithActions}
        setKey="set"
        layoutMode={DetailsListLayoutMode.justified}
        selectionMode={SelectionMode.none}
        isHeaderVisible={true}
        enableShimmer={loading}
      />
    </Stack>
  );
};

export default LeadTable; 