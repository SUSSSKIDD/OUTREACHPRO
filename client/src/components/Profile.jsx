import React, { useState, useEffect } from 'react';
import axios from 'axios';

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

const GMAIL_AUTH_URL = 'http://localhost:8000/api/auth/login';

function Profile() {
  const [selectedRole, setSelectedRole] = useState('');
  const [resume, setResume] = useState(null);
  const [myResumes, setMyResumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [showModal, setShowModal] = useState(false);

  const fetchResumes = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/resume/my', {
        withCredentials: true,
      });
      setMyResumes(res.data);
    } catch (err) {
      console.error("Failed to fetch resumes", err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 5 * 1024 * 1024) {
      alert("❌ File too large. Must be less than 5MB.");
      setResume(null);
      e.target.value = null;
    } else {
      setResume(file);
    }
  };

  const uploadResume = async () => {
    if (!selectedRole || !resume) {
      return alert("⚠️ Please select a role and upload a valid PDF resume under 5MB.");
    }

    const formData = new FormData();
    formData.append('role', selectedRole);
    formData.append('resume', resume);

    try {
      setLoading(true);
      await axios.post('http://localhost:8000/api/resume/upload', formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert("✅ Resume uploaded!");
      setSelectedRole('');
      setResume(null);
      fetchResumes();
    } catch (err) {
      console.error("Upload failed:", err);
      alert("❌ Upload failed. Please ensure you're uploading a PDF under 5MB.");
    } finally {
      setLoading(false);
    }
  };

  const viewResume = async (id) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/resume/url/${id}`, {
        withCredentials: true,
      });
      setPreviewUrl(res.data.url);
      setShowModal(true);
    } catch (err) {
      alert("❌ Could not generate view link.");
    }
  };

  const deleteResume = async (id) => {
    try {
      await axios.delete(`http://localhost:8000/api/resume/${id}`, {
        withCredentials: true,
      });
      setMyResumes(myResumes.filter(r => r._id !== id));
    } catch (err) {
      alert("❌ Could not delete resume");
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-semibold mb-4">📁 Resume Manager</h2>

      <div className="space-y-4 mb-8">
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="">Select a Role</option>
          {roles.map((role, idx) => (
            <option key={idx} value={role}>{role}</option>
          ))}
        </select>

        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="w-full"
        />

        <button
          onClick={uploadResume}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Uploading..." : "Upload Resume"}
        </button>
      </div>

      <h3 className="text-lg font-medium mb-2">Your Uploaded Resumes:</h3>
      {myResumes.length === 0 ? (
        <p className="text-gray-600">No resumes uploaded yet.</p>
      ) : (
        <ul className="space-y-2">
          {myResumes.map((res) => (
            <li key={res._id} className="border p-3 rounded flex items-center justify-between gap-2">
              <span className="font-medium">{res.role}</span>
              <div className="flex gap-3">
                <button onClick={() => viewResume(res._id)} className="text-blue-600 underline">View</button>
                <button onClick={() => deleteResume(res._id)} className="text-red-600 underline">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold mb-2 text-yellow-700">Gmail Authorization</h3>
        <p className="text-sm mb-2 text-yellow-800">
          If you have trouble sending emails, or if you see a 'Gmail not authorized' or 'Bad Credentials' error, please re-authorize your Gmail account. This will update your Gmail access in our system.
        </p>
        <button
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded font-semibold"
          onClick={() => window.open(GMAIL_AUTH_URL, '_blank')}
        >
          Re-authorize Gmail
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg max-w-3xl w-full relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-2 right-3 text-gray-700 text-lg font-bold"
            >
              ✖
            </button>
            <iframe
              src={previewUrl}
              title="Resume Preview"
              className="w-full h-[500px] rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
