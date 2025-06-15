// frontend_react/src/components/TopInfoBar.js
import React from 'react';
import './TopInfoBar.css';

const TopInfoBar = ({ statusText, playerNames }) => {
  return (
    <div className="top-info-bar">
      <span>{statusText}</span>
      <span>玩家: {playerNames}</span>
    </div>
  );
};

export default TopInfoBar;
