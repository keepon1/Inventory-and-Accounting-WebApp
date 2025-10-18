import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, faAddressBook, faBars, faTimes, faUsers, 
  faChartLine, faDatabase, faSearchDollar
} from "@fortawesome/free-solid-svg-icons";
import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import './home.css';
import Footer from './Footer';

const features = [
  {
    icon: faSearchDollar,
    title: "Sales Tracking",
    description: "Comprehensive sales monitoring with real-time analytics and customizable reports."
  },
  {
    icon: faDatabase,
    title: "Inventory Management",
    description: "Efficient stock control with automated alerts and predictive inventory forecasting."
  },
  {
    icon: faChartLine,
    title: "Business Analytics",
    description: "Advanced data visualization tools to uncover trends and growth opportunities."
  }
];


const Home = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="app-container">
      <header className={`header ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <div className="logo-container">
            <img src="\logo.jpg" alt="SalesPro Logo" className="logo" />
            <span className="logo-text">Keepon</span>
          </div> 

          <button 
            className="menu-toggle" 
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <FontAwesomeIcon icon={menuOpen ? faTimes : faBars} />
          </button>

          <nav className={`nav-menu ${menuOpen ? 'open' : ''}`}>
            <Link to="/" className="nav-link active">
              <FontAwesomeIcon icon={faHome} /> Home
            </Link>
            <Link to="/features" className="nav-link">
              <FontAwesomeIcon icon={faChartLine} /> Features
            </Link>
            <Link to="/contact" className="nav-link">
              <FontAwesomeIcon icon={faAddressBook} /> Contact
            </Link>
            <Link to="/about" className="nav-link">
              <FontAwesomeIcon icon={faUsers} /> About
            </Link>
            <div className="auth-buttons">
              <Link to="/sign_in" className="btn btn-outline">Sign In</Link>
              <Link to="/register" className="btn btn-primary">Get Started</Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>Transform Your Sales Operations</h1>
            <p className="lead">
              Powerful analytics, intuitive interface, and enterprise-grade security 
              in one comprehensive sales platform.
            </p>
            <div className="cta-buttons">
              <Link to="/features" className="btn btn-outline btn-lg">
                Learn More
              </Link>
            </div>
          </div>
          <div className="hero-image">
            <img src="/preview.jpg" alt="Sales Dashboard Preview" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2 className="section-title">Key Features</h2>
          <p className="section-subtitle">
            Everything you need to streamline your sales process
          </p>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div className="feature-card" key={index}>
                <div className="feature-icon">
                  <FontAwesomeIcon icon={feature.icon} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="cta">
        <div className="container">
          <h2>Ready to revolutionize your sales process?</h2>
          <Link to="/register" className="btn btn-primary">Get Started</Link>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Home;