import React, { useState, useEffect } from 'react';
import { auth, provider } from './firebase';
import { signInWithPopup } from 'firebase/auth';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import axios from 'axios';

import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';

import Navbar from './components/Navbar';
import Profile from './components/Profile';
import ActiveHiring from './pages/ActiveHiring';
import SentApplications from './pages/SentApplications';
import AdminUpload from './pages/AdminUpload';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  console.log('App component rendering, user:', user);

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/auth/me', {
          withCredentials: true,
        });
        setUser(res.data.user);
      } catch (err) {
        console.log('User not authenticated');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      const visitorId = result.visitorId;

      const loginRes = await signInWithPopup(auth, provider);
      const idToken = await loginRes.user.getIdToken();

      const res = await axios.post(
        'http://localhost:8000/api/auth/login',
        { idToken, visitorId },
        { withCredentials: true }
      );

      setUser(res.data.user);
      alert("✅ Login successful");
    } catch (err) {
      alert(err?.response?.data?.message || "Login failed");
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:8000/api/auth/logout', {}, {
        withCredentials: true,
      });
    } catch (err) {
      console.log('Logout endpoint not available');
    }
    
    setUser(null);
    localStorage.clear();
    sessionStorage.clear();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-bold mb-4">🔥 OUTREACHPRO</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    console.log('User not logged in, showing login page');
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-bold mb-4">🔥 OUTREACHPRO</h1>
        <button
          onClick={loginWithGoogle}
          className="bg-red-600 text-white px-6 py-3 rounded hover:bg-red-700"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  console.log('User is logged in, rendering routes');
  
  return (
    <Router>
      <div>
        <div className="bg-gray-800 text-white px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex gap-6">
              <Link to="/profile" className="hover:underline">Profile</Link>
              <Link to="/active-hiring" className="hover:underline">Active Hiring</Link>
              <Link to="/sent-applications" className="hover:underline">Sent Applications</Link>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      <div className="p-6">
        <Routes>
          <Route path="/profile" element={<Profile />} />
          <Route path="/active-hiring" element={<ActiveHiring />} />
          <Route path="/sent-applications" element={<SentApplications />} />
          <Route path="/admin" element={<AdminUpload />} />
          <Route path="*" element={<Navigate to="/profile" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
