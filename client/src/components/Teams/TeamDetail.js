import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTeamDetails, inviteToTeam } from '../../store/slices/teamsSlice';
import InviteMemberModal from './InviteMemberModal';
import './Teams.css';

const TeamDetail = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { currentTeam, loading, error } = useSelector((state) => state.teams);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchTeamDetails(id));
    }
  }, [dispatch, id]);

  const handleInviteMember = async (email) => {
    const result = await dispatch(inviteToTeam({ teamId: id, email }));
    if (inviteToTeam.fulfilled.match(result)) {
      setShowInviteModal(false);
      // Refresh team details to get updated member list
      dispatch(fetchTeamDetails(id));
    }
  };

  if (loading && !currentTeam) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading team details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="alert alert-error">
          {error}
        </div>
        <Link to="/teams" className="btn btn-primary">
          Back to Teams
        </Link>
      </div>
    );
  }

  if (!currentTeam) {
    return (
      <div className="error-container">
        <h2>Team not found</h2>
        <p>The team you're looking for doesn't exist or you don't have access to it.</p>
        <Link to="/teams" className="btn btn-primary">
          Back to Teams
        </Link>
      </div>
    );
  }

  const team = currentTeam;

  return (
    <div className="team-detail-container">
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <Link to="/teams">Teams</Link>
        <span className="breadcrumb-separator">›</span>
        <span>{team.name}</span>
      </nav>

      {/* Team Header */}
      <div className="team-header">
        <div className="team-header-content">
          <h1 className="team-title">{team.name}</h1>
          {team.description && (
            <p className="team-description">{team.description}</p>
          )}
        </div>
        
        <div className="team-actions">
          <button 
            onClick={() => setShowInviteModal(true)}
            className="btn btn-primary"
          >
            Invite Member
          </button>
          <Link 
            to={`/dashboard?team=${team.id}`}
            className="btn btn-outline"
          >
            View Dashboard
          </Link>
        </div>
      </div>

      <div className="team-content">
        {/* Team Stats */}
        <div className="team-stats">
          <div className="stat-card">
            <div className="stat-value">{team.members?.length || 0}</div>
            <div className="stat-label">Team Members</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{team.activePractices?.length || 0}</div>
            <div className="stat-label">Active Practices</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{team.oarCoverage || 0}%</div>
            <div className="stat-label">OAR Coverage</div>
          </div>
          
          {team.averageAffinity && (
            <div className="stat-card">
              <div className="stat-value">{Math.round(team.averageAffinity * 100)}%</div>
              <div className="stat-label">Avg. Affinity</div>
            </div>
          )}
        </div>

        {/* Team Members */}
        <section className="team-section">
          <div className="section-header">
            <h2>Team Members</h2>
            <button 
              onClick={() => setShowInviteModal(true)}
              className="btn btn-outline btn-sm"
            >
              Invite Member
            </button>
          </div>
          
          {team.members && team.members.length > 0 ? (
            <div className="members-grid">
              {team.members.map((member) => (
                <div key={member.id} className="member-card">
                  <div className="member-avatar">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="member-info">
                    <h4 className="member-name">{member.name}</h4>
                    <p className="member-email">{member.email}</p>
                    {member.role && (
                      <span className="member-role">{member.role}</span>
                    )}
                  </div>
                  {member.personalityProfile && (
                    <div className="member-personality">
                      <div className="personality-indicator">
                        Profile Complete
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-members">
              <p>No members yet. Invite team members to get started.</p>
              <button 
                onClick={() => setShowInviteModal(true)}
                className="btn btn-primary"
              >
                Invite First Member
              </button>
            </div>
          )}
        </section>

        {/* Active Practices */}
        <section className="team-section">
          <div className="section-header">
            <h2>Active Practices</h2>
            <Link 
              to="/practices"
              className="btn btn-outline btn-sm"
            >
              Browse Practices
            </Link>
          </div>
          
          {team.activePractices && team.activePractices.length > 0 ? (
            <div className="practices-grid">
              {team.activePractices.map((practice) => (
                <div key={practice.id} className="practice-card">
                  <h4 className="practice-name">
                    <Link to={`/practices/${practice.id}`}>
                      {practice.name}
                    </Link>
                  </h4>
                  <p className="practice-description">
                    {practice.description}
                  </p>
                  {practice.teamAffinity && (
                    <div className="practice-affinity">
                      <span className="affinity-label">Team Affinity:</span>
                      <span className={`affinity-score ${
                        practice.teamAffinity > 0.7 ? 'high' : 
                        practice.teamAffinity > 0.4 ? 'medium' : 'low'
                      }`}>
                        {Math.round(practice.teamAffinity * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-practices">
              <p>No active practices yet. Browse and add practices to your team.</p>
              <Link to="/practices" className="btn btn-primary">
                Browse Practices
              </Link>
            </div>
          )}
        </section>

        {/* OAR Coverage */}
        {team.oarCoverage && team.oarBreakdown && (
          <section className="team-section">
            <h2>Objective Coverage</h2>
            <div className="oar-coverage">
              <div className="coverage-overview">
                <div className="coverage-circle">
                  <div className="coverage-percentage">
                    {team.oarCoverage}%
                  </div>
                  <div className="coverage-label">
                    Overall Coverage
                  </div>
                </div>
              </div>
              
              <div className="oar-breakdown">
                {team.oarBreakdown.map((oar) => (
                  <div key={oar.id} className="oar-item">
                    <div className="oar-name">{oar.name}</div>
                    <div className="oar-progress">
                      <div 
                        className="oar-progress-bar"
                        style={{ width: `${oar.coverage}%` }}
                      ></div>
                    </div>
                    <div className="oar-percentage">{oar.coverage}%</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {showInviteModal && (
        <InviteMemberModal
          onClose={() => setShowInviteModal(false)}
          onSubmit={handleInviteMember}
          loading={loading}
        />
      )}
    </div>
  );
};

export default TeamDetail;