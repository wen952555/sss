import React, { useState, useEffect } from 'react';
import api from '../api';

export default function SessionList({ user, onEnterGame }) {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const fetchSessions = async () => {
      const res = await api.get('/session.php?action=list');
      setSessions(res);
    };
    fetchSessions();
  }, []);

  return (
    <div>
      <h2>Game Sessions</h2>
      <ul>
        {sessions.map((session) => (
          <li key={session.id}>
            {session.name} <button onClick={() => onEnterGame(session.id)}>Enter</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
