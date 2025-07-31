import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './RolesPage.css';
import { FaEye, FaEdit, FaTrashAlt, FaTimesCircle, FaUndo } from 'react-icons/fa';

function RolesPage() {
  const [openRoles, setOpenRoles] = useState([]);
  const [closedRoles, setClosedRoles] = useState([]);
  const [selectedJD, setSelectedJD] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editVacancyData, setEditVacancyData] = useState({ role_id: '', positions: 0 });

  const BASE_URL = 'http://localhost:8080';

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/get-roles/`);
      const roles = response.data;
      setOpenRoles(roles.filter((role) => role.status === 'open'));
      setClosedRoles(roles.filter((role) => role.status === 'closed'));
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const handleViewJD = (jdText) => {
    setSelectedJD(jdText);
    setShowModal(true);
  };

  const handleClose = async (role_id) => {
    try {
      await axios.post(`${BASE_URL}/close-role/${role_id}`);
      fetchRoles();
    } catch (err) {
      console.error('Error closing role:', err);
    }
  };

  const handleDelete = async (role_id) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      try {
        await axios.delete(`${BASE_URL}/delete-role/${role_id}`);
        fetchRoles();
      } catch (err) {
        console.error('Error deleting role:', err);
      }
    }
  };

  const handleEdit = (role) => {
    setEditVacancyData({ role_id: role.role_id, positions: role.positions });
    setShowEditModal(true);
  };

  const handleVacancyChange = (e) => {
    setEditVacancyData((prev) => ({ ...prev, positions: e.target.value }));
  };

  const saveVacancyUpdate = async () => {
    try {
      await axios.put(`${BASE_URL}/update-role/${editVacancyData.role_id}`, {
        positions: Number(editVacancyData.positions),
      });
      setShowEditModal(false);
      fetchRoles();
    } catch (err) {
      console.error('Failed to update vacancies:', err);
    }
  };

  const handleReopenRole = async (roleId) => {
    try {
      await axios.put(`${BASE_URL}/update-role/${roleId}`, {
        status: 'open',
      });
      fetchRoles();
    } catch (err) {
      console.error('Failed to reopen role:', err);
    }
  };

  const renderTable = (roles, isClosed = false) => (
    <table className="table table-bordered mt-4">
      <thead className="table-light">
        <tr>
          <th>Role ID</th>
          <th>Position</th>
          <th>Job Description</th>
          <th>Vacancies</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {roles.map((role) => (
          <tr key={role.role_id}>
            <td>{role.role_id}</td>
            <td>{role.role}</td>
            <td>
              <FaEye
                className="icon view"
                onClick={() => handleViewJD(role.job_description)}
                title="View JD"
              />
            </td>
            <td>{role.positions}</td>
            <td className="action-buttons">
              <div className="icon-group">
                {!isClosed ? (
                  <>
                    <FaEdit className="icon edit" onClick={() => handleEdit(role)} title="Edit Vacancies" />
                    <FaTimesCircle className="icon close" onClick={() => handleClose(role.role_id)} title="Close Role" />
                  </>
                ) : (
                  <FaUndo className="icon edit" onClick={() => handleReopenRole(role.role_id)} title="Reopen Role" />
                )}
                <FaTrashAlt className="icon delete" onClick={() => handleDelete(role.role_id)} title="Delete Role" />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="container mt-5">
      <h2>Open Positions</h2>
      {renderTable(openRoles, false)}

      <h2 className="mt-5">Closed Positions</h2>
      {renderTable(closedRoles, true)}

      {showModal && (
        <div className="modal d-block" tabIndex="-1" onClick={() => setShowModal(false)}>
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Job Description</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <pre style={{ whiteSpace: 'pre-wrap' }}>{selectedJD}</pre>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const newTab = window.open();
                    newTab.document.write(`<pre>${selectedJD}</pre>`);
                  }}
                >
                  Open in New Tab
                </button>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Vacancies</h5>
                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
              </div>
              <div className="modal-body">
                <label>Number of Vacancies:</label>
                <input
                  type="number"
                  className="form-control"
                  value={editVacancyData.positions}
                  onChange={handleVacancyChange}
                  min="0"
                />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={saveVacancyUpdate}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RolesPage;
