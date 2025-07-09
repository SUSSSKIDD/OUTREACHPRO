import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';

const Navbar = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/admin/status', {
          withCredentials: true,
        });
        setIsAdmin(true);
      } catch (err) {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:8000/api/auth/logout', {}, {
        withCredentials: true,
      });
    } catch (err) {
      console.log('Logout endpoint not available');
    }
    
    localStorage.clear();
    sessionStorage.clear();
    navigate('/');
    window.location.reload();
  };
  console.log("Navbar admin state:", { isAdmin, loading });
  return (
    <nav className="bg-gray-800 text-white px-4 py-3">
      <div className="flex justify-between items-center">
        <div className="flex gap-6">
          <Link to="/profile" className="hover:underline">Profile</Link>
          <Link to="/active-hiring" className="hover:underline">Active Hiring</Link>
          <Link to="/sent-applications" className="hover:underline">Sent Applications</Link>
          {/* Only show Admin button for admins */}
          {!loading && isAdmin && (
            <Link to="/admin" className="hover:underline text-yellow-300">🛠 Admin</Link>
          )}
        </div>
        
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar; 