import React, { useEffect, useState } from "react";
import axios from "axios";

const statusOptions = ["All", "Not Applied", "Awaiting Reply", "Got a Reply"];

function SentApplications() {
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");

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

  const filteredApps =
    statusFilter === "All"
      ? applications
      : applications.filter((app) => app.status === statusFilter);

  // Calculate status counts
  const statusCounts = {
    'Not Applied': applications.filter(app => app.status === 'Not Applied').length,
    'Awaiting Reply': applications.filter(app => app.status === 'Awaiting Reply').length,
    'Got a Reply': applications.filter(app => app.status === 'Got a Reply').length,
    'Total': applications.length
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">📬 Sent Applications</h2>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-100 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-gray-800">{statusCounts['Not Applied']}</div>
          <div className="text-sm text-gray-600">Not Applied</div>
        </div>
        <div className="bg-yellow-100 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-800">{statusCounts['Awaiting Reply']}</div>
          <div className="text-sm text-yellow-600">Awaiting Reply</div>
        </div>
        <div className="bg-green-100 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-800">{statusCounts['Got a Reply']}</div>
          <div className="text-sm text-green-600">Got a Reply</div>
        </div>
        <div className="bg-blue-100 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-800">{statusCounts['Total']}</div>
          <div className="text-sm text-blue-600">Total</div>
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
                      rel="noreferrer"
                      className="text-blue-600 underline"
                    >
                      View Thread
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
    </div>
  );
}

export default SentApplications;
