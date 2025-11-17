import React, { useState, useEffect } from 'react';
import CatBenchLeaderboard from './catbench-leaderboard';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // load leaderboard_data.json while respecting the configured base path
    fetch(`${import.meta.env.BASE_URL}leaderboard_data.json`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Unable to fetch leaderboard data.');
        }
        return response.json();
      })
      .then(jsonData => {
        setData(jsonData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Data load error:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: "'Inter', sans-serif",
        color: '#52525b'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #f4f4f5',
            borderTop: '4px solid #0d9488',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p>Loading benchmark data...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: "'Inter', sans-serif",
        color: '#ef4444'
      }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <h2>An error occurred</h2>
          <p>{error}</p>
          <p style={{ marginTop: '10px', fontSize: '14px', color: '#71717a' }}>
            Please verify that leaderboard_data.json is available at the expected path.
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return <CatBenchLeaderboard data={data} />;
}

export default App;

