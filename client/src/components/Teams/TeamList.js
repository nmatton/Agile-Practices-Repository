import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserTeams, createTeam } from '../../store/slices/teamsSlice';
import CreateTeamModal from './CreateTeamModal';
import './Teams.css';

const TeamList = () => {
  const dispatch = useDispatch();
  const { teams, loading, error } = useSelector((state) => state.teams);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    dispatch(fetchUserTeams());
  }, [dispatch]);

  const handleCreateTeam = async (teamData) => {
    const result = await dispatch(createTeam(teamData));
    if (createTeam.fulfilled.match(result)) {
      setShowCreateModal(false);
    }
  };

  if (loading && teams.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading teams...</div>
      </div>
    );
  }

  return (
    <div className="teams-container">
      <div className="teams-header">
        <div className="teams-header-content">
          <h1>My Teams</h1>
          <p>Manage your agile teams and collaborate on practice selection</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          Create Team
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {teams.length === 0 && !loading ? (
        <div className="no-teams">
          <div className="no-teams-content">
            <h3>No teams yet</h3>
            <p>
              Create your first team to start collaborating on agile practice selection 
              and get personalized recommendations based on your team's personality profile.
            </p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary btn-lg"
            >
              Create Your First Team
            </button>
          </div>
        </div>
      ) : (
        <div className="teams-grid">
          {teams.map((team) => (
            <div key={team.id} className="team-card">
              <div className="team-card-header">
                <h3 className="team-name">
                  <Link to={`/teams/${team.id}`}>
                    {team.name}
                  </Link>
                </h3>
                <div className="team-member-count">
                  {team.memberCount || 0} member{(team.memberCount || 0) !== 1 ? 's' : ''}
                </div>
              </div>
              
              <div className="team-card-body">
                <p className="team-description">
                  {team.description || 'No description provided'}
                </p>
                
                {team.activePractices && team.activePractices.length > 0 && (
                  <div className="team-practices">
                    <strong>Active Practices:</strong>
                    <div className="practices-count">
                      {team.activePractices.length} practice{team.activePractices.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}
                
                {team.oarCoverage && (
                  <div className="team-coverage">
                    <strong>OAR Coverage:</strong>
                    <div className="coverage-bar">
                      <div 
                        className="coverage-fill"
                        style={{ width: `${team.oarCoverage}%` }}
                      ></div>
                    </div>
                    <span className="coverage-text">{team.oarCoverage}%</span>
                  </div>
                )}
              </div>
              
              <div className="team-card-footer">
                <Link 
                  to={`/teams/${team.id}`} 
                  className="btn btn-outline btn-sm"
                >
                  View Team
                </Link>
                <Link 
                  to={`/dashboard?team=${team.id}`} 
                  className="btn btn-primary btn-sm"
                >
                  Dashboard
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateTeamModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTeam}
          loading={loading}
        />
      )}
    </div>
  );
};

export default TeamList;