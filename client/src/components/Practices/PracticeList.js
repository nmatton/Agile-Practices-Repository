import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPractices, fetchGoals, setFilters, clearFilters } from '../../store/slices/practicesSlice';
import './Practices.css';

const PracticeList = () => {
  const dispatch = useDispatch();
  const { 
    practices, 
    goals, 
    loading, 
    error, 
    pagination, 
    filters 
  } = useSelector((state) => state.practices);

  const [localFilters, setLocalFilters] = useState({
    search: '',
    goal: '',
    tag: '',
  });

  useEffect(() => {
    dispatch(fetchGoals());
    dispatch(fetchPractices());
  }, [dispatch]);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setLocalFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    dispatch(setFilters(localFilters));
    dispatch(fetchPractices({ ...localFilters, page: 1 }));
  };

  const handleClearFilters = () => {
    setLocalFilters({
      search: '',
      goal: '',
      tag: '',
    });
    dispatch(clearFilters());
    dispatch(fetchPractices({ page: 1 }));
  };

  const handlePageChange = (newPage) => {
    dispatch(fetchPractices({ ...filters, page: newPage }));
  };

  if (loading && (!practices || practices.length === 0)) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading practices...</div>
      </div>
    );
  }

  return (
    <div className="practices-container">
      <div className="practices-header">
        <h1>Browse Agile Practices</h1>
        <p>Discover and explore agile practices to improve your team's effectiveness</p>
      </div>

      {/* Search and Filters */}
      <div className="practices-filters">
        <form onSubmit={handleSearch} className="filter-form">
          <div className="filter-row">
            <div className="filter-group">
              <input
                type="text"
                name="search"
                value={localFilters.search}
                onChange={handleFilterChange}
                placeholder="Search practices by name or description..."
                className="form-control search-input"
              />
            </div>
            
            <div className="filter-group">
              <select
                name="goal"
                value={localFilters.goal}
                onChange={handleFilterChange}
                className="form-control"
              >
                <option value="">All Objectives</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="filter-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </button>
              <button 
                type="button" 
                onClick={handleClearFilters}
                className="btn btn-secondary"
              >
                Clear
              </button>
            </div>
          </div>
        </form>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* Results Summary */}
      {practices && practices.length > 0 && (
        <div className="results-summary">
          <p>
            Showing {practices.length} of {pagination?.totalItems || 0} practices
            {filters?.search && ` for "${filters.search}"`}
          </p>
        </div>
      )}

      {/* Practice Grid */}
      {(!practices || practices.length === 0) && !loading ? (
        <div className="no-results">
          <h3>No practices found</h3>
          <p>Try adjusting your search criteria or browse all practices.</p>
          <button onClick={handleClearFilters} className="btn btn-primary">
            Show All Practices
          </button>
        </div>
      ) : practices && practices.length > 0 ? (
        <div className="practices-grid">
          {practices.map((practice) => (
            <div key={practice.id} className="practice-card">
              <div className="practice-card-header">
                <h3 className="practice-title">
                  <Link to={`/practices/${practice.id}`}>
                    {practice.name}
                  </Link>
                </h3>
                {practice.type && (
                  <span className="practice-type">{practice.type}</span>
                )}
              </div>
              
              <div className="practice-card-body">
                <p className="practice-description">
                  {practice.description}
                </p>
                
                {practice.objectives && practice.objectives.length > 0 && (
                  <div className="practice-objectives">
                    <strong>Objectives:</strong>
                    <div className="objectives-list">
                      {practice.objectives.slice(0, 3).map((objective, index) => (
                        <span key={index} className="objective-tag">
                          {objective}
                        </span>
                      ))}
                      {practice.objectives.length > 3 && (
                        <span className="objective-tag more">
                          +{practice.objectives.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="practice-card-footer">
                <Link 
                  to={`/practices/${practice.id}`} 
                  className="btn btn-outline btn-sm"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1 || loading}
            className="btn btn-secondary btn-sm"
          >
            Previous
          </button>
          
          <span className="pagination-info">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages || loading}
            className="btn btn-secondary btn-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default PracticeList;