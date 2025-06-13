import React, { useEffect, useState } from 'react';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { DetailsList, DetailsListLayoutMode, SelectionMode } from '@fluentui/react/lib/DetailsList';
import { DefaultButton } from '@fluentui/react/lib/Button';
import { Dropdown } from '@fluentui/react/lib/Dropdown';
import { Label } from '@fluentui/react/lib/Label';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import axios from 'axios';

const sources = [
  { key: 'Gelbe Seiten', text: 'Gelbe Seiten' },
  { key: 'Yelp', text: 'Yelp' },
  { key: 'Firmenwebseiten', text: 'Firmenwebseiten' },
  { key: 'Demo', text: 'Demo' },
];

const columns = [
  { key: 'id', name: 'ID', fieldName: 'id', minWidth: 40, maxWidth: 60, isResizable: true },
  { key: 'source', name: 'Quelle', fieldName: 'source', minWidth: 120, maxWidth: 200, isResizable: true },
  { key: 'status', name: 'Status', fieldName: 'status', minWidth: 100, maxWidth: 120, isResizable: true },
  { key: 'started_at', name: 'Gestartet', fieldName: 'started_at', minWidth: 120, maxWidth: 180, isResizable: true },
  { key: 'finished_at', name: 'Beendet', fieldName: 'finished_at', minWidth: 120, maxWidth: 180, isResizable: true },
];

export default function Crawling() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSource, setNewSource] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/crawler/jobs');
      setJobs(res.data);
    } catch (err) {
      setMessage({ type: MessageBarType.error, text: 'Fehler beim Laden der Crawl-Jobs.' });
    }
    setLoading(false);
  };

  const handleStartJob = async () => {
    if (!newSource) {
      setMessage({ type: MessageBarType.warning, text: 'Bitte eine Quelle auswählen.' });
      return;
    }
    try {
      await axios.post('http://localhost:5000/api/crawler/jobs', { source: newSource });
      setMessage({ type: MessageBarType.success, text: 'Crawl-Job gestartet!' });
      setNewSource(null);
      fetchJobs();
    } catch (err) {
      setMessage({ type: MessageBarType.error, text: 'Fehler beim Starten des Crawl-Jobs.' });
    }
  };

  return (
    <Stack tokens={{ childrenGap: 24, padding: 32 }}>
      <Text variant="xxLarge">Crawling</Text>
      {message && (
        <MessageBar
          messageBarType={message.type}
          isMultiline={false}
          onDismiss={() => setMessage(null)}
          dismissButtonAriaLabel="Schließen"
        >
          {message.text}
        </MessageBar>
      )}
      <Stack horizontal tokens={{ childrenGap: 16 }} verticalAlign="end">
        <Label>Neue Quelle wählen:</Label>
        <Dropdown
          placeholder="Quelle auswählen"
          options={sources}
          selectedKey={newSource}
          onChange={(_, option) => setNewSource(option.key)}
          style={{ minWidth: 200 }}
        />
        <DefaultButton text="Crawl-Job starten" onClick={handleStartJob} primary />
      </Stack>
      <div style={{ marginTop: 32 }}>
        <Text variant="xLarge">Crawl-Jobs Übersicht</Text>
        <DetailsList
          items={jobs}
          columns={columns}
          setKey="set"
          layoutMode={DetailsListLayoutMode.justified}
          selectionMode={SelectionMode.none}
          enableShimmer={loading}
          styles={{ root: { background: 'white', borderRadius: 8, boxShadow: '0 2px 8px #eee' } }}
        />
      </div>
    </Stack>
  );
} 