// src/components/FitmentViewer.js
import React, { useRef } from 'react';
import './FitmentViewer.css';
import GaugeChart from 'react-gauge-chart';
import { Oval } from 'react-loader-spinner';
import html2pdf from 'html2pdf.js';
import { FiExternalLink } from 'react-icons/fi'; // External link icon

function FitmentViewer({ fitmentData, onClose, loading }) {
  const contentRef = useRef();

  const handleDownload = () => {
    if (!contentRef.current) return;

    const opt = {
      margin: 0.5,
      filename: 'fitment-analysis.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().from(contentRef.current).set(opt).save();
  };

  if (loading) {
    return (
      <div className="modal-backdrop">
        <div className="modal-content center">
          <Oval
            height={80}
            width={80}
            color="#007bff"
            visible={true}
            ariaLabel="oval-loading"
            secondaryColor="#80bdff"
            strokeWidth={2}
            strokeWidthSecondary={2}
          />
          <p>Analyzing fitment…</p>
        </div>
      </div>
    );
  }

  if (!fitmentData) return null;

  const {
    fitment_score = 0,
    semantic_similarity = 0,
    gap_analysis = {},
    suggestions = {},
    matched_skills = []
  } = fitmentData;

  const improvementsArray = suggestions?.resume_improvements
    ? suggestions.resume_improvements.split(/(?<=[.!?])\s+/).filter(Boolean)
    : [];

  return (
    <div className="modal-backdrop">
      <div className="modal-content large">
        <div className="modal-header">
          <h3>Fitment Analysis</h3>
          <div className="modal-actions">
            <button className="download-btn" onClick={handleDownload}>
              ⬇ Download PDF
            </button>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>

        <div ref={contentRef}>
          <div className="dual-gauge-container">
            <div className="gauge-item">
              <GaugeChart
                id="fitment-gauge"
                nrOfLevels={20}
                percent={fitment_score / 100}
                textColor="#000"
                needleColor="#345243"
                colors={["#FF5F6D", "#FFC371", "#00C851"]}
                arcPadding={0.02}
                animate={true}
                formatTextValue={() => `${fitment_score.toFixed(0)}%`}
              />
              <p className="gauge-label">Fitment Score</p>
            </div>

            <div className="gauge-item">
              <GaugeChart
                id="semantic-gauge"
                nrOfLevels={20}
                percent={semantic_similarity}
                textColor="#000"
                needleColor="#345243"
                colors={["#FF5F6D", "#FFC371", "#00C851"]}
                arcPadding={0.02}
                animate={true}
                formatTextValue={() => `${Math.round(semantic_similarity * 100)}%`}
              />
              <p className="gauge-label">Semantic Similarity</p>
            </div>
          </div>

          <h4>🟢 Matched Skills</h4>
          <div className="tag-list">
            {(matched_skills || []).map((skill, i) => (
              <span key={i} className="tag tag-green">{skill}</span>
            ))}
          </div>

          <h4>⚠️ Minor Gaps</h4>
          <div className="tag-list">
            {(gap_analysis?.minor || []).map((item, i) => (
              <span key={i} className="tag tag-yellow">{item}</span>
            ))}
          </div>

          <h4>🔴 Major Gaps</h4>
          <div className="tag-list">
            {(gap_analysis?.major || []).map((item, i) => (
              <span key={i} className="tag tag-red">{item}</span>
            ))}
          </div>

          <h4>🛠 Suggestions</h4>
          {improvementsArray.length > 0 ? (
            <ul className="suggestion-list">
              {improvementsArray.map((suggestion, i) => (
                <li key={i}>{suggestion}</li>
              ))}
            </ul>
          ) : (
            <p>No suggestions available.</p>
          )}

          {(suggestions?.skills_to_add?.length > 0) && (
            <>
              <h5>➕ Skills to Add</h5>
              <div className="tag-list">
                {suggestions.skills_to_add.map((skill, i) => (
                  <span key={i} className="tag tag-blue">{skill}</span>
                ))}
              </div>
            </>
          )}

          <h4>📚 Learning Resources</h4>
          <ul>
            {(suggestions?.learning_resources || []).map((res, i) => {
              const domain = res.resource?.replace(/^https?:\/\//, '').split('/')[0];
              return (
                <li key={i}>
                  {res?.resource ? (
                    <a href={res.resource} target="_blank" rel="noopener noreferrer">
                      {res.skill} <FiExternalLink style={{ marginLeft: '5px' }} />
                    </a>
                  ) : (
                    <span>{res?.skill || "Resource not available"}</span>
                  )}
                  {domain && <span style={{ marginLeft: '8px', color: '#666', fontSize: '0.9rem' }}>({domain})</span>}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default FitmentViewer;
