import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboardData, fetchRecommendations } from '../../store/slices/dashboardSlice';
import { fetchUserTeams } from '../../store/slices/teamsSlice';
import './Dashboard.css';

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { teams } = useSelector((state) => state.teams);
  const { 
    activePractices, 
    oarCoverage, 
    recommendations, 
    affinityScores, 
    loading, 
    error 
  } = useSelector((state) => state.dashboard);

  const [selectedTeamId, setSelectedTeamId] = useState(null);

  useEffect(() => {
    dispatch(fetchUserTeams());
  }, [dispatch]);

  useEffect(() => {
    const teamParam = searchParams.get('team');
    if (teamParam && teams && teams.length > 0) {
      setSelectedTeamId(teamParam);
    } else if (teams && teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [searchParams, teams, selectedTeamId]);

  useEffect(() => {
    if (selectedTeamId) {
      dispatch(fetchDashboardData(selectedTeamId));
      dispatch(fetchRecommendations(selectedTeamId));
    }
  }, [dispatch, selectedTeamId]);

  const handleTeamChange = (teamId) => {
    setSelectedTeamId(teamId);
  };

  const selectedTeam = teams && Array.isArray(teams) ? teams.find(team => team.id === selectedTeamId) : null;

  if (loading && !activePractices.length) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <h1>Dashboard</h1>
          <p>Welcome back, {user?.name}! Here's your team's agile practice overview.</p>
        </div>
        
        {teams && teams.length > 1 && (
          <div className="team-selector">
            <label htmlFor="team-select" className="team-selector-label">
              Select Team:
            </label>
            <select
              id="team-select"
              value={selectedTeamId || ''}
              onChange={(e) => handleTeamChange(e.target.value)}
              className="form-control"
            >
              {teams && teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {!selectedTeam && (!teams || teams.length === 0) ? (
        <div className="no-teams-dashboard">
          <div className="no-teams-content">
            <h3>No teams yet</h3>
            <p>Create or join a team to start using the dashboard and get personalized practice recommendations.</p>
            <Link to="/teams" className="btn btn-primary btn-lg">
              Manage Teams
            </Link>
          </div>
        </div>
      ) : selectedTeam ? (
        <div className="dashboard-content">
          {/* Quick Stats */}
          <div className="dashboard-stats">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-info">
                <div className="stat-value">{selectedTeam.memberCount || 0}</div>
                <div className="stat-label">Team Members</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">⚡</div>
              <div className="stat-info">
                <div className="stat-value">{activePractices.length}</div>
                <div className="stat-label">Active Practices</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <div className="stat-info">
                <div className="stat-value">
                  {oarCoverage.length > 0 
                    ? Math.round(oarCoverage.reduce((acc, oar) => acc + oar.coverage, 0) / oarCoverage.length)
                    : 0}%
                </div>
                <div className="stat-label">OAR Coverage</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">💡</div>
              <div className="stat-info">
                <div className="stat-value">{recommendations.length}</div>
                <div className="stat-label">Recommendations</div>
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            {/* Active Practices */}
            <section className="dashboard-section">
              <div className="section-header">
                <h2>Active Practices</h2>
                <Link to="/practices" className="btn btn-outline btn-sm">
                  Browse More
                </Link>
              </div>
              
              {activePractices.length > 0 ? (
                <div className="practices-list">
                  {activePractices.slice(0, 5).map((practice) => (
                    <div key={practice.id} className="practice-item">
                      <div className="practice-info">
                        <h4 className="practice-name">
                          <Link to={`/practices/${practice.id}`}>
                            {practice.name}
                          </Link>
                        </h4>
                        <p className="practice-description">
                          {practice.description}
                        </p>
                      </div>
                      
                      {affinityScores[practice.id] && (
                        <div className="practice-affinity">
                          <div className={`affinity-indicator ${
                            affinityScores[practice.id] > 0.7 ? 'high' : 
                            affinityScores[practice.id] > 0.4 ? 'medium' : 'low'
                          }`}>
                            {Math.round(affinityScores[practice.id] * 100)}%
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {activePractices.length > 5 && (
                    <div className="show-more">
                      <Link to={`/teams/${selectedTeamId}`} className="btn btn-outline btn-sm">
                        View All {activePractices.length} Practices
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No active practices yet. Start by browsing and adding practices to your team.</p>
                  <Link to="/practices" className="btn btn-primary">
                    Browse Practices
                  </Link>
                </div>
              )}
            </section>

            {/* OAR Coverage */}
            <section className="dashboard-section">
              <div className="section-header">
                <h2>Objective Coverage</h2>
                <Link to={`/teams/${selectedTeamId}`} className="btn btn-outline btn-sm">
                  View Details
                </Link>
              </div>
              
              {oarCoverage.length > 0 ? (
                <div className="oar-list">
                  {oarCoverage.slice(0, 6).map((oar) => (
                    <div key={oar.id} className="oar-item">
                      <div className="oar-info">
                        <span className="oar-name">{oar.name}</span>
                        <span className="oar-percentage">{oar.coverage}%</span>
                      </div>
                      <div className="oar-progress">
                        <div 
                          className="oar-progress-bar"
                          style={{ width: `${oar.coverage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                  
                  {oarCoverage.length > 6 && (
                    <div className="show-more">
                      <Link to={`/teams/${selectedTeamId}`} className="btn btn-outline btn-sm">
                        View All Objectives
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No objective coverage data available. Add practices to see coverage.</p>
                </div>
              )}
            </section>

            {/* Recommendations */}
            <section className="dashboard-section recommendations-section">
              <div className="section-header">
                <h2>Recommendations</h2>
                <span className="recommendations-count">
                  {recommendations.length} suggestion{recommendations.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              {recommendations.length > 0 ? (
                <div className="recommendations-list">
                  {recommendations.slice(0, 3).map((recommendation) => (
                    <div key={recommendation.id} className="recommendation-item">
                      <div className="recommendation-header">
                        <h4 className="recommendation-title">
                          <Link to={`/practices/${recommendation.practiceId}`}>
                            {recommendation.practiceName}
                          </Link>
                        </h4>
                        <div className="recommendation-score">
                          {Math.round(recommendation.affinityScore * 100)}% match
                        </div>
                      </div>
                      
                      <p className="recommendation-reason">
                        {recommendation.reason}
                      </p>
                      
                      {recommendation.objectives && recommendation.objectives.length > 0 && (
                        <div className="recommendation-objectives">
                          <span className="objectives-label">Covers:</span>
                          {recommendation.objectives.slice(0, 2).map((objective, index) => (
                            <span key={index} className="objective-tag">
                              {objective}
                            </span>
                          ))}
                          {recommendation.objectives.length > 2 && (
                            <span className="objective-tag more">
                              +{recommendation.objectives.length - 2} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {recommendations.length > 3 && (
                    <div className="show-more">
                      <button className="btn btn-outline btn-sm">
                        View All {recommendations.length} Recommendations
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No recommendations available. Complete your team's personality profiles to get personalized suggestions.</p>
                  <Link to={`/teams/${selectedTeamId}`} className="btn btn-primary">
                    Manage Team
                  </Link>
                </div>
              )}
            </section>

            {/* Quick Actions */}
            <section className="dashboard-section quick-actions">
              <h2>Quick Actions</h2>
              <div className="actions-grid">
                <Link to="/practices" className="action-card">
                  <div className="action-icon">🔍</div>
                  <div className="action-content">
                    <h4>Browse Practices</h4>
                    <p>Discover new agile practices</p>
                  </div>
                </Link>
                
                <Link to={`/teams/${selectedTeamId}`} className="action-card">
                  <div className="action-icon">👥</div>
                  <div className="action-content">
                    <h4>Manage Team</h4>
                    <p>Invite members and view details</p>
                  </div>
                </Link>
                
                <Link to="/teams" className="action-card">
                  <div className="action-icon">➕</div>
                  <div className="action-content">
                    <h4>Create Team</h4>
                    <p>Start a new agile team</p>
                  </div>
                </Link>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="loading-container">
          <div className="loading-spinner">Loading team data...</div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;