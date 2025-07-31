// src/components/ComparisonSection.js
import React, { useState } from 'react';
import { Radar, Bar } from 'react-chartjs-2';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { FiExternalLink } from 'react-icons/fi';

import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
} from 'chart.js';

import './ComparisonSection.css';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

function ComparisonSection({ candidates }) {
  const [showDetails, setShowDetails] = useState(false);

  if (!candidates || candidates.length === 0) return null;

  const radarLabels = [
    'Fitment Score',
    'Semantic Similarity',
    'Matched Skills',
    'Minor Gaps (less is better)',
    'Major Gaps (less is better)',
  ];

  const radarData = {
    labels: radarLabels,
    datasets: candidates.map((c, idx) => ({
      label: c.name || c.candidate_id,
      data: [
        c.fitment_score || 0,
        (c.semantic_similarity || 0) * 100,
        (c.matched_skills || []).length,
        -1 * ((c.gap_analysis?.minor || []).length),
        -1 * ((c.gap_analysis?.major || []).length),
      ],
      fill: true,
      backgroundColor: `rgba(${120 + idx * 40}, ${80 + idx * 30}, 220, 0.2)`,
      borderColor: `rgba(${120 + idx * 40}, ${80 + idx * 30}, 220, 1)`,
      pointBackgroundColor: `rgba(${120 + idx * 40}, ${80 + idx * 30}, 220, 1)`,
    }))
  };

  const radarOptions = {
    responsive: true,
    scales: {
      r: {
        beginAtZero: false,
        ticks: {
          callback: value => (value >= 0 ? value : `-${Math.abs(value)}`)
        }
      }
    },
    plugins: {
      legend: { position: 'top' }
    }
  };

  const barLabels = candidates.map(c => c.name || c.candidate_id);
  const fitmentScores = candidates.map(c => c.fitment_score || 0);
  const semanticScores = candidates.map(c => Math.round((c.semantic_similarity || 0) * 100));

  const barData = {
    labels: barLabels,
    datasets: [
      {
        label: 'Fitment Score (%)',
        data: fitmentScores,
        backgroundColor: '#007bff'
      },
      {
        label: 'Semantic Similarity (%)',
        data: semanticScores,
        backgroundColor: '#66B3FF'
      }
    ]
  };

  const barOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        grace: '5%'
      }
    },
    plugins: {
      legend: { position: 'top' }
    }
  };

  const exportToPDF = async () => {
    const element = document.querySelector(".comparison-container");
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const imgRatio = imgProps.width / imgProps.height;
    const pdfWidth = pageWidth;
    const pdfHeight = pdfWidth / imgRatio;

    if (pdfHeight > pageHeight) {
      const totalPages = Math.ceil(pdfHeight / pageHeight);
      for (let i = 0; i < totalPages; i++) {
        const y = -i * pageHeight;
        if (i !== 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, y, pdfWidth, pdfHeight);
      }
    } else {
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    }

    pdf.save('comparison.pdf');
  };

  return (
    <div className="comparison-container">
      <h3 className="section-title">📊 Candidate Fitment Comparison</h3>

      <div className="chart-section">
        <div className="chart-box">
          <Radar data={radarData} options={radarOptions} />
        </div>
        <div className="chart-box">
          <Bar data={barData} options={barOptions} />
        </div>
      </div>

      <div className="toggle-btn-container">
        <button onClick={() => setShowDetails(!showDetails)} className="toggle-btn">
          {showDetails ? '🔽 Hide Details' : '🔼 See Brief + Details'}
        </button>

        <button className="export-btn" onClick={exportToPDF}>
          Download PDF
        </button>
      </div>

      <div className="numeric-summary">
        <h4>📈 Numeric Summary</h4>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Fitment %</th>
              <th>Semantic %</th>
              <th>Matched</th>
              <th>Minor Gaps</th>
              <th>Major Gaps</th>
            </tr>
          </thead>
          <tbody>
            {candidates
              .sort((a, b) => b.fitment_score - a.fitment_score)
              .map((c, idx) => (
                <tr key={idx} className={idx === 0 ? 'top-row' : ''}>
                  <td>
                    {idx === 0 && "🥇 "}
                    {idx === 1 && "🥈 "}
                    {idx === 2 && "🥉 "}
                    {c.name || c.candidate_id}
                  </td>
                  <td>{(c.fitment_score || 0).toFixed(1)}</td>
                  <td>{((c.semantic_similarity || 0) * 100).toFixed(1)}</td>
                  <td>{(c.matched_skills || []).length}</td>
                  <td>{(c.gap_analysis?.minor || []).length}</td>
                  <td>{(c.gap_analysis?.major || []).length}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className={`detail-panel ${showDetails ? "open" : ""}`}>
        <div className="detail-content">
          {showDetails && (
            <>
              <h4>📋 Skill Gap Table</h4>
              <table className="skill-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Matched Skills</th>
                    <th>Minor Gaps</th>
                    <th>Major Gaps</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c, idx) => (
                    <tr key={idx}>
                      <td>{c.name || c.candidate_id}</td>
                      <td>{(c.matched_skills || []).map((s, i) => <span key={i} className="tag tag-green">{s}</span>)}</td>
                      <td>{(c.gap_analysis?.minor || []).map((s, i) => <span key={i} className="tag tag-yellow">{s}</span>)}</td>
                      <td>{(c.gap_analysis?.major || []).map((s, i) => <span key={i} className="tag tag-red">{s}</span>)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h4>🧠 Suggestions & Resources</h4>
              <div className="suggestions-grid">
                {candidates.map((c, idx) => (
                  <div key={idx} className="suggestion-box">
                    <h5>{c.name || c.candidate_id}</h5>
                    <p><strong>Resume Tips:</strong> {c.suggestions?.resume_improvements || '—'}</p>
                    <p><strong>Skills to Add:</strong> {(c.suggestions?.skills_to_add || []).join(', ') || '—'}</p>
                    <p><strong>Learning Links:</strong></p>
                    <ul>
                      {(c.suggestions?.learning_resources || []).length > 0
                        ? c.suggestions.learning_resources.map((res, i) => (
                            <li key={i}>
                              <a href={res.resource} target="_blank" rel="noopener noreferrer">
                                {res.skill} <FiExternalLink style={{ marginLeft: '4px' }} />
                              </a>
                            </li>
                          ))
                        : <li>—</li>}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ComparisonSection;
