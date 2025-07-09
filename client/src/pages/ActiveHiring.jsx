// client/src/pages/ActiveHiring.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import EmailComposer from '../components/EmailComposer';

// Import roles from Profile component
const roles = [
  "SDE", "Full Stack Developer (MERN)", "Backend Developer (MERN)",
  "Frontend Developer (MERN)", "Frontend Developer (Next.js)", "Full Stack Java Developer",
  "Java Backend Developer (Spring, Boot, JPA, Hibernate)", "Angular Developer", "Data Analyst",
  "Business Analyst", "Data Scientist", "Data Engineer", "DevOps Engineer", "Cloud Engineer",
  "MLOps Engineer", "ML Engineer", "UI/UX Designer", "Mobile App Developer (React Native / Flutter)",
  "Blockchain Developer", "Game Developer (Unity / Unreal Engine)", "Embedded Systems Developer",
  "Site Reliability Engineer (SRE)", "Platform Engineer", "Systems Engineer", "Network Engineer",
  "AI Engineer", "Computer Vision Engineer", "NLP Engineer", "Research Scientist (AI/ML)",
  "Cybersecurity Analyst", "Security Engineer", "Ethical Hacker / Penetration Tester",
  "QA Engineer", "Automation Test Engineer", "Manual Tester", "Performance Test Engineer",
  "Product Manager (Tech)", "Technical Program Manager", "Solution Architect",
  "Business Intelligence (BI) Analyst", "QUANTITATIVE RESEARHCER AND QUANTITATIVE TRADER"
];

function ActiveHiring() {
  const [hrList, setHrList] = useState([]);
  const [selectedHR, setSelectedHR] = useState(null);
  const [applications, setApplications] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState('');

  const fetchActiveHRs = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/hr/active', {
        withCredentials: true,
      });
      setHrList(res.data);
    } catch (err) {
      console.error('Error fetching HRs:', err);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/sent/my', {
        withCredentials: true,
      });
      setApplications(res.data);
    } catch (err) {
      console.error('Error fetching applications:', err);
    }
  };

  const getApplicationStatus = (hrEmail) => {
    const app = applications.find(app => app.hrEmail === hrEmail);
    return app ? app.status : 'Not Applied';
  };

  // Add a function to refresh both lists
  const refreshLists = () => {
    fetchActiveHRs();
    fetchApplications();
  };

  // Filter HRs by selected position and application status
  const filteredHRs = (selectedPosition 
    ? hrList.filter(hr => hr.role === selectedPosition)
    : hrList
  ).filter(hr => getApplicationStatus(hr.email) === 'Not Applied');

  useEffect(() => {
    fetchActiveHRs();
    fetchApplications();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">📌 Active Hiring HRs</h2>

      {/* Position Filter */}
      <div className="mb-6">
        <label htmlFor="position-filter" className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Position:
        </label>
        <select
          id="position-filter"
          value={selectedPosition}
          onChange={(e) => setSelectedPosition(e.target.value)}
          className="w-full md:w-64 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Positions</option>
          {roles.map((role, idx) => (
            <option key={idx} value={role}>{role}</option>
          ))}
        </select>
      </div>

      {filteredHRs.length === 0 ? (
        <p className="text-gray-600">
          {selectedPosition 
            ? `No active HRs available for "${selectedPosition}" position.` 
            : 'No active HRs available right now.'
          }
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredHRs.map((hr) => (
            <div key={hr._id} className="border rounded-xl p-4 shadow">
              <div className="font-semibold text-lg">{hr.name}</div>
              <div className="text-sm text-gray-600 mb-2">
                {hr.position} at {hr.company || 'Unknown Company'}
              </div>
              <div className="text-sm text-green-600 mb-2">
                📧 <a href={`mailto:${hr.email}`} className="hover:underline">
                  {hr.email}
                </a>
              </div>
              <div className="text-sm text-blue-600 break-words mb-1">
                <a href={hr.jobLink} target="_blank" rel="noopener noreferrer">
                  View Job Link
                </a>
              </div>
              <div className="text-sm mb-2">Role: <strong>{hr.role}</strong></div>
              
              {/* Application Status */}
              <div className="mb-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  getApplicationStatus(hr.email) === 'Not Applied' 
                    ? 'bg-gray-100 text-gray-800'
                    : getApplicationStatus(hr.email) === 'Awaiting Reply'
                    ? 'bg-yellow-100 text-yellow-800'
                    : getApplicationStatus(hr.email) === 'Got a Reply'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  Status: {getApplicationStatus(hr.email)}
                </span>
              </div>

              <button
                className={`px-4 py-1 rounded text-sm ${
                  getApplicationStatus(hr.email) === 'Not Applied'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-400 text-white cursor-not-allowed'
                }`}
                onClick={() => getApplicationStatus(hr.email) === 'Not Applied' && setSelectedHR(hr)}
                disabled={getApplicationStatus(hr.email) !== 'Not Applied'}
              >
                {getApplicationStatus(hr.email) === 'Not Applied' ? '📤 Send Email' : 'Already Applied'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Email Composer Modal */}
      {selectedHR && (
        <EmailComposer
          hrData={selectedHR}
          source="active"
          onClose={() => {
            setSelectedHR(null);
            refreshLists(); // Refresh lists after closing composer
          }}
          onEmailSent={refreshLists} // New prop to trigger refresh after email sent
        />
      )}
    </div>
  );
}

export default ActiveHiring;
