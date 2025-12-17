import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from './store';
import { checkAuthStatus } from './store/slices/authSlice';

// Components
import Navbar from './components/Layout/Navbar';
import Home from './components/Home/Home';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import PracticeList from './components/Practices/PracticeList';
import PracticeDetail from './components/Practices/PracticeDetail';
import TeamList from './components/Teams/TeamList';
import TeamDetail from './components/Teams/TeamDetail';
import Dashboard from './components/Dashboard/Dashboard';
import ExpertDashboard from './components/Expert/ExpertDashboard';
import PracticeEditor from './components/Expert/PracticeEditor';
import PersonalityQuestionnaire from './components/Personality/PersonalityQuestionnaire';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import ToastContainer from './components/Toast/ToastContainer';

import './App.css';

function AppContent() {
  const dispatch = useDispatch();
  const { isAuthenticated, loading } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Navbar />
        <ToastContainer />
        <main className="main-content">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/practices" element={<PracticeList />} />
            <Route path="/practices/:id" element={<PracticeDetail />} />
            
            {/* Auth routes */}
            <Route 
              path="/login" 
              element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} 
            />
            <Route 
              path="/register" 
              element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} 
            />
            
            {/* Protected routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/teams" 
              element={
                <ProtectedRoute>
                  <TeamList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/teams/:id" 
              element={
                <ProtectedRoute>
                  <TeamDetail />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/personality" 
              element={
                <ProtectedRoute>
                  <PersonalityQuestionnaire />
                </ProtectedRoute>
              } 
            />
            
            {/* Expert routes */}
            <Route 
              path="/expert" 
              element={
                <ProtectedRoute>
                  <ExpertDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/expert/practices/:id/edit" 
              element={
                <ProtectedRoute>
                  <PracticeEditor />
                </ProtectedRoute>
              } 
            />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
