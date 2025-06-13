import React, { useContext, useState } from 'react';
import { UserContext } from './UserContext';
import { Persona, PersonaSize, ContextualMenu, Stack } from '@fluentui/react';
import { useNavigate } from 'react-router-dom';

export default function UserMenu() {
  const context = useContext(UserContext);
  if (!context) return null;
  const { user, setUser, setToken } = context;
  const [menuVisible, setMenuVisible] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  const menuItems = [
    {
      key: 'profile',
      text: 'Profil',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'changePassword',
      text: 'Passwort ändern',
      onClick: () => navigate('/change-password'),
    },
    {
      key: 'logout',
      text: 'Logout',
      onClick: () => {
        setUser(null);
        setToken(null);
        navigate('/login');
      },
    },
  ];

  return (
    <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
      <Persona
        text={user.username}
        size={PersonaSize.size32}
        hidePersonaDetails
        onClick={() => setMenuVisible(true)}
        styles={{ root: { cursor: 'pointer' } }}
      />
      <ContextualMenu
        items={menuItems}
        hidden={!menuVisible}
        onItemClick={() => setMenuVisible(false)}
        onDismiss={() => setMenuVisible(false)}
        target={document.activeElement}
      />
    </Stack>
  );
} 