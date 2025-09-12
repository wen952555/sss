import React from 'react';
import './BiddingControls.css';

const BiddingControls = ({ currentBid, isMyTurn, onBid }) => {
  if (!isMyTurn) {
    return <div className="bidding-controls-placeholder">等待其他玩家叫分...</div>;
  }

  const handleBid = (bidAmount) => {
    if (isMyTurn) {
      onBid(bidAmount);
    }
  };

  return (
    <div className="bidding-controls">
      <button
        className="bid-button"
        disabled={1 <= currentBid}
        onClick={() => handleBid(1)}
      >
        1分
      </button>
      <button
        className="bid-button"
        disabled={2 <= currentBid}
        onClick={() => handleBid(2)}
      >
        2分
      </button>
      <button
        className="bid-button"
        disabled={3 <= currentBid}
        onClick={() => handleBid(3)}
      >
        3分
      </button>
      <button
        className="bid-button pass"
        onClick={() => handleBid(0)} // 0 represents a pass
      >
        不叫
      </button>
    </div>
  );
};

export default BiddingControls;
