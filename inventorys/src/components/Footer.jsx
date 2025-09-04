import React from 'react';
import { Link } from 'react-router-dom';
import './register.css';

const Footer = () => {
  return (
    <footer className="auth-footer">
        <div className="container footer-content">
            <span className="footer-copyright">
                © {new Date().getFullYear()} Keepon. All rights reserved.
            </span>
            <div className="footer-links">
                <Link to="/privacy">Privacy Policy</Link>
                <Link to="/terms">Terms of Service</Link>
            </div>
        </div>
    </footer>
  );
};

export default Footer;