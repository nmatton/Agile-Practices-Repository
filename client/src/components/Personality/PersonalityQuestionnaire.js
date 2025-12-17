import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Personality.css';

const PersonalityQuestionnaire = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [profile, setProfile] = useState(null);

  // Big Five personality questionnaire items
  const questions = [
    {
      id: 1,
      text: "I prefer clearly defined tasks with specific goals and deadlines",
      dimension: "Conscientiousness",
      description: "This helps us understand your preference for structure and organization"
    },
    {
      id: 2,
      text: "I enjoy brainstorming and collaborating with groups",
      dimension: "Extraversion",
      description: "This helps us understand your preference for social interaction"
    },
    {
      id: 3,
      text: "I am comfortable with changes and adapt easily to new situations",
      dimension: "Emotional Stability",
      description: "This helps us understand your comfort with uncertainty"
    },
    {
      id: 4,
      text: "I like to explore new ideas and creative approaches",
      dimension: "Openness",
      description: "This helps us understand your preference for innovation"
    },
    {
      id: 5,
      text: "I prioritize team harmony and consensus in decision-making",
      dimension: "Agreeableness",
      description: "This helps us understand your collaborative style"
    }
  ];

  const scaleLabels = [
    { value: 1, label: "Strongly Disagree" },
    { value: 2, label: "Disagree" },
    { value: 3, label: "Neutral" },
    { value: 4, label: "Agree" },
    { value: 5, label: "Strongly Agree" }
  ];

  useEffect(() => {
    checkExistingProfile();
  }, []);

  const checkExistingProfile = async () => {
    try {
      const response = await axios.get('/api/affinity/profile');
      if (response.data.bfProfile && response.data.isComplete) {
        setProfile(response.data.bfProfile);
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Format answers for API
      const surveyAnswers = Object.entries(answers).map(([questionId, result]) => ({
        itemId: parseInt(questionId),
        result: parseInt(result)
      }));

      const response = await axios.post('/api/affinity/survey', {
        surveyAnswers
      });

      setProfile(response.data.bfProfile);
      
      // Show success and redirect after a moment
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error submitting survey:', error);
      setError(error.response?.data?.error || 'Failed to submit survey. Please try again.');
      setLoading(false);
    }
  };

  const isCurrentQuestionAnswered = answers[questions[currentStep].id] !== undefined;
  const allQuestionsAnswered = questions.every(q => answers[q.id] !== undefined);
  const progress = (Object.keys(answers).length / questions.length) * 100;

  if (profile) {
    return (
      <div className="personality-container">
        <div className="personality-complete">
          <div className="success-icon">✓</div>
          <h2>Profile Complete!</h2>
          <p>Your personality profile has been successfully created.</p>
          <p>Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentStep];

  return (
    <div className="personality-container">
      <div className="personality-header">
        <h1>Personality Profile</h1>
        <p>Help us understand your work preferences to provide personalized practice recommendations</p>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="questionnaire-card">
        {/* Progress bar */}
        <div className="progress-section">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="progress-text">
            Question {currentStep + 1} of {questions.length}
          </div>
        </div>

        {/* Question */}
        <div className="question-section">
          <div className="question-dimension">{currentQuestion.dimension}</div>
          <h3 className="question-text">{currentQuestion.text}</h3>
          <p className="question-description">{currentQuestion.description}</p>

          {/* Answer scale */}
          <div className="answer-scale">
            {scaleLabels.map((option) => (
              <label 
                key={option.value} 
                className={`scale-option ${answers[currentQuestion.id] === option.value ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value={option.value}
                  checked={answers[currentQuestion.id] === option.value}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, parseInt(e.target.value))}
                />
                <div className="scale-value">{option.value}</div>
                <div className="scale-label">{option.label}</div>
              </label>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="questionnaire-actions">
          <button
            className="btn btn-outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            Previous
          </button>

          <div className="question-indicators">
            {questions.map((q, index) => (
              <div
                key={q.id}
                className={`indicator ${index === currentStep ? 'active' : ''} ${answers[q.id] ? 'answered' : ''}`}
                onClick={() => setCurrentStep(index)}
              ></div>
            ))}
          </div>

          {currentStep < questions.length - 1 ? (
            <button
              className="btn btn-primary"
              onClick={handleNext}
              disabled={!isCurrentQuestionAnswered}
            >
              Next
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!allQuestionsAnswered || loading}
            >
              {loading ? 'Submitting...' : 'Complete Profile'}
            </button>
          )}
        </div>
      </div>

      {/* Summary of answers */}
      {Object.keys(answers).length > 0 && (
        <div className="answers-summary">
          <h3>Your Responses</h3>
          <div className="summary-grid">
            {questions.map((q) => (
              answers[q.id] && (
                <div key={q.id} className="summary-item">
                  <div className="summary-dimension">{q.dimension}</div>
                  <div className="summary-score">
                    {answers[q.id]}/5
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalityQuestionnaire;
