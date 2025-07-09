import React, { useState } from 'react';
import axios from 'axios';

function AdminUpload() {
  const [file, setFile] = useState(null);
  const [target, setTarget] = useState('active');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [adminStatus, setAdminStatus] = useState(null);
  
  // Make admin states
  const [adminEmail, setAdminEmail] = useState('');
  const [makeAdminLoading, setMakeAdminLoading] = useState(false);
  const [makeAdminMessage, setMakeAdminMessage] = useState('');
  
  // Admin list states
  const [adminList, setAdminList] = useState([]);
  const [adminListLoading, setAdminListLoading] = useState(false);

  // Check admin status on component mount
  React.useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/admin/status', {
          withCredentials: true,
        });
        setAdminStatus(res.data);
        // If admin, fetch admin list
        if (res.data.user.isAdmin) {
          fetchAdminList();
        }
      } catch (err) {
        console.error('Admin check failed:', err);
        setAdminStatus({ error: 'Not an admin' });
      }
    };
    
    checkAdminStatus();
  }, []);

  const fetchAdminList = async () => {
    setAdminListLoading(true);
    try {
      const res = await axios.get('http://localhost:8000/api/admin/admins', {
        withCredentials: true,
      });
      setAdminList(res.data.admins);
    } catch (err) {
      console.error('Failed to fetch admin list:', err);
    } finally {
      setAdminListLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        alert('❌ Please select a CSV file');
        e.target.value = null;
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setMessage('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('❌ Please select a CSV file');
      return;
    }

    setLoading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('csv', file);
    formData.append('target', target);

    try {
      const res = await axios.post('http://localhost:8000/api/admin/upload', formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setMessage(`✅ Successfully uploaded ${res.data.count} records to ${res.data.target}!`);
      setFile(null);
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
      
    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Upload failed';
      setMessage(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMakeAdmin = async () => {
    if (!adminEmail.trim()) {
      setMakeAdminMessage('❌ Please enter an email address');
      return;
    }

    setMakeAdminLoading(true);
    setMakeAdminMessage('');

    try {
      const res = await axios.post('http://localhost:8000/api/admin/make-admin', {
        email: adminEmail.trim()
      }, {
        withCredentials: true,
      });
      
      setMakeAdminMessage(`✅ ${res.data.message}`);
      setAdminEmail('');
      // Refresh admin list after making someone admin
      fetchAdminList();
    } catch (err) {
      console.error('Make admin error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to make user admin';
      setMakeAdminMessage(`❌ ${errorMessage}`);
    } finally {
      setMakeAdminLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-6">🛠 Admin Panel</h2>

      {/* Admin Status */}
      {adminStatus && (
        <div className={`p-3 rounded-lg mb-6 ${
          adminStatus.error 
            ? 'bg-red-50 border border-red-200 text-red-800' 
            : 'bg-green-50 border border-green-200 text-green-800'
        }`}>
          {adminStatus.error ? (
            <p>❌ {adminStatus.error}</p>
          ) : (
            <p>✅ {adminStatus.message} - Logged in as: {adminStatus.user.email}</p>
          )}
        </div>
      )}

      {/* Admin List Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">👥 Current Admins ({adminList.length})</h3>
        {adminListLoading ? (
          <p className="text-gray-600">⏳ Loading admin list...</p>
        ) : adminList.length === 0 ? (
          <p className="text-gray-600">No admins found.</p>
        ) : (
          <div className="space-y-1">
            {adminList.map((email, index) => (
              <div key={index} className="flex items-center p-2 bg-white rounded border">
                <span className="text-sm text-gray-500 mr-3 font-medium">{index + 1})</span>
                <span className="text-sm font-medium text-gray-700">{email}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Make Admin Section */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-purple-800 mb-4">👑 Make User Admin</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-purple-700 mb-1">User Email:</label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="Enter user's email address"
              className="w-full border border-purple-300 p-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <button
            onClick={handleMakeAdmin}
            disabled={makeAdminLoading || !adminEmail.trim()}
            className={`w-full p-2 rounded-lg font-medium transition-colors ${
              makeAdminLoading || !adminEmail.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {makeAdminLoading ? '⏳ Making Admin...' : '👑 Make Admin'}
          </button>
          {makeAdminMessage && (
            <div className={`p-2 rounded-lg text-sm ${
              makeAdminMessage.startsWith('✅') 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {makeAdminMessage}
            </div>
          )}
        </div>
      </div>

      {/* CSV Upload Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-800 mb-2">📋 CSV Format Requirements:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          {target === 'active' ? (
            <>
              <li>• <strong>Required columns:</strong> name, email, jobLink, role, company</li>
              <li>• <strong>File format:</strong> CSV only</li>
            </>
          ) : (
            <>
              <li>• <strong>Required columns:</strong> name, email, position, company</li>
              <li>• <strong>Optional column:</strong> LinkedIn profile</li>
              <li>• <strong>File format:</strong> CSV only</li>
            </>
          )}
        </ul>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Target Database:</label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="active">Active Hiring</option>
            <option value="hr">HR Database</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">CSV File:</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {file && (
            <p className="text-sm text-gray-600 mt-1">Selected: {file.name}</p>
          )}
        </div>

        <button
          onClick={handleUpload}
          disabled={loading || !file}
          className={`w-full p-3 rounded-lg font-medium transition-colors ${
            loading || !file
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {loading ? '⏳ Uploading...' : '📤 Upload CSV'}
        </button>

        {message && (
          <div className={`p-3 rounded-lg ${
            message.startsWith('✅') 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminUpload;
