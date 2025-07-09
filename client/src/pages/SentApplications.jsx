import React, { useEffect, useState } from "react";
import axios from "axios";
import { io } from 'socket.io-client';

const statusOptions = ["All", "Not Applied", "Awaiting Reply", "Got a Reply"];

function SentApplications() {
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [showThread, setShowThread] = useState(false);

  const fetchApplications = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/sent/my", {
        withCredentials: true,
      });
      setApplications(res.data);
    } catch (err) {
      console.error("Failed to fetch applications", err);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    // Connect to socket.io server
    const socket = io('http://localhost:8000', {
      withCredentials: true,
    });
    socket.on('hr-reply', (data) => {
      // Show notification
      alert(`You have a reply from ${data.hrName}!`);
      // Refresh applications list
      fetchApplications();
      // If thread modal is open for this thread, refresh messages
      if (showThread && selectedThread === data.threadId) {
        handleViewThread(data.threadId);
      }
    });
    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line
  }, [showThread, selectedThread]);

  const addTestApplication = async () => {
    try {
      const testApp = {
        hrName: "Test HR Manager",
        hrEmail: "test.hr@example.com",
        role: "Software Engineer",
        company: "Test Company",
        source: "manual"
      };

      await axios.post("http://localhost:8000/api/sent/log-not-applied", testApp, {
        withCredentials: true,
      });

      alert("✅ Test 'Not Applied' application added!");
      fetchApplications(); // Refresh the list
    } catch (err) {
      console.error("Failed to add test application", err);
      alert("❌ Failed to add test application");
    }
  };

  const handleViewThread = async (threadId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/gmail/thread/${threadId}`);
      setThreadMessages(res.data.messages);
      setSelectedThread(threadId);
      setShowThread(true);
    } catch (err) {
      alert('Failed to fetch thread');
    }
  };

  const handleCloseThread = () => {
    setShowThread(false);
    setSelectedThread(null);
    setThreadMessages([]);
  };

  const filteredApps =
    statusFilter === "All"
      ? applications
      : applications.filter((app) => app.status === statusFilter);

  // Calculate status counts
  const statusCounts = {
    'Awaiting Reply': applications.filter(app => app.status === 'Awaiting Reply').length,
    'Got a Reply': applications.filter(app => app.status === 'Got a Reply').length,
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">📬 Sent Applications</h2>

      {/* Status Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-yellow-100 p-3 rounded-lg text-center order-1">
          <div className="text-2xl font-bold text-yellow-800">{statusCounts['Awaiting Reply']}</div>
          <div className="text-sm text-yellow-600">Awaiting Reply</div>
        </div>
        <div className="bg-green-100 p-3 rounded-lg text-center order-2">
          <div className="text-2xl font-bold text-green-800">{statusCounts['Got a Reply']}</div>
          <div className="text-sm text-green-600">Got a Reply</div>
        </div>
      </div>

      {/* Filter dropdown */}
      <div className="mb-4 flex justify-between items-center">
        <div>
          <label className="mr-2 font-medium">Filter by Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded px-2 py-1"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        
        {/* Add Test Application Button */}
        <button
          onClick={addTestApplication}
          className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
        >
          + Add Test "Not Applied"
        </button>
      </div>

      {/* List */}
      {filteredApps.length === 0 ? (
        <p className="text-gray-600">No applications found.</p>
      ) : (
        <table className="w-full border text-sm text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">HR Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Role</th>
              <th className="p-2">Company</th>
              <th className="p-2">Status</th>
              <th className="p-2">Thread</th>
            </tr>
          </thead>
          <tbody>
            {filteredApps.map((app) => (
              <tr key={app._id} className="border-b">
                <td className="p-2">{app.hrName}</td>
                <td className="p-2">
                  <a href={`mailto:${app.hrEmail}`} className="text-green-600 hover:underline">
                    {app.hrEmail}
                  </a>
                </td>
                <td className="p-2">{app.role}</td>
                <td className="p-2">{app.company || "—"}</td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    app.status === 'Not Applied' 
                      ? 'bg-gray-100 text-gray-800'
                      : app.status === 'Awaiting Reply'
                      ? 'bg-yellow-100 text-yellow-800'
                      : app.status === 'Got a Reply'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {app.status}
                  </span>
                </td>
                <td className="p-2">
                  {app.threadId ? (
                    <a
                      href={`https://mail.google.com/mail/u/0/#inbox/${app.threadId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline hover:text-blue-800"
                    >
                      View sent mail
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showThread && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-lg w-full">
            <h3 className="text-lg font-bold mb-2">Reply Thread</h3>
            <ul className="mb-4">
              {threadMessages.map((msg, idx) => (
                <li key={idx} className="mb-2">
                  <b>{msg.from}:</b> {msg.text}
                </li>
              ))}
            </ul>
            <button
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              onClick={handleCloseThread}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SentApplications;
