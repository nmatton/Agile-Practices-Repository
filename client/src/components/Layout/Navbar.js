import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../../store/slices/authSlice';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          APR - Agile Practice Repository
        </Link>
        
        <div className="navbar-menu">
          <Link to="/practices" className="navbar-link">
            Browse Practices
          </Link>
          
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="navbar-link">
                Dashboard
              </Link>
              <Link to="/teams" className="navbar-link">
                Teams
              </Link>
              {user?.role === 'expert' && (
                <Link to="/expert" className="navbar-link">
                  Expert Panel
                </Link>
              )}
              <div className="navbar-user">
                <span className="user-name">Hello, {user?.name}</span>
                <button onClick={handleLogout} className="btn btn-outline btn-sm">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="navbar-auth">
              <Link to="/login" className="btn btn-outline btn-sm">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;