import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding } from '@fortawesome/free-solid-svg-icons';
import api from './api';
import './home.css';

const Header = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await api.post('sign_out1');
      localStorage.removeItem('access');
      navigate('/sign_in');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <header className={`header`}>
      <div className="container">
        <div className="logo-container">
          <img src="/logo.jpg" alt="Company Logo" className="logo" />
          <span className="logo-text">Keepon Inventory</span>
        </div>

        <nav className="nav-menu">
          <Link to="/dashboard" className="nav-link">
            <FontAwesomeIcon icon={faBuilding} /> Dashboard
          </Link>
          <div className="auth-buttons">
            <button className="btn btn-outline" onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;