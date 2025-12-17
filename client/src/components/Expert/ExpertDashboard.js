import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchExpertPractices, fetchExpertDashboard, setFilters } from '../../store/slices/expertSlice';
import './Expert.css';

const ExpertDashboard = () => {
  const dispatch = useDispatch();
  const { 
    practices, 
    dashboardData, 
    loading, 
    error, 
    pagination, 
    filters 
  } = useSelector((state) => state.expert);
  const { user } = useSelector((state) => state.auth);

  const [activeView, setActiveView] = useState('dashboard');

  useEffect(() => {
    dispatch(fetchExpertDashboard());
    dispatch(fetchExpertPractices({ status: filters.status }));
  }, [dispatch, filters.status]);

  // Check if user has expert permissions
  if (user?.role !== 'expert') {
    return (
      <div className="error-container">
        <h2>Access Denied</h2>
        <p>You need expert permissions to access this page.</p>
        <Link to="/practices" className="btn btn-primary">
          Back to Practices
        </Link>
      </div>
    );
  }

  const handleFilterChange = (newFilters) => {
    dispatch(setFilters(newFilters));
  };

  if (loading && !dashboardData) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading expert dashboard...</div>
      </div>
    );
  }

  return (
    <div className="expert-dashboard-container">
      {/* Header */}
      <div className="expert-header">
        <div className="expert-header-content">
          <h1>Expert Dashboard</h1>
          <p>Manage practices, content, and knowledge base components</p>
        </div>
        
        <div className="expert-actions">
          <Link to="/practices" className="btn btn-outline">
            View Public Repository
          </Link>
          <button className="btn btn-primary">
            Create New Practice
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="expert-tabs">
        <button
          className={`tab-button ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveView('dashboard')}
        >
          <span className="tab-icon">📊</span>
          Overview
        </button>
        <button
          className={`tab-button ${activeView === 'practices' ? 'active' : ''}`}
          onClick={() => setActiveView('practices')}
        >
          <span className="tab-icon">📝</span>
          Practices
        </button>
        <button
          className={`tab-button ${activeView === 'content' ? 'active' : ''}`}
          onClick={() => setActiveView('content')}
        >
          <span className="tab-icon">📚</span>
          Content Library
        </button>
      </div>

      {/* Tab Content */}
      <div className="expert-content">
        {activeView === 'dashboard' && (
          <DashboardOverview dashboardData={dashboardData} />
        )}

        {activeView === 'practices' && (
          <PracticesManagement
            practices={practices}
            pagination={pagination}
            filters={filters}
            onFilterChange={handleFilterChange}
            loading={loading}
          />
        )}

        {activeView === 'content' && (
          <ContentLibrary dashboardData={dashboardData} />
        )}
      </div>
    </div>
  );
};

// Dashboard Overview Component
const DashboardOverview = ({ dashboardData }) => {
  if (!dashboardData) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading dashboard data...</div>
      </div>
    );
  }

  const { practiceStats, contentStats, recentActivity } = dashboardData;

  return (
    <div className="dashboard-overview">
      {/* Practice Statistics */}
      <section className="stats-section">
        <h2>Practice Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📝</div>
            <div className="stat-info">
              <div className="stat-value">{practiceStats?.total || 0}</div>
              <div className="stat-label">Total Practices</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <div className="stat-value">{practiceStats?.published || 0}</div>
              <div className="stat-label">Published</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-info">
              <div className="stat-value">{practiceStats?.draft || 0}</div>
              <div className="stat-label">Drafts</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <div className="stat-value">
                {practiceStats?.total > 0 
                  ? Math.round((practiceStats.published / practiceStats.total) * 100)
                  : 0}%
              </div>
              <div className="stat-label">Published Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Statistics */}
      <section className="stats-section">
        <h2>Content Library</h2>
        <div className="content-stats-grid">
          <div className="content-stat-item">
            <span className="content-stat-icon">🔄</span>
            <span className="content-stat-label">Activities</span>
            <span className="content-stat-value">{contentStats?.activities || 0}</span>
          </div>
          
          <div className="content-stat-item">
            <span className="content-stat-icon">📚</span>
            <span className="content-stat-label">Guidelines</span>
            <span className="content-stat-value">{contentStats?.guidelines || 0}</span>
          </div>
          
          <div className="content-stat-item">
            <span className="content-stat-icon">✅</span>
            <span className="content-stat-label">Benefits</span>
            <span className="content-stat-value">{contentStats?.benefits || 0}</span>
          </div>
          
          <div className="content-stat-item">
            <span className="content-stat-icon">⚠️</span>
            <span className="content-stat-label">Pitfalls</span>
            <span className="content-stat-value">{contentStats?.pitfalls || 0}</span>
          </div>
          
          <div className="content-stat-item">
            <span className="content-stat-icon">💡</span>
            <span className="content-stat-label">Recommendations</span>
            <span className="content-stat-value">{contentStats?.recommendations || 0}</span>
          </div>
          
          <div className="content-stat-item">
            <span className="content-stat-icon">📊</span>
            <span className="content-stat-label">Metrics</span>
            <span className="content-stat-value">{contentStats?.metrics || 0}</span>
          </div>
          
          <div className="content-stat-item">
            <span className="content-stat-icon">👥</span>
            <span className="content-stat-label">Roles</span>
            <span className="content-stat-value">{contentStats?.roles || 0}</span>
          </div>
          
          <div className="content-stat-item">
            <span className="content-stat-icon">📄</span>
            <span className="content-stat-label">Work Products</span>
            <span className="content-stat-value">{contentStats?.workproducts || 0}</span>
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="activity-section">
        <h2>Recent Activity</h2>
        {recentActivity && recentActivity.length > 0 ? (
          <div className="activity-list">
            {recentActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon">📝</div>
                <div className="activity-content">
                  <div className="activity-title">{activity.title}</div>
                  <div className="activity-description">{activity.description}</div>
                  <div className="activity-time">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No recent activity to display.</p>
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className="quick-actions-section">
        <h2>Quick Actions</h2>
        <div className="quick-actions-grid">
          <Link to="/expert/practices/new" className="action-card">
            <div className="action-icon">➕</div>
            <div className="action-content">
              <h4>Create Practice</h4>
              <p>Add a new agile practice</p>
            </div>
          </Link>
          
          <Link to="/expert/activities" className="action-card">
            <div className="action-icon">🔄</div>
            <div className="action-content">
              <h4>Manage Activities</h4>
              <p>Create and organize activities</p>
            </div>
          </Link>
          
          <Link to="/expert/metrics" className="action-card">
            <div className="action-icon">📊</div>
            <div className="action-content">
              <h4>Define Metrics</h4>
              <p>Create measurement indicators</p>
            </div>
          </Link>
          
          <Link to="/expert/roles" className="action-card">
            <div className="action-icon">👥</div>
            <div className="action-content">
              <h4>Manage Roles</h4>
              <p>Define team roles and responsibilities</p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
};

// Practices Management Component
const PracticesManagement = ({ practices, pagination, filters, onFilterChange, loading }) => {
  return (
    <div className="practices-management">
      {/* Filters */}
      <div className="practices-filters">
        <div className="filter-group">
          <label>Status:</label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            className="form-control"
          >
            <option value="">All Practices</option>
            <option value="draft">Drafts Only</option>
            <option value="published">Published Only</option>
          </select>
        </div>
        
        <div className="filter-actions">
          <button 
            className="btn btn-outline"
            onClick={() => onFilterChange({ status: '' })}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Practices List */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner">Loading practices...</div>
        </div>
      ) : (
        <div className="practices-list">
          {practices.map((practice) => (
            <div key={practice.id} className="practice-card">
              <div className="practice-info">
                <h3 className="practice-name">{practice.name}</h3>
                <p className="practice-description">{practice.description}</p>
                
                <div className="practice-meta">
                  <span className={`status-badge ${practice.status.toLowerCase().replace(' ', '-')}`}>
                    {practice.status}
                  </span>
                  <span className="version-count">
                    {practice.versionCount} version{practice.versionCount !== 1 ? 's' : ''}
                  </span>
                  {practice.lastVersionUpdate && (
                    <span className="last-update">
                      Updated: {new Date(practice.lastVersionUpdate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="practice-actions">
                <Link 
                  to={`/expert/practices/${practice.id}/edit`}
                  className="btn btn-primary btn-sm"
                >
                  Edit
                </Link>
                <Link 
                  to={`/practices/${practice.id}`}
                  className="btn btn-outline btn-sm"
                >
                  View
                </Link>
              </div>
            </div>
          ))}

          {practices.length === 0 && (
            <div className="empty-state">
              <h3>No practices found</h3>
              <p>
                {filters.status 
                  ? `No ${filters.status} practices found. Try adjusting your filters.`
                  : 'No practices have been created yet. Create your first practice to get started.'
                }
              </p>
              <Link to="/expert/practices/new" className="btn btn-primary">
                Create New Practice
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Content Library Component
const ContentLibrary = ({ dashboardData }) => {
  const contentTypes = [
    { key: 'activities', label: 'Activities', icon: '🔄', description: 'Reusable work units' },
    { key: 'guidelines', label: 'Guidelines', icon: '📚', description: 'External resources and links' },
    { key: 'benefits', label: 'Benefits', icon: '✅', description: 'Expected positive outcomes' },
    { key: 'pitfalls', label: 'Pitfalls', icon: '⚠️', description: 'Common implementation problems' },
    { key: 'recommendations', label: 'Recommendations', icon: '💡', description: 'Context-specific advice' },
    { key: 'metrics', label: 'Metrics', icon: '📊', description: 'Measurement indicators' },
    { key: 'roles', label: 'Roles', icon: '👥', description: 'Team responsibilities' },
    { key: 'workproducts', label: 'Work Products', icon: '📄', description: 'Practice artifacts' }
  ];

  return (
    <div className="content-library">
      <div className="content-library-header">
        <h2>Content Library</h2>
        <p>Manage reusable components across all practices</p>
      </div>

      <div className="content-types-grid">
        {contentTypes.map((type) => (
          <Link 
            key={type.key}
            to={`/expert/${type.key}`}
            className="content-type-card"
          >
            <div className="content-type-icon">{type.icon}</div>
            <div className="content-type-info">
              <h4>{type.label}</h4>
              <p>{type.description}</p>
              <div className="content-type-count">
                {dashboardData?.contentStats?.[type.key] || 0} items
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ExpertDashboard;