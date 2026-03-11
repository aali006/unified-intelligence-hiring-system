import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './ViewCandidates.css';
import { FaTrashAlt, FaEye } from 'react-icons/fa';

function ViewCandidates() {
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [candidates, setCandidates] = useState([]);

  // const BASE_URL = 'http://localhost:8080';
const BASE_URL = 'https://unwithering-unattentively-herbert.ngrok-free.dev';


  useEffect(() => {
    fetchRoles();
    fetchCandidates();
  }, []);

  // const fetchRoles = async () => {
  //   const res = await axios.get(`${BASE_URL}/get-roles/`);
  //   const openRoles = res.data.filter((role) => role.status === 'open');
  //   setRoles(openRoles);
  // };
  const fetchRoles = async () => {
  try {

    const res = await axios.get(`${BASE_URL}/get-roles/`, {
      headers: {
        "ngrok-skip-browser-warning": "true"
      }
    });

    console.log("Roles API:", res.data);

    const openRoles = Array.isArray(res.data)
      ? res.data.filter(
          (role) => role.status?.toLowerCase().trim() === "open"
        )
      : [];

    setRoles(openRoles);

  } catch (err) {

    console.error("Error fetching roles:", err);

  }
};

  // const fetchCandidates = async () => {
  //   const res = await axios.get(`${BASE_URL}/get-candidates/`);
  //   setCandidates(res.data);
  // };

  const fetchCandidates = async () => {
  try {

    const res = await axios.get(`${BASE_URL}/get-candidates/`, {
      headers: {
        "ngrok-skip-browser-warning": "true"
      }
    });

    console.log("Candidates API:", res.data);

    const candidateList = Array.isArray(res.data) ? res.data : [];

    setCandidates(candidateList);

  } catch (err) {

    console.error("Error fetching candidates:", err);

  }
};

  const getAvgScore = (candidate, round) => {
    if (!candidate || !Array.isArray(candidate.interviews)) return '-';

    const roundData = candidate.interviews.find((int) => int.round === round);
    if (!roundData || !roundData.ratings) return '-';

    const ratings = roundData.ratings;
    const values = Object.values(ratings);
    if (values.length === 0) return '-';

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = (sum / values.length).toFixed(1);

    return avg;
  };

  const handleDeleteCandidate = async (id) => {
    if (window.confirm('Are you sure you want to delete this candidate?')) {
      await axios.delete(`${BASE_URL}/delete-candidate/${id}`);
      fetchCandidates();
    }
  };

  // const filtered = candidates.filter(c => c.applied_role_id === selectedRoleId);
  const filtered = Array.isArray(candidates)
  ? candidates.filter(c => c.applied_role_id === selectedRoleId)
  : [];
  // const pending = filtered.filter(c => (c.interviews || []).length < 2);
  // const completed = filtered.filter(c => (c.interviews || []).length === 2);
  const pending = Array.isArray(filtered)
  ? filtered.filter(c => (c.interviews || []).length < 2)
  : [];

const completed = Array.isArray(filtered)
  ? filtered.filter(c => (c.interviews || []).length === 2)
  : [];

  const renderTable = (list, title) => (
    <div className="candidate-section">
      <h4>{title}</h4>
      <table className="table table-bordered">
        <thead>
          <tr>
            <th>Candidate ID</th>
            <th>Name</th>
            <th>L1 Avg</th>
            <th>L2 Avg</th>
            <th>Resume</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {list.map((c) => (
            <tr key={c.candidate_id || Math.random()}>
              <td>{c.candidate_id}</td>
              <td>{c.name}</td>
              <td>{getAvgScore(c, 1)}</td>
              <td>{getAvgScore(c, 2)}</td>
              <td>
                {/* <button
                  className="btn btn-outline-primary btn-sm"
                  title="View Resume"
                  onClick={() =>
                    // window.open(`${BASE_URL}/get-resume/${c.candidate_id}`, '_blank')
                    window.open(
  `${BASE_URL}/get-resume/${c.candidate_id}?ngrok-skip-browser-warning=true`,
  "_blank"
)
                  }
                >
                  <FaEye />
                </button> */}
                <button
  className="btn btn-outline-primary btn-sm"
  title="View Resume"
  onClick={() =>
    window.open(
      `${BASE_URL}/get-resume/${c.candidate_id}?ngrok-skip-browser-warning=true`,
      "_blank",
      "noopener,noreferrer"
    )
  }
>
  <FaEye />
</button>
              </td>
              <td>
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => handleDeleteCandidate(c.candidate_id)}
                  title="Delete Candidate"
                >
                  <FaTrashAlt />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="container mt-4">
      <h3>View Candidates</h3>
      <div className="form-group mb-3">
        <label>Select Role:</label>
        <select
          className="form-select"
          value={selectedRoleId}
          onChange={(e) => setSelectedRoleId(e.target.value)}
        >
          <option value="">-- Select a Role --</option>
          {roles.map((role) => (
            <option key={role.role_id} value={role.role_id}>
              {role.role} ({role.role_id})
            </option>
          ))}
        </select>
      </div>

      {selectedRoleId && (
        <>
          {renderTable(pending, 'Pending Interviews')}
          {renderTable(completed, 'Completed Interviews')}
        </>
      )}
    </div>
  );
}

export default ViewCandidates;
