import React, { useContext, useState } from 'react';
import { UserContext } from './UserContext';
import { Stack, TextField, PrimaryButton, MessageBar } from '@fluentui/react';
import axios from 'axios';

export default function ProfilePage() {
  const context = useContext(UserContext);
  if (!context) return <div>Fehler: UserContext nicht verfügbar.</div>;
  const { user, token } = context;
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleChangePassword = async () => {
    try {
      await axios.patch(`/api/auth/users/${user.id}/password`, { password }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('Passwort erfolgreich geändert!');
      setPassword('');
    } catch {
      setMessage('Fehler beim Ändern des Passworts.');
    }
  };

  return (
    <Stack tokens={{ childrenGap: 16 }} styles={{ root: { maxWidth: 400, margin: '40px auto' } }}>
      <h2>Profil</h2>
      <div>Benutzername: <b>{user.username}</b></div>
      <div>Rolle: <b>{user.role}</b></div>
      <TextField label="Neues Passwort" type="password" value={password} onChange={(_, v) => setPassword(v)} />
      <PrimaryButton text="Passwort ändern" onClick={handleChangePassword} />
      {message && <MessageBar>{message}</MessageBar>}
    </Stack>
  );
} 