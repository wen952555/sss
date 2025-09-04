// frontend_react/src/components/TopInfoBar.js
import React from 'react';
import './TopInfoBar.css';

const TopInfoBar = ({ statusText, players }) => {
  // Create a string that lists players and their scores
  const playerDisplay = players && players.length > 0
    ? players.map(p => `${p.name} (得分: ${p.score})`).join(' | ')
    : 'N/A';

  return (
    <div className="top-info-bar">
      <span>{statusText}</span>
      <span>{playerDisplay}</span>
    </div>
  );
};

export default TopInfoBar;
