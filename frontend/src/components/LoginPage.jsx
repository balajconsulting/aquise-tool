import React, { useState, useContext } from 'react';
import { TextField, PrimaryButton, Stack, MessageBar } from '@fluentui/react';
import { UserContext } from './UserContext';
import axios from 'axios';

export default function LoginPage({ onLogin }) {
  const context = useContext(UserContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!context) return <div>Fehler: UserContext nicht verfügbar.</div>;
  const { setUser, setToken } = context;

  const handleLogin = async () => {
    setError('');
    try {
      const res = await axios.post('/api/auth/login', { username, password });
      setToken(res.data.token);
      setUser(res.data.user);
      if (onLogin) onLogin();
    } catch (e) {
      setError('Login fehlgeschlagen. Bitte überprüfe deine Zugangsdaten.');
    }
  };

  return (
    <Stack horizontalAlign="center" verticalAlign="center" styles={{ root: { height: '100vh' } }}>
      <Stack tokens={{ childrenGap: 16 }} styles={{ root: { width: 320, padding: 32, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001' } }}>
        <h2 style={{ textAlign: 'center', color: '#1a237e' }}>Login</h2>
        {error && <MessageBar messageBarType={3}>{error}</MessageBar>}
        <TextField label="Benutzername" value={username} onChange={(_, v) => setUsername(v)} autoFocus />
        <TextField label="Passwort" type="password" value={password} onChange={(_, v) => setPassword(v)} />
        <PrimaryButton text="Login" onClick={handleLogin} styles={{ root: { width: '100%' } }} />
      </Stack>
    </Stack>
  );
} 