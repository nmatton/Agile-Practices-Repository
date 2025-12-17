import React, { useState } from 'react';
import './Teams.css';

const InviteMemberModal = ({ onClose, onSubmit, loading }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (error) {
      setError('');
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    
    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    
    onSubmit(email.trim());
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Invite Team Member</h2>
          <button 
            onClick={onClose}
            className="modal-close"
            type="button"
          >
            ×
          </button>
        </div>
        
        <div className="modal-body">
          <p className="invite-description">
            Send an invitation to join your team. They'll receive an email with 
            instructions to create an account or join if they already have one.
          </p>
          
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={handleChange}
                className={`form-control ${error ? 'error' : ''}`}
                placeholder="colleague@example.com"
                autoFocus
              />
              {error && (
                <div className="field-error">{error}</div>
              )}
            </div>
            
            <div className="modal-actions">
              <button 
                type="button" 
                onClick={onClose}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InviteMemberModal;