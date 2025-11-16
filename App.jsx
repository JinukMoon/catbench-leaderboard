import React, { useState, useEffect } from 'react';
import CatBenchLeaderboard from './catbench-leaderboard';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // leaderboard_data.json 로드
    fetch('/leaderboard_data.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('데이터를 불러올 수 없습니다.');
        }
        return response.json();
      })
      .then(jsonData => {
        setData(jsonData);
        setLoading(false);
      })
      .catch(err => {
        console.error('데이터 로드 오류:', err);
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
          <p>벤치마크 데이터를 불러오는 중...</p>
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
          <h2>오류 발생</h2>
          <p>{error}</p>
          <p style={{ marginTop: '10px', fontSize: '14px', color: '#71717a' }}>
            leaderboard_data.json 파일이 올바른 위치에 있는지 확인해주세요.
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

