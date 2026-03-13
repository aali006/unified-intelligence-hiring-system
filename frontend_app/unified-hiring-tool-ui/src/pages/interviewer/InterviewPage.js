// src/pages/interviewer/InterviewPage.js

import React, { useState, useEffect } from "react";
import axios from "axios";
import "./InterviewPage.css";

const BASE_URL = "https://unwithering-unattentively-herbert.ngrok-free.dev";

function InterviewPage() {
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  const [interviewData, setInterviewData] = useState({
    round: "",
    communication: "",
    domain_knowledge: "",
    problem_solving: "",
    comments: "",
  });

  const storedUser = localStorage.getItem("user");
  const parsedUser = storedUser ? JSON.parse(storedUser) : null;
  const interviewerId = parsedUser?.user_id || "";

  useEffect(() => {
    if (!interviewerId) {
      alert("❌ Interviewer not logged in properly!");
    }
  }, [interviewerId]);

  // Fetch roles
  useEffect(() => {
    axios
      .get(`${BASE_URL}/get-roles/`)
      .then((res) => {
        const roleList = Array.isArray(res.data) ? res.data : res.data.roles || [];
        const openRoles = roleList.filter((r) => r.status === "open");
        setRoles(openRoles);
      })
      .catch((err) => console.error("Role fetch error:", err));
  }, []);

  // Fetch candidates for selected role
  const fetchCandidates = async (roleId) => {
    try {
      const res = await axios.get(`${BASE_URL}/get-candidates/`);

      const candidateList = Array.isArray(res.data)
        ? res.data
        : res.data.candidates || [];

      const roleCandidates = candidateList.filter(
        (c) => String(c.applied_role_id) === String(roleId)
      );

      const filtered = roleCandidates.filter((c) => {
        const interviews = c.interviews || [];
        const hasL1 = interviews.some((i) => i.round === 1);
        const hasL2 = interviews.some((i) => i.round === 2);
        return !(hasL1 && hasL2);
      });

      setCandidates(filtered);
    } catch (err) {
      console.error("Candidate fetch error:", err);
    }
  };

  useEffect(() => {
    if (selectedRoleId) {
      fetchCandidates(selectedRoleId);
    }
  }, [selectedRoleId]);

  const getAvgScore = (interviews = [], round) => {
    const r = interviews.filter((i) => i.round === round);
    if (r.length === 0) return "-";

    const total = r.reduce((sum, i) => {
      const { communication, domain_knowledge, problem_solving } = i.ratings;
      return sum + communication + domain_knowledge + problem_solving;
    }, 0);

    return (total / (r.length * 3)).toFixed(1);
  };

  const candidateHasCompletedBothRounds = (candidate) => {
    const rounds = (candidate.interviews || []).map((i) => i.round);
    return rounds.includes(1) && rounds.includes(2);
  };

  const handleChoose = (candidate) => {
    const interviews = candidate.interviews || [];

    const hasL1 = interviews.some((i) => i.round === 1);
    const hasL2 = interviews.some((i) => i.round === 2);

    const round = !hasL1 ? 1 : !hasL2 ? 2 : "";

    setInterviewData({
      round,
      communication: "",
      domain_knowledge: "",
      problem_solving: "",
      comments: "",
    });

    setSelectedCandidate(candidate);
    setFeedbackModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!interviewerId) {
      alert("❌ Interviewer ID missing. Please log in again.");
      return;
    }

    if (!selectedCandidate || !interviewData.round) return;

    const payload = new FormData();

    payload.append("candidate_id", selectedCandidate.candidate_id);
    payload.append("round_num", interviewData.round);
    payload.append("interviewer_id", interviewerId);
    payload.append("communication", interviewData.communication);
    payload.append("domain_knowledge", interviewData.domain_knowledge);
    payload.append("problem_solving", interviewData.problem_solving);
    payload.append("comments", interviewData.comments);

    try {
      const response = await axios.post(`${BASE_URL}/add-interview/`, payload);

      if (
        response.status === 201 ||
        response.status === 200 ||
        response.data.status === "success"
      ) {
        alert("✅ Feedback submitted successfully!");

        setFeedbackModalOpen(false);
        setSelectedCandidate(null);

        fetchCandidates(selectedRoleId);
      }
    } catch (err) {
      console.error("Submission Error:", err.response?.data);
      const serverMessage =
        err.response?.data?.detail || "Failed to submit feedback";
      alert(`❌ ${serverMessage}`);
    }
  };

  return (
    <div className="interview-page">
      <h2>SELECT CANDIDATE</h2>

      <select
        className="dropdown"
        onChange={(e) => setSelectedRoleId(e.target.value)}
        value={selectedRoleId}
      >
        <option value="">Choose Role</option>
        {roles.map((r) => (
          <option key={r.role_id} value={r.role_id}>
            {r.role}
          </option>
        ))}
      </select>

      {selectedRoleId && (
        <table className="candidate-table">
          <thead>
            <tr>
              <th>Candidate ID</th>
              <th>Name</th>
              <th>Role</th>
              <th>Resume</th>
              <th>L1</th>
              <th>L2</th>
              <th>Select</th>
            </tr>
          </thead>

          <tbody>
            {candidates.length === 0 ? (
              <tr>
                <td colSpan="7">No candidates found</td>
              </tr>
            ) : (
              candidates.map((c) => (
                <tr key={c.candidate_id}>
                  <td>{c.candidate_id}</td>
                  <td>{c.name}</td>

                  <td>
                    {roles.find((r) => String(r.role_id) === String(c.applied_role_id))
                      ?.role || "—"}
                  </td>

                  <td>
                    <a
                      href={`${BASE_URL}/get-resume/${c.candidate_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      PDF
                    </a>
                  </td>

                  <td>{getAvgScore(c.interviews, 1)}</td>
                  <td>{getAvgScore(c.interviews, 2)}</td>

                  <td>
                    <button
                      className="btn-choose"
                      disabled={candidateHasCompletedBothRounds(c)}
                      onClick={() => handleChoose(c)}
                    >
                      Choose
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {feedbackModalOpen && selectedCandidate && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Interview Feedback for {selectedCandidate.name}</h3>

            <label>Round</label>

            <select
              value={interviewData.round}
              onChange={(e) =>
                setInterviewData({ ...interviewData, round: e.target.value })
              }
            >
              {interviewData.round === 1 && <option value="1">Round 1</option>}
              {interviewData.round === 2 && <option value="2">Round 2</option>}
            </select>

            <div className="ratings-row">
              <select
                value={interviewData.communication}
                onChange={(e) =>
                  setInterviewData({
                    ...interviewData,
                    communication: e.target.value,
                  })
                }
              >
                <option value="">Communication</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>

              <select
                value={interviewData.domain_knowledge}
                onChange={(e) =>
                  setInterviewData({
                    ...interviewData,
                    domain_knowledge: e.target.value,
                  })
                }
              >
                <option value="">Domain Knowledge</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>

              <select
                value={interviewData.problem_solving}
                onChange={(e) =>
                  setInterviewData({
                    ...interviewData,
                    problem_solving: e.target.value,
                  })
                }
              >
                <option value="">Problem Solving</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              placeholder="Comments"
              value={interviewData.comments}
              onChange={(e) =>
                setInterviewData({
                  ...interviewData,
                  comments: e.target.value,
                })
              }
            />

            <div className="modal-actions">
              <button
                onClick={() => {
                  const confirm = window.confirm(
                    "Are you sure you want to submit this interview feedback?"
                  );
                  if (confirm) handleSubmit();
                }}
              >
                SUBMIT
              </button>

              <button onClick={() => setFeedbackModalOpen(false)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InterviewPage;