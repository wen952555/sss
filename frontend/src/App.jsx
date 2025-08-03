import React, { useState, useEffect } from 'react';
import GameLobby from './components/GameLobby';
import Auth from './components/Auth';
import UserProfile from './components/UserProfile';
import TransferPoints from './components/TransferPoints';
import './App.css';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

// 新版本提示模态框组件
const UpdateModal = ({ show, version, notes, onUpdate, onCancel }) => {
  if (!show) {
    return null;
  }
  return (
    <div className="update-modal-backdrop">
      <div className="update-modal-content">
        <h3>发现新版本: {version}</h3>
        <div className="release-notes">
          <p>更新内容:</p>
          <ul>
            {notes.map((note, index) => <li key={index}>{note}</li>)}
          </ul>
        </div>
        <div className="modal-actions">
          <button onClick={onCancel} className="cancel-btn">稍后提醒</button>
          <button onClick={onUpdate} className="update-btn">立即更新</button>
        </div>
      </div>
    </div>
  );
};


function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('lobby');
  const [updateInfo, setUpdateInfo] = useState({ show: false, version: '', notes: [], url: '' });

  useEffect(() => {
    // 检查更新
    const checkVersion = async () => {
      try {
        const serverResponse = await fetch('/api/version_check.php');
        const serverData = await serverResponse.json();

        if (serverData.success) {
          const { getInfo } = CapacitorApp;
          const appInfo = await getInfo();
          
          // 注意: appInfo.version 在Android上是versionName (e.g., "1.0"), 
          // appInfo.build 是 versionCode (e.g., 1)
          const currentVersionCode = parseInt(appInfo.build, 10);

          if (serverData.latestVersionCode > currentVersionCode) {
            setUpdateInfo({
              show: true,
              version: serverData.latestVersion,
              notes: serverData.releaseNotes,
              url: serverData.downloadUrl,
            });
          }
        }
      } catch (error) {
        console.error("版本检查失败:", error);
      }
    };
    
    checkVersion();
    
    // 尝试从localStorage获取用户信息
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLoginSuccess = (userId, userData) => {
    const fullUserData = { id: userId, ...userData };
    localStorage.setItem('user', JSON.stringify(fullUserData));
    setUser(fullUserData);
    setCurrentView('lobby');
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };
  
  const handleUpdate = async () => {
    await Browser.open({ url: updateInfo.url });
    setUpdateInfo({ ...updateInfo, show: false });
  };
  
  const renderCurrentView = () => {
      switch (currentView) {
          case 'profile':
              return <UserProfile user={user} />;
          case 'transfer':
              return <TransferPoints currentUser={user} onTransferSuccess={() => setCurrentView('lobby')} />;
          case 'lobby':
          default:
              return <GameLobby />;
      }
  };

  if (!user) {
    return (
      <>
        <Auth onLoginSuccess={handleLoginSuccess} />
        <UpdateModal 
          show={updateInfo.show}
          version={updateInfo.version}
          notes={updateInfo.notes}
          onUpdate={handleUpdate}
          onCancel={() => setUpdateInfo({ ...updateInfo, show: false })}
        />
      </>
    );
  }

  return (
    <div className="app">
       <UpdateModal 
          show={updateInfo.show}
          version={updateInfo.version}
          notes={updateInfo.notes}
          onUpdate={handleUpdate}
          onCancel={() => setUpdateInfo({ ...updateInfo, show: false })}
        />
      <header className="app-header">
        <h1>游戏大厅</h1>
        <div className="user-actions">
          <span>欢迎, {user.phone} (ID: {user.id})</span>
          <button onClick={() => setCurrentView('lobby')}>主页</button>
          <button onClick={() => setCurrentView('profile')}>我的资料</button>
          <button onClick={() => setCurrentView('transfer')}>积分转移</button>
          <button onClick={handleLogout}>退出登录</button>
        </div>
      </header>
      <main className="app-main">
        {renderCurrentView()}
      </main>
    </div>
  );
}

export default App;
