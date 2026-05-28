import React, { useState, useEffect } from 'react';
import HomePage from './components/HomePage';
import Dashboard from './components/DashBoard';
import Footer from './components/Footer';

export default function App() {
  const [tokenData, setTokenData] = useState(() => {
    const saved = localStorage.getItem('pr2_tokenData');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return null;
  });

  const handleLogin = (data) => {
    console.log("Login successful!", data);
    setTokenData(data); // { token, user: { id, name } }
    localStorage.setItem('pr2_tokenData', JSON.stringify(data));
  };

  const handleLogout = () => {
    console.log("Logout clicked!");
    setTokenData(null);
    localStorage.removeItem('pr2_tokenData');
  };

  const handleUpdateTier = (newTier) => {
    if (!tokenData) return;
    const updatedData = { ...tokenData, subscriptionTier: newTier };
    setTokenData(updatedData);
    localStorage.setItem('pr2_tokenData', JSON.stringify(updatedData));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ flex: 1 }}>
        {tokenData ? (
          <Dashboard onLogout={handleLogout} tokenData={tokenData} onUpdateTier={handleUpdateTier} />
        ) : (
          <HomePage onLogin={handleLogin} />
        )}
      </div>
      <Footer />
    </div>
  );
}