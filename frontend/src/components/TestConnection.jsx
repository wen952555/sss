import React, { useState } from 'react';
import apiService from '../api/apiService';

const TestConnection = () => {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testDirectConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://9525.ip-ddns.com/api.php');
      const data = await response.json();
      setResult(`Direct: ${JSON.stringify(data)}`);
    } catch (error) {
      setResult(`Direct Error: ${error.message}`);
    }
    setLoading(false);
  };

  const testWorkerConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/');
      const data = await response.json();
      setResult(`Worker: ${JSON.stringify(data)}`);
    } catch (error) {
      setResult(`Worker Error: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '10px' }}>
      <h3>连接测试</h3>
      <button onClick={testDirectConnection} disabled={loading}>
        测试直接连接
      </button>
      <button onClick={testWorkerConnection} disabled={loading}>
        测试Worker连接
      </button>
      {loading && <p>测试中...</p>}
      {result && <p>结果: {result}</p>}
    </div>
  );
};

export default TestConnection;
