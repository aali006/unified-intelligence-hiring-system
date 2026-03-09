// src/pages/interviewer/FitmentScorer.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './FitmentScorer.css';
import ResumeViewer from '../../components/ResumeViewer';
import FitmentViewer from '../../components/FitmentViewer';

function FitmentScorer() {
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedRoleName, setSelectedRoleName] = useState('');
  const [filteredCandidates, setFilteredCandidates] = useState([]);

  const [resumeModal, setResumeModal] = useState({
    open: false,
    candidateId: '',
    fileName: ''
  });

  // ✅ Fitment modal state with loading
  const [fitmentModal, setFitmentModal] = useState({
    open: false,
    data: null,
    loading: false
  });

  // ✅ Fetch Fitment Data
  const fetchFitmentData = async (candidateId) => {
    setFitmentModal({ open: true, data: null, loading: true });
    try {
      const res = await axios.get(`http://localhost:8080/score-fitment/${candidateId}`);
      setFitmentModal({ open: true, data: res.data, loading: false });
    } catch (err) {
      console.error('❌ Fitment fetch failed:', err);
      setFitmentModal({ open: true, data: null, loading: false });
    }
  };

  // Fetch roles on mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await axios.get('http://localhost:8080/get-roles/');
        const openRoles = res.data.filter((r) => r.status === 'open');
        setRoles(openRoles);
      } catch (err) {
        console.error('❌ Failed to fetch roles:', err);
      }
    };
    fetchRoles();
  }, []);

  // Fetch candidates based on role
  useEffect(() => {
    if (!selectedRoleId) return;

    const fetchCandidates = async () => {
      try {
        const res = await axios.get('http://localhost:8080/get-candidates/');
        const roleCandidates = res.data.filter((c) => c.applied_role_id === selectedRoleId);

        const pendingCandidates = roleCandidates.filter((c) => {
          const interviews = c.interviews || [];
          const hasR1 = interviews.some((r) => r.round === 1);
          const hasR2 = interviews.some((r) => r.round === 2);
          return !(hasR1 && hasR2);
        });

        setFilteredCandidates(pendingCandidates);
      } catch (err) {
        console.error('❌ Failed to fetch candidates:', err);
      }
    };

    fetchCandidates();
  }, [selectedRoleId]);

  const handleRoleChange = (e) => {
    const roleId = e.target.value;
    setSelectedRoleId(roleId);
    const role = roles.find((r) => r.role_id === roleId);
    setSelectedRoleName(role?.role || '');
  };

  return (
    <div className="fitment-page">
      <h2 className="page-title">Candidate Fitment Scorer</h2>

      <select className="dropdown" onChange={handleRoleChange} value={selectedRoleId}>
        <option value="">Select Role</option>
        {roles.map((role) => (
          <option key={role.role_id} value={role.role_id}>
            {role.role}
          </option>
        ))}
      </select>

      {selectedRoleName && (
        <>
          <h3 className="section-title">
            Candidates for selected role: <strong>{selectedRoleName}</strong>
          </h3>

          <table className="candidate-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Resume</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan="4">No pending candidates found.</td>
                </tr>
              ) : (
                filteredCandidates.map((candidate) => (
                  <tr key={candidate.candidate_id}>
                    <td>{candidate.candidate_id}</td>
                    <td>{candidate.name}</td>
                    <td>
                      <button
                        onClick={() =>
                          setResumeModal({
                            open: true,
                            candidateId: candidate.candidate_id,
                            fileName: candidate.file_name
                          })
                        }
                        className="btn btn-link"
                        style={{
                          color: '#007bff',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        PDF
                      </button>
                    </td>
                    <td>
                      <button
                        className="fitment-btn"
                        onClick={() => fetchFitmentData(candidate.candidate_id)}
                      >
                        View Fitment
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      )}

      {/* Resume Viewer Modal */}
      {resumeModal.open && (
        <ResumeViewer
          candidateId={resumeModal.candidateId}
          fileName={resumeModal.fileName}
          onClose={() => setResumeModal({ open: false, candidateId: '', fileName: '' })}
        />
      )}

      {/* ✅ Fitment Viewer with loading */}
      {fitmentModal.open && (
        <FitmentViewer
          fitmentData={fitmentModal.data}
          loading={fitmentModal.loading}
          onClose={() => setFitmentModal({ open: false, data: null, loading: false })}
        />
      )}
    </div>
  );
}

export default FitmentScorer;
