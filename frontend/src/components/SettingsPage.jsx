import React, { useContext, useEffect, useState } from 'react';
import { UserContext } from './UserContext';
import { Stack, TextField, PrimaryButton, Dropdown, DetailsList, MessageBar } from '@fluentui/react';
import axios from 'axios';

const roleOptions = [
  { key: 'user', text: 'User' },
  { key: 'admin', text: 'Admin' },
  { key: 'superadmin', text: 'Superadmin' },
];

export default function SettingsPage() {
  const context = useContext(UserContext);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (context && context.user?.role === 'superadmin') {
      fetchUsers();
    }
    // eslint-disable-next-line
  }, []);

  const fetchUsers = async () => {
    if (!context) return;
    const { token } = context;
    const res = await axios.get('/api/auth/users', { headers: { Authorization: `Bearer ${token}` } });
    setUsers(res.data);
  };

  const handleCreateUser = async () => {
    if (!context) return;
    const { token } = context;
    try {
      await axios.post('/api/auth/users', newUser, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('Benutzer erfolgreich angelegt!');
      setNewUser({ username: '', password: '', role: 'user' });
      fetchUsers();
    } catch {
      setMessage('Fehler beim Anlegen des Benutzers.');
    }
  };

  const handleRoleChange = async (id, role) => {
    if (!context) return;
    const { token } = context;
    await axios.patch(`/api/auth/users/${id}/role`, { role }, { headers: { Authorization: `Bearer ${token}` } });
    fetchUsers();
  };

  const handlePasswordReset = async (id) => {
    if (!context) return;
    const { token } = context;
    const newPassword = prompt('Neues Passwort für diesen Nutzer:');
    if (!newPassword) return;
    await axios.patch(`/api/auth/users/${id}/password`, { password: newPassword }, { headers: { Authorization: `Bearer ${token}` } });
    setMessage('Passwort geändert!');
  };

  // Context- und Berechtigungsprüfung NACH ALLEN HOOKS, aber VOR dem Rendern
  if (!context) {
    return <div>Fehler: UserContext nicht verfügbar.</div>;
  }
  const { user } = context;
  if (user?.role !== 'superadmin') {
    return <div>Keine Berechtigung.</div>;
  }

  return (
    <Stack tokens={{ childrenGap: 24 }} styles={{ root: { maxWidth: 700, margin: '40px auto' } }}>
      <h2>Nutzerverwaltung</h2>
      {message && <MessageBar>{message}</MessageBar>}
      <Stack horizontal tokens={{ childrenGap: 16 }}>
        <TextField label="Benutzername" value={newUser.username} onChange={(_, v) => setNewUser(n => ({ ...n, username: v }))} />
        <TextField label="Passwort" type="password" value={newUser.password} onChange={(_, v) => setNewUser(n => ({ ...n, password: v }))} />
        <Dropdown label="Rolle" options={roleOptions} selectedKey={newUser.role} onChange={(_, o) => setNewUser(n => ({ ...n, role: o.key }))} />
        <PrimaryButton text="Anlegen" onClick={handleCreateUser} />
      </Stack>
      <DetailsList
        items={users}
        columns={[
          { key: 'username', name: 'Benutzername', fieldName: 'username', minWidth: 100 },
          { key: 'role', name: 'Rolle', fieldName: 'role', minWidth: 80, onRender: u => (
            <Dropdown options={roleOptions} selectedKey={u.role} onChange={(_, o) => handleRoleChange(u.id, o.key)} />
          ) },
          { key: 'pw', name: 'Passwort zurücksetzen', minWidth: 150, onRender: u => (
            <PrimaryButton text="Zurücksetzen" onClick={() => handlePasswordReset(u.id)} />
          ) },
        ]}
      />
    </Stack>
  );
} 