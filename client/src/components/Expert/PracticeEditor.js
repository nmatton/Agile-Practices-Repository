import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchPracticeForEdit,
  updatePractice,
  clearCurrentPractice,
  createGuideline,
  updateGuideline,
  deleteGuideline,
  createBenefit,
  updateBenefit,
  deleteBenefit,
  createPitfall,
  updatePitfall,
  deletePitfall
} from '../../store/slices/expertSlice';
import './Expert.css';

const PracticeEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentPractice, editOptions, loading, error } = useSelector((state) => state.expert);
  const { user } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState('basic');
  const [practiceForm, setPracticeForm] = useState({
    name: '',
    objective: '',
    description: '',
    typeId: ''
  });
  const [editingItem, setEditingItem] = useState(null);
  const [showAddForm, setShowAddForm] = useState(null);

  useEffect(() => {
    if (id) {
      dispatch(fetchPracticeForEdit(id));
    }
    
    return () => {
      dispatch(clearCurrentPractice());
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (currentPractice) {
      setPracticeForm({
        name: currentPractice.name || '',
        objective: currentPractice.objective || '',
        description: currentPractice.description || '',
        typeId: currentPractice.typeId || ''
      });
    }
  }, [currentPractice]);

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

  if (loading && !currentPractice) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading practice editor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="alert alert-error">
          {error}
        </div>
        <Link to="/expert" className="btn btn-primary">
          Back to Expert Dashboard
        </Link>
      </div>
    );
  }

  if (!currentPractice) {
    return (
      <div className="error-container">
        <h2>Practice not found</h2>
        <p>The practice you're trying to edit doesn't exist or has been removed.</p>
        <Link to="/expert" className="btn btn-primary">
          Back to Expert Dashboard
        </Link>
      </div>
    );
  }

  const handlePracticeSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(updatePractice({ id, practiceData: practiceForm })).unwrap();
      // Show success message
    } catch (error) {
      console.error('Failed to update practice:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPracticeForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddItem = async (type, itemData) => {
    try {
      const versionId = currentPractice.versions?.[0]?.id;
      if (!versionId) {
        console.error('No practice version found');
        return;
      }

      switch (type) {
        case 'guideline':
          await dispatch(createGuideline({ 
            practiceId: id, 
            versionId, 
            guidelineData: itemData 
          })).unwrap();
          break;
        case 'benefit':
          await dispatch(createBenefit({ 
            practiceId: id, 
            versionId, 
            benefitData: itemData 
          })).unwrap();
          break;
        case 'pitfall':
          await dispatch(createPitfall({ 
            practiceId: id, 
            versionId, 
            pitfallData: itemData 
          })).unwrap();
          break;
      }
      setShowAddForm(null);
    } catch (error) {
      console.error(`Failed to create ${type}:`, error);
    }
  };

  const handleUpdateItem = async (type, itemId, itemData) => {
    try {
      switch (type) {
        case 'guideline':
          await dispatch(updateGuideline({ id: itemId, guidelineData: itemData })).unwrap();
          break;
        case 'benefit':
          await dispatch(updateBenefit({ id: itemId, benefitData: itemData })).unwrap();
          break;
        case 'pitfall':
          await dispatch(updatePitfall({ id: itemId, pitfallData: itemData })).unwrap();
          break;
      }
      setEditingItem(null);
    } catch (error) {
      console.error(`Failed to update ${type}:`, error);
    }
  };

  const handleDeleteItem = async (type, itemId) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) {
      return;
    }

    try {
      switch (type) {
        case 'guideline':
          await dispatch(deleteGuideline(itemId)).unwrap();
          break;
        case 'benefit':
          await dispatch(deleteBenefit(itemId)).unwrap();
          break;
        case 'pitfall':
          await dispatch(deletePitfall(itemId)).unwrap();
          break;
      }
    } catch (error) {
      console.error(`Failed to delete ${type}:`, error);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Information', icon: '📝' },
    { id: 'guidelines', label: 'Guidelines', icon: '📚' },
    { id: 'benefits', label: 'Benefits', icon: '✅' },
    { id: 'pitfalls', label: 'Pitfalls', icon: '⚠️' },
    { id: 'activities', label: 'Activities', icon: '🔄' },
    { id: 'metrics', label: 'Metrics', icon: '📊' }
  ];

  return (
    <div className="practice-editor-container">
      {/* Header */}
      <div className="editor-header">
        <div className="editor-header-content">
          <nav className="breadcrumb">
            <Link to="/expert">Expert Dashboard</Link>
            <span className="breadcrumb-separator">›</span>
            <span>Edit Practice</span>
          </nav>
          <h1>Edit Practice: {currentPractice.name}</h1>
        </div>
        
        <div className="editor-actions">
          <button 
            className="btn btn-outline"
            onClick={() => navigate('/expert')}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary"
            onClick={handlePracticeSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="editor-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="editor-content">
        {activeTab === 'basic' && (
          <BasicInformationTab
            practiceForm={practiceForm}
            editOptions={editOptions}
            onInputChange={handleInputChange}
            onSubmit={handlePracticeSubmit}
            loading={loading}
          />
        )}

        {activeTab === 'guidelines' && (
          <GuidelinesTab
            guidelines={currentPractice.guidelines || []}
            editOptions={editOptions}
            editingItem={editingItem}
            showAddForm={showAddForm}
            onAdd={(data) => handleAddItem('guideline', data)}
            onUpdate={(id, data) => handleUpdateItem('guideline', id, data)}
            onDelete={(id) => handleDeleteItem('guideline', id)}
            onEdit={setEditingItem}
            onShowAddForm={setShowAddForm}
            onCancel={() => {
              setEditingItem(null);
              setShowAddForm(null);
            }}
          />
        )}

        {activeTab === 'benefits' && (
          <BenefitsTab
            benefits={currentPractice.benefits || []}
            editingItem={editingItem}
            showAddForm={showAddForm}
            onAdd={(data) => handleAddItem('benefit', data)}
            onUpdate={(id, data) => handleUpdateItem('benefit', id, data)}
            onDelete={(id) => handleDeleteItem('benefit', id)}
            onEdit={setEditingItem}
            onShowAddForm={setShowAddForm}
            onCancel={() => {
              setEditingItem(null);
              setShowAddForm(null);
            }}
          />
        )}

        {activeTab === 'pitfalls' && (
          <PitfallsTab
            pitfalls={currentPractice.pitfalls || []}
            editingItem={editingItem}
            showAddForm={showAddForm}
            onAdd={(data) => handleAddItem('pitfall', data)}
            onUpdate={(id, data) => handleUpdateItem('pitfall', id, data)}
            onDelete={(id) => handleDeleteItem('pitfall', id)}
            onEdit={setEditingItem}
            onShowAddForm={setShowAddForm}
            onCancel={() => {
              setEditingItem(null);
              setShowAddForm(null);
            }}
          />
        )}

        {activeTab === 'activities' && (
          <div className="tab-content">
            <h3>Activities Management</h3>
            <p>Activity sequencing and management will be implemented here.</p>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="tab-content">
            <h3>Metrics Definition</h3>
            <p>Metric definition and practice association tools will be implemented here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Basic Information Tab Component
const BasicInformationTab = ({ practiceForm, editOptions, onInputChange, onSubmit, loading }) => (
  <div className="tab-content">
    <form onSubmit={onSubmit} className="practice-form">
      <div className="form-section">
        <h3>Practice Details</h3>
        
        <div className="form-group">
          <label htmlFor="name">Practice Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={practiceForm.name}
            onChange={onInputChange}
            className="form-control"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="objective">Objective</label>
          <input
            type="text"
            id="objective"
            name="objective"
            value={practiceForm.objective}
            onChange={onInputChange}
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            value={practiceForm.description}
            onChange={onInputChange}
            className="form-control"
            rows="4"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="typeId">Practice Type</label>
          <select
            id="typeId"
            name="typeId"
            value={practiceForm.typeId}
            onChange={onInputChange}
            className="form-control"
          >
            <option value="">Select a type</option>
            {editOptions?.practiceTypes?.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-actions">
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Basic Information'}
        </button>
      </div>
    </form>
  </div>
);

// Guidelines Tab Component
const GuidelinesTab = ({ 
  guidelines, 
  editOptions, 
  editingItem, 
  showAddForm, 
  onAdd, 
  onUpdate, 
  onDelete, 
  onEdit, 
  onShowAddForm, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: '',
    typeId: ''
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        name: editingItem.name || '',
        description: editingItem.description || '',
        content: editingItem.content || '',
        typeId: editingItem.typeId || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        content: '',
        typeId: ''
      });
    }
  }, [editingItem]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingItem) {
      onUpdate(editingItem.id, formData);
    } else {
      onAdd(formData);
    }
  };

  return (
    <div className="tab-content">
      <div className="section-header">
        <h3>Guidelines & Resources</h3>
        <button 
          className="btn btn-primary"
          onClick={() => onShowAddForm('guideline')}
          disabled={showAddForm || editingItem}
        >
          Add Guideline
        </button>
      </div>

      {(showAddForm === 'guideline' || editingItem) && (
        <div className="add-form">
          <h4>{editingItem ? 'Edit Guideline' : 'Add New Guideline'}</h4>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="form-control"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>URL/Content</label>
              <input
                type="url"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                className="form-control"
                placeholder="https://..."
              />
            </div>

            <div className="form-group">
              <label>Type</label>
              <select
                value={formData.typeId}
                onChange={(e) => setFormData(prev => ({ ...prev, typeId: e.target.value }))}
                className="form-control"
              >
                <option value="">Select type</option>
                {editOptions?.guidelineTypes?.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={onCancel}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingItem ? 'Update' : 'Add'} Guideline
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="items-list">
        {guidelines.map((guideline) => (
          <div key={guideline.id} className="item-card">
            <div className="item-content">
              <h4>{guideline.name}</h4>
              {guideline.description && <p>{guideline.description}</p>}
              {guideline.content && (
                <a 
                  href={guideline.content} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="item-link"
                >
                  View Resource →
                </a>
              )}
            </div>
            <div className="item-actions">
              <button 
                className="btn btn-sm btn-outline"
                onClick={() => onEdit(guideline)}
              >
                Edit
              </button>
              <button 
                className="btn btn-sm btn-danger"
                onClick={() => onDelete(guideline.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {guidelines.length === 0 && (
          <div className="empty-state">
            <p>No guidelines added yet. Click "Add Guideline" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Benefits Tab Component
const BenefitsTab = ({ 
  benefits, 
  editingItem, 
  showAddForm, 
  onAdd, 
  onUpdate, 
  onDelete, 
  onEdit, 
  onShowAddForm, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: ''
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        name: editingItem.name || '',
        description: editingItem.description || '',
        content: editingItem.content || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        content: ''
      });
    }
  }, [editingItem]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingItem) {
      onUpdate(editingItem.id, formData);
    } else {
      onAdd(formData);
    }
  };

  return (
    <div className="tab-content">
      <div className="section-header">
        <h3>Benefits</h3>
        <button 
          className="btn btn-primary"
          onClick={() => onShowAddForm('benefit')}
          disabled={showAddForm || editingItem}
        >
          Add Benefit
        </button>
      </div>

      {(showAddForm === 'benefit' || editingItem) && (
        <div className="add-form">
          <h4>{editingItem ? 'Edit Benefit' : 'Add New Benefit'}</h4>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="form-control"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Detailed Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                className="form-control"
                rows="4"
              />
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={onCancel}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingItem ? 'Update' : 'Add'} Benefit
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="items-list">
        {benefits.map((benefit) => (
          <div key={benefit.id} className="item-card benefit-card">
            <div className="item-content">
              <div className="item-icon">✅</div>
              <div>
                <h4>{benefit.name}</h4>
                {benefit.description && <p>{benefit.description}</p>}
                {benefit.content && (
                  <div className="item-content-detail">
                    {benefit.content}
                  </div>
                )}
              </div>
            </div>
            <div className="item-actions">
              <button 
                className="btn btn-sm btn-outline"
                onClick={() => onEdit(benefit)}
              >
                Edit
              </button>
              <button 
                className="btn btn-sm btn-danger"
                onClick={() => onDelete(benefit.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {benefits.length === 0 && (
          <div className="empty-state">
            <p>No benefits added yet. Click "Add Benefit" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Pitfalls Tab Component
const PitfallsTab = ({ 
  pitfalls, 
  editingItem, 
  showAddForm, 
  onAdd, 
  onUpdate, 
  onDelete, 
  onEdit, 
  onShowAddForm, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: ''
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        name: editingItem.name || '',
        description: editingItem.description || '',
        content: editingItem.content || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        content: ''
      });
    }
  }, [editingItem]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingItem) {
      onUpdate(editingItem.id, formData);
    } else {
      onAdd(formData);
    }
  };

  return (
    <div className="tab-content">
      <div className="section-header">
        <h3>Common Pitfalls</h3>
        <button 
          className="btn btn-primary"
          onClick={() => onShowAddForm('pitfall')}
          disabled={showAddForm || editingItem}
        >
          Add Pitfall
        </button>
      </div>

      {(showAddForm === 'pitfall' || editingItem) && (
        <div className="add-form">
          <h4>{editingItem ? 'Edit Pitfall' : 'Add New Pitfall'}</h4>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="form-control"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Detailed Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                className="form-control"
                rows="4"
              />
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={onCancel}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingItem ? 'Update' : 'Add'} Pitfall
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="items-list">
        {pitfalls.map((pitfall) => (
          <div key={pitfall.id} className="item-card pitfall-card">
            <div className="item-content">
              <div className="item-icon">⚠️</div>
              <div>
                <h4>{pitfall.name}</h4>
                {pitfall.description && <p>{pitfall.description}</p>}
                {pitfall.content && (
                  <div className="item-content-detail">
                    {pitfall.content}
                  </div>
                )}
              </div>
            </div>
            <div className="item-actions">
              <button 
                className="btn btn-sm btn-outline"
                onClick={() => onEdit(pitfall)}
              >
                Edit
              </button>
              <button 
                className="btn btn-sm btn-danger"
                onClick={() => onDelete(pitfall.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {pitfalls.length === 0 && (
          <div className="empty-state">
            <p>No pitfalls added yet. Click "Add Pitfall" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PracticeEditor;