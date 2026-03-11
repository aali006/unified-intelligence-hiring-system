// src/pages/hr/FeedbackPage.js

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Radar } from 'react-chartjs-2';
import { Button, Table, Spinner } from 'react-bootstrap';
import { FaEye, FaDownload, FaTimes } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './FeedbackPage.css';

export default function FeedbackPage() {
  // const BASE_URL = 'http://localhost:8080';
    const BASE_URL = 'https://unwithering-unattentively-herbert.ngrok-free.dev';

  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [aggregate, setAggregate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [fetchingAggregate, setFetchingAggregate] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        // const res = await axios.get(`${BASE_URL}/get-roles/`);
        // setRoles(res.data.filter((r) => r.status === 'open'));
        const res = await axios.get(`${BASE_URL}/get-roles/`, {
  headers: {
    "ngrok-skip-browser-warning": "true"
  }
});

console.log("Roles API:", res.data);

const openRoles = Array.isArray(res.data)
  ? res.data.filter(
      (r) => r.status?.toLowerCase().trim() === "open"
    )
  : [];

setRoles(openRoles);
      } catch (err) {
        console.error('❌ Failed to fetch roles:', err);
      }
    };
    fetchRoles();
  }, []);

  const fetchCandidates = async (roleId) => {
    setLoading(true);
    try {
      // const res = await axios.get(`${BASE_URL}/get-candidates/`);
      // const filtered = res.data.filter(
      //   (c) => c.applied_role_id === roleId && (c.interviews || []).length >= 2
      // );
      const res = await axios.get(`${BASE_URL}/get-candidates/`, {
  headers: {
    "ngrok-skip-browser-warning": "true"
  }
});

console.log("Candidates API:", res.data);

const filtered = Array.isArray(res.data)
  ? res.data.filter(
      (c) => c.applied_role_id === roleId && (c.interviews || []).length >= 2
    )
  : [];

setCandidates(filtered);
      setCandidates(filtered);
    } catch (err) {
      console.error('❌ Failed to fetch candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAggregate = async (candidate) => {
    setSelectedCandidate(candidate);
    setAggregate(null);
    setFetchingAggregate(true);
    setShowModal(true);

    try {
      const res = await axios.get(
        `${BASE_URL}/aggregate-interviews/${candidate.candidate_id}?fresh=${Date.now()}`
      );
      setAggregate(res.data);
    } catch (err) {
      console.error('❌ Failed to fetch aggregate:', err);
    } finally {
      setFetchingAggregate(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!aggregate || !selectedCandidate) return;
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text('Candidate Feedback Report', 14, 15);
    doc.setFontSize(11);
    doc.text(
      `Candidate: ${selectedCandidate.name} (${selectedCandidate.candidate_id})`,
      14,
      25
    );
    doc.text(`Verdict: ${aggregate.verdict}`, 14, 35);

    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Score']],
      body: [
        ['Communication', aggregate.average_scores.communication],
        ['Problem Solving', aggregate.average_scores.problem_solving],
        ['Domain Knowledge', aggregate.average_scores.domain_knowledge],
        ['Overall Average', aggregate.average_scores.overall_average],
      ],
    });

    let finalY = doc.lastAutoTable.finalY || 70;
    doc.text(`Strengths: ${aggregate.strengths.join(', ') || 'None'}`, 14, finalY + 15);
    doc.text(`Weaknesses: ${aggregate.weaknesses.join(', ') || 'None'}`, 14, finalY + 25);

    doc.text('Comments:', 14, finalY + 40);
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(aggregate.combined_comments, 14, finalY + 50, { maxWidth: 180 });

    doc.save(`${selectedCandidate.name}_Feedback.pdf`);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCandidate(null);
    setAggregate(null);
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) {
        closeModal();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  return (
    <div className="container feedback-page mt-4">
      <h2 className="mb-4">Interview Feedback Summary</h2>

      {/* Role Selection */}
      <div className="mb-4">
        <label className="form-label">Select Role</label>
        <select
          className="form-select"
          value={selectedRole}
          onChange={(e) => {
            setSelectedRole(e.target.value);
            fetchCandidates(e.target.value);
          }}
        >
          <option value="">-- Select a Role --</option>
          {roles.map((r) => (
            <option key={r.role_id} value={r.role_id}>
              {r.role} ({r.role_id})
            </option>
          ))}
        </select>
      </div>

      {/* Candidate Table */}
      {loading ? (
        <div className="text-center py-4">
          <Spinner animation="border" />
          <p>Loading candidates...</p>
        </div>
      ) : (
        selectedRole && (
          <Table bordered hover responsive className="feedback-table">
            <thead className="table-light">
              <tr>
                <th>Candidate ID</th>
                <th>Name</th>
                <th>Round 1 Avg</th>
                <th>Round 2 Avg</th>
                <th>Resume</th>
                <th>Aggregate</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.candidate_id}>
                  <td>{c.candidate_id}</td>
                  <td>{c.name}</td>
                  <td>
                    {c.interviews?.find((i) => i.round === 1)?.ratings
                      ? (
                          Object.values(c.interviews.find((i) => i.round === 1).ratings)
                            .reduce((a, b) => a + b, 0) / 3
                        ).toFixed(1)
                      : '-'}
                  </td>
                  <td>
                    {c.interviews?.find((i) => i.round === 2)?.ratings
                      ? (
                          Object.values(c.interviews.find((i) => i.round === 2).ratings)
                            .reduce((a, b) => a + b, 0) / 3
                        ).toFixed(1)
                      : '-'}
                  </td>
                  <td>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() =>
                        // window.open(`${BASE_URL}/get-resume/${c.candidate_id}`, '_blank')
                        window.open(
  `${BASE_URL}/get-resume/${c.candidate_id}?ngrok-skip-browser-warning=true`,
  "_blank",
  "noopener,noreferrer"
)
                      }
                    >
                      View Resume
                    </Button>
                  </td>
                  <td>
                    <Button variant="success" size="sm" onClick={() => handleViewAggregate(c)}>
                      <FaEye /> View Aggregate
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )
      )}

      {/* Custom Full-Screen Modal */}
      {showModal && (
        <div className="custom-modal-overlay" onClick={closeModal}>
          <div className="custom-modal-container" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div
              className={`custom-modal-header ${
                aggregate?.verdict === 'No Hire'
                  ? 'header-nohire'
                  : aggregate?.verdict === 'Hire'
                  ? 'header-hire'
                  : 'header-stronghire'
              }`}
            >
              <div className="header-content">
                <h2>
                  {selectedCandidate?.name}
                  <span className="candidate-id-badge">({selectedCandidate?.candidate_id})</span>
                </h2>
                {aggregate && (
                  <span className="verdict-badge">{aggregate.verdict}</span>
                )}
              </div>
              <button className="close-button" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>

            {/* Modal Body */}
            <div className="custom-modal-body">
              {fetchingAggregate ? (
                <div className="loading-container">
                  <Spinner animation="border" size="lg" />
                  <p>Fetching aggregate data...</p>
                </div>
              ) : aggregate ? (
                <div className="aggregate-content">
                  {/* Chart and Score Section */}
                  <div className="chart-score-section">
                    <div className="chart-container">
                      <h3>Skills Assessment</h3>
                      <div className="radar-chart">
                        <Radar
                          data={{
                            labels: ['Communication', 'Problem Solving', 'Domain Knowledge'],
                            datasets: [
                              {
                                label: 'Average Scores',
                                data: [
                                  aggregate.average_scores.communication,
                                  aggregate.average_scores.problem_solving,
                                  aggregate.average_scores.domain_knowledge,
                                ],
                                backgroundColor: 'rgba(59, 130, 246, 0.3)',
                                borderColor: 'rgba(59, 130, 246, 1)',
                                borderWidth: 3,
                                pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                                pointBorderColor: '#fff',
                                pointBorderWidth: 3,
                                pointRadius: 8,
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                              r: {
                                min: 0,
                                max: 5,
                                ticks: {
                                  stepSize: 1,
                                  font: { size: 14, weight: 'bold' },
                                  color: '#64748b'
                                },
                                grid: { color: '#e2e8f0' },
                                angleLines: { color: '#e2e8f0' }
                              },
                            },
                            plugins: {
                              legend: {
                                display: true,
                                position: 'bottom',
                                labels: {
                                  font: { size: 16, weight: 'bold' },
                                  color: '#1e293b',
                                  padding: 25
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="score-container">
                      <div className="overall-score-display">
                        <div className="score-number">
                          {aggregate.average_scores.overall_average}
                        </div>
                        <div className="score-label">Overall Average</div>
                        <div className="score-out-of">/5.0</div>
                      </div>

                      <div className="progress-bar-container">
                        <div className="progress-bar-bg">
                          <div
                            className={`progress-bar-fill ${
                              aggregate.average_scores.overall_average >= 3
                                ? 'progress-success'
                                : 'progress-danger'
                            }`}
                            style={{
                              width: `${(aggregate.average_scores.overall_average / 5) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      <button className="download-report-btn" onClick={handleDownloadPDF}>
                        <FaDownload /> Download Report
                      </button>
                    </div>
                  </div>

                  {/* Strengths and Weaknesses */}
                  <div className="strengths-weaknesses-section">
                    <div className="strengths-container">
                      <h3>💪 Strengths</h3>
                      <div className="tags-wrapper">
                        {aggregate.strengths.length > 0 ? (
                          aggregate.strengths.map((s, i) => (
                            <span className="strength-tag" key={i}>{s}</span>
                          ))
                        ) : (
                          <span className="no-data">No specific strengths noted</span>
                        )}
                      </div>
                    </div>

                    <div className="weaknesses-container">
                      <h3>⚠️ Areas for Improvement</h3>
                      <div className="tags-wrapper">
                        {aggregate.weaknesses.length > 0 ? (
                          aggregate.weaknesses.map((w, i) => (
                            <span className="weakness-tag" key={i}>{w}</span>
                          ))
                        ) : (
                          <span className="no-data">No specific weaknesses noted</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Comments Section */}
                  <div className="comments-section">
                    <h3>📝 Detailed Feedback</h3>
                    <div className="comments-content">
                      {aggregate.combined_comments || "No detailed comments available."}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-data-container">
                  <p>No aggregate data available for this candidate.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}