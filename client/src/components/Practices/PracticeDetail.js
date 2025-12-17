import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPracticeById, clearCurrentPractice } from '../../store/slices/practicesSlice';
import './Practices.css';

const PracticeDetail = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { currentPractice, loading, error } = useSelector((state) => state.practices);
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (id) {
      dispatch(fetchPracticeById(id));
    }
    
    return () => {
      dispatch(clearCurrentPractice());
    };
  }, [dispatch, id]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading practice details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="alert alert-error">
          {error}
        </div>
        <Link to="/practices" className="btn btn-primary">
          Back to Practices
        </Link>
      </div>
    );
  }

  if (!currentPractice) {
    return (
      <div className="error-container">
        <h2>Practice not found</h2>
        <p>The practice you're looking for doesn't exist or has been removed.</p>
        <Link to="/practices" className="btn btn-primary">
          Back to Practices
        </Link>
      </div>
    );
  }

  const practice = currentPractice;

  return (
    <div className="practice-detail-container">
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <Link to="/practices">Practices</Link>
        <span className="breadcrumb-separator">›</span>
        <span>{practice.name}</span>
      </nav>

      {/* Practice Header */}
      <div className="practice-header">
        <div className="practice-header-content">
          <h1 className="practice-title">{practice.name}</h1>
          {practice.type && (
            <span className="practice-type-badge">{practice.type}</span>
          )}
        </div>
        
        {isAuthenticated && (
          <div className="practice-actions">
            <button className="btn btn-primary">
              Add to Team
            </button>
          </div>
        )}
      </div>

      <div className="practice-content">
        {/* Basic Information */}
        <section className="practice-section">
          <h2>Description</h2>
          <div className="practice-description">
            {practice.description}
          </div>
        </section>

        {/* Context */}
        {practice.context && (
          <section className="practice-section">
            <h2>Context</h2>
            <div className="practice-context">
              {practice.context}
            </div>
          </section>
        )}

        {/* Objectives */}
        {practice.objectives && practice.objectives.length > 0 && (
          <section className="practice-section">
            <h2>Objectives</h2>
            <div className="objectives-grid">
              {practice.objectives.map((objective, index) => (
                <div key={index} className="objective-card">
                  <h4>{objective.name}</h4>
                  {objective.description && (
                    <p>{objective.description}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Activities */}
        {practice.activities && practice.activities.length > 0 && (
          <section className="practice-section">
            <h2>Activities</h2>
            <div className="activities-list">
              {practice.activities.map((activity, index) => (
                <div key={activity.id || index} className="activity-item">
                  <div className="activity-number">{index + 1}</div>
                  <div className="activity-content">
                    <h4>{activity.name}</h4>
                    <p>{activity.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Roles */}
        {practice.roles && practice.roles.length > 0 && (
          <section className="practice-section">
            <h2>Roles Involved</h2>
            <div className="roles-grid">
              {practice.roles.map((role, index) => (
                <div key={role.id || index} className="role-card">
                  <h4>{role.name}</h4>
                  {role.description && (
                    <p>{role.description}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Benefits */}
        {practice.benefits && practice.benefits.length > 0 && (
          <section className="practice-section">
            <h2>Benefits</h2>
            <div className="benefits-list">
              {practice.benefits.map((benefit, index) => (
                <div key={benefit.id || index} className="benefit-item">
                  <div className="benefit-icon">✓</div>
                  <div className="benefit-content">
                    <h4>{benefit.name}</h4>
                    <p>{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Pitfalls */}
        {practice.pitfalls && practice.pitfalls.length > 0 && (
          <section className="practice-section">
            <h2>Common Pitfalls</h2>
            <div className="pitfalls-list">
              {practice.pitfalls.map((pitfall, index) => (
                <div key={pitfall.id || index} className="pitfall-item">
                  <div className="pitfall-icon">⚠</div>
                  <div className="pitfall-content">
                    <h4>{pitfall.name}</h4>
                    <p>{pitfall.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Guidelines */}
        {practice.guidelines && practice.guidelines.length > 0 && (
          <section className="practice-section">
            <h2>Resources & Guidelines</h2>
            <div className="guidelines-list">
              {practice.guidelines.map((guideline, index) => (
                <div key={guideline.id || index} className="guideline-item">
                  <h4>{guideline.name}</h4>
                  <p>{guideline.description}</p>
                  {guideline.content && (
                    <a 
                      href={guideline.content} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="guideline-link"
                    >
                      View Resource →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related Practices */}
        {practice.relatedPractices && practice.relatedPractices.length > 0 && (
          <section className="practice-section">
            <h2>Related Practices</h2>
            <div className="related-practices">
              {practice.relatedPractices.map((relatedPractice, index) => (
                <Link 
                  key={relatedPractice.id || index}
                  to={`/practices/${relatedPractice.id}`}
                  className="related-practice-card"
                >
                  <h4>{relatedPractice.name}</h4>
                  <p>{relatedPractice.description}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Team Affinity (if authenticated) */}
        {isAuthenticated && practice.teamAffinity && (
          <section className="practice-section">
            <h2>Team Compatibility</h2>
            <div className="affinity-score">
              <div className="affinity-value">
                {Math.round(practice.teamAffinity * 100)}%
              </div>
              <div className="affinity-label">
                Team Affinity Score
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default PracticeDetail;