import React from 'react';
import './ResumeViewer.css';


const BASE_URL = 'https://unwithering-unattentively-herbert.ngrok-free.dev';
const headers = {
  headers: {
    "ngrok-skip-browser-warning": "true"
  }
};

function ResumeViewer({ candidateId, fileName, onClose }) {
  const resumeURL = (`${BASE_URL}/get-resume/${candidateId}`, headers);

  return (
    <div className="modal-backdrop">
      <div className="modal-content-large">
        <div className="modal-header">
          <h3>{fileName || 'Resume'}</h3>
          <div className="modal-actions">
            <a
              href={resumeURL}
              target="_blank"
              rel="noreferrer"
              className="open-tab-btn"
            >
              Open in New Tab
            </a>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>
        <iframe
          src={resumeURL}
          width="100%"
          height="100%"
          title="Resume PDF"
          style={{ border: 'none' }}
        />
      </div>
    </div>
  );
}

export default ResumeViewer;
