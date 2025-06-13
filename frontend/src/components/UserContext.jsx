import React, { createContext, useState, useEffect } from 'react';

// Hilfsfunktion zum Decodieren des JWT (ohne externe Abhängigkeit)
function parseJwt(token) {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const t = localStorage.getItem('token');
    if (t) {
      const payload = parseJwt(t);
      if (payload && payload.username) {
        return { id: payload.id, username: payload.username, role: payload.role };
      }
    }
    return null;
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      const payload = parseJwt(token);
      if (payload && payload.username) {
        setUser({ id: payload.id, username: payload.username, role: payload.role });
      } else {
        setUser(null);
      }
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  return (
    <UserContext.Provider value={{ user, setUser, token, setToken }}>
      {children}
    </UserContext.Provider>
  );
} 