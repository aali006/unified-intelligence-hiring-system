import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './CompareCandidates.css';
import ResumeViewer from '../../components/ResumeViewer';
import ComparisonSection from '../../components/ComparisonSection';

function CompareCandidates() {
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedRoleName, setSelectedRoleName] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resumeModal, setResumeModal] = useState({
    open: false,
    candidateId: '',
    fileName: ''
  });
  const [comparisonData, setComparisonData] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8080/get-roles/')
      .then(res => {
        const openRoles = res.data.filter(role => role.status === 'open');
        setRoles(openRoles);
      });
  }, []);

  useEffect(() => {
    if (!selectedRoleId) return;

    const fetch = async () => {
      setLoading(true);
      try {
        const res = await axios.get('http://localhost:8080/get-candidates/');
        const roleCandidates = res.data.filter(c => c.applied_role_id === selectedRoleId);
        const filtered = [];

        for (let c of roleCandidates) {
          const interviews = c.interviews || [];
          const hasR1 = interviews.some(r => r.round === 1);
          const hasR2 = interviews.some(r => r.round === 2);
          if (hasR1 && hasR2) continue;

          try {
            const f = await axios.get(`http://localhost:8080/score-fitment/${c.candidate_id}`);
            filtered.push({ ...c, fitmentData: f.data });
          } catch {}
        }

        setCandidates(filtered);
        const role = roles.find(r => r.role_id === selectedRoleId);
        setSelectedRoleName(role?.role || '');
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [selectedRoleId]);

  const handleToggle = (id) => {
    setSelectedCandidates(prev =>
      prev.includes(id)
        ? prev.filter(cid => cid !== id)
        : prev.length < 4
          ? [...prev, id]
          : (alert('Max 4 candidates'), prev)
    );
  };

  const fetchAndShowComparison = async () => {
    setLoading(true);
    try {
      const data = await Promise.all(
        selectedCandidates.map(id =>
          axios.get(`http://localhost:8080/score-fitment/${id}`)
        )
      );
      setComparisonData(data.map(d => d.data));
    } catch (err) {
      console.error('Comparison load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="compare-page">
      <h2>Compare Candidates</h2>

      <select
        className="dropdown"
        onChange={(e) => setSelectedRoleId(e.target.value)}
        value={selectedRoleId}
      >
        <option value="">Select Role</option>
        {roles.map((r) => (
          <option key={r.role_id} value={r.role_id}>{r.role}</option>
        ))}
      </select>

      {selectedRoleName && (
        <>
          <p className="note">Select 2 to 4 candidates to compare.</p>

          <table className="candidate-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Resume</th>
                <th>Select</th>
              </tr>
            </thead>
            <tbody>
              {candidates.length === 0 ? (
                <tr><td colSpan="4">No eligible candidates</td></tr>
              ) : (
                candidates.map((c) => (
                  <tr key={c.candidate_id}>
                    <td>{c.candidate_id}</td>
                    <td>{c.name}</td>
                    <td>
                      <a
                        href={`http://localhost:8080/get-resume/${c.candidate_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="resume-link"
                      >
                        View PDF
                      </a>
                    </td>
                    <td>
                      <button
                        className={`btn-choose ${selectedCandidates.includes(c.candidate_id) ? 'selected' : ''}`}
                        onClick={() => handleToggle(c.candidate_id)}
                      >
                        {selectedCandidates.includes(c.candidate_id) ? 'Selected' : 'Choose'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <button
            className="compare-btn"
            onClick={fetchAndShowComparison}
            disabled={selectedCandidates.length < 2}
          >
            See Comparison
          </button>
        </>
      )}

      {comparisonData.length > 0 && (
        <ComparisonSection candidates={comparisonData} />
      )}

      {resumeModal.open && (
        <ResumeViewer
          candidateId={resumeModal.candidateId}
          fileName={resumeModal.fileName}
          onClose={() => setResumeModal({ open: false, candidateId: '', fileName: '' })}
        />
      )}
    </div>
  );
}

export default CompareCandidates;
