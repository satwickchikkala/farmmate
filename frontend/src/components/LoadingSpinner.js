import React from 'react';

const LoadingSpinner = ({ fullPage = true, message = "Loading..." }) => {
  const containerStyle = fullPage ? {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#f7faf8',
    zIndex: 9999,
  } : {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(45, 106, 79, 0.1);
          border-top: 4px solid #2d6a4f;
          border-radius: 50%;
          animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          margin-bottom: 16px;
        }
        .loading-text {
          color: #2d6a4f;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          font-size: 16px;
          letter-spacing: 0.5px;
        }
      `}</style>
      <div className="spinner"></div>
      {message && <div className="loading-text">{message}</div>}
    </div>
  );
};

export default LoadingSpinner;
