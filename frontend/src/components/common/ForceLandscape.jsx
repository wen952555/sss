import React from 'react';
import './ForceLandscape.css';

/**
 * A component that displays an overlay on mobile devices in portrait mode,
 * prompting the user to rotate their device to landscape.
 */
const ForceLandscape = () => {
  return (
    <div className="force-landscape-overlay">
      <div className="force-landscape-message">
        请旋转您的设备以获得最佳体验
      </div>
    </div>
  );
};

export default ForceLandscape;
