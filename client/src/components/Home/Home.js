import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import './Home.css';

const Home = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  return (
    <div className="home-container">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Agile Practice Repository
          </h1>
          <p className="hero-subtitle">
            Discover, evaluate, and adopt agile practices based on your team's personality 
            and context. Get personalized recommendations powered by Big Five personality profiling.
          </p>
          <div className="hero-actions">
            <Link to="/practices" className="btn btn-primary btn-lg">
              Browse Practices
            </Link>
            {!isAuthenticated && (
              <Link to="/register" className="btn btn-outline btn-lg">
                Get Started
              </Link>
            )}
            {isAuthenticated && (
              <Link to="/dashboard" className="btn btn-outline btn-lg">
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="features-container">
          <h2 className="section-title">Why Choose APR?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📚</div>
              <h3>Comprehensive Repository</h3>
              <p>
                Access a curated collection of agile practices with detailed 
                implementation guides, benefits, and potential pitfalls.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Personalized Recommendations</h3>
              <p>
                Get practice suggestions tailored to your team's personality 
                profile using scientifically-backed Big Five assessment.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Team Collaboration</h3>
              <p>
                Create teams, track practice adoption, and see how well 
                practices align with your team's collective personality.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Progress Tracking</h3>
              <p>
                Monitor your team's coverage of Agile Reference Objectives 
                and track the effectiveness of adopted practices.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🔍</div>
              <h3>Smart Search & Filtering</h3>
              <p>
                Find practices by keywords, objectives, or categories. 
                Filter by your specific goals and context.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">💡</div>
              <h3>Expert Insights</h3>
              <p>
                Learn from community experiences and expert knowledge 
                to make informed decisions about practice adoption.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Transform Your Agile Journey?</h2>
          <p>
            Join teams worldwide who are using APR to make data-driven 
            decisions about their agile practices.
          </p>
          {!isAuthenticated ? (
            <div className="cta-actions">
              <Link to="/register" className="btn btn-primary btn-lg">
                Create Free Account
              </Link>
              <Link to="/practices" className="btn btn-secondary btn-lg">
                Explore Practices
              </Link>
            </div>
          ) : (
            <div className="cta-actions">
              <Link to="/dashboard" className="btn btn-primary btn-lg">
                View Dashboard
              </Link>
              <Link to="/teams" className="btn btn-secondary btn-lg">
                Manage Teams
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;