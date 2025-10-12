import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, faUsers, faBars, faTimes,
  faUserPlus, faSignInAlt, faKey, faBuilding
} from "@fortawesome/free-solid-svg-icons";
import { useState } from 'react';
import api from './api';
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from '@react-oauth/google';
import './register.css';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function Register() {
  const [formData, setFormData] = useState({
    company: '', 
    email: '', 
    name: '', 
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const validateForm = () => {

    const newErrors = {}
    
    if (!formData.company.trim()) {
      toast.info('Company name is required');
      return false;
    }

    if (!formData.name.trim()) {
      toast.info('User name is required');
      return false;
    }
    
    if (!formData.email.trim()) {
      toast.info('Email is required');
      return false;
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      toast.info('Please enter a valid email');
      return false;
    }
    
    if (!formData.password) {
      toast.info('Password is required');
      return false;
    } else if (formData.password.length < 6) {
      toast.info('Password must be at least 6 characters');
      return false;
    }

    return Object.keys(newErrors).length === 0;

  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await api.post('register', formData);
      
      if(response.status === 'success') {
        toast.success(response.message || 'Your profile was created successfully');
        localStorage.setItem('access', response.data.access);
        localStorage.setItem("user", response.data.user);
        localStorage.setItem("business", response.data.business);
        localStorage.setItem('accesses', JSON.stringify(response.data.accesses));
        navigate("/selectBusiness");
      } else{
        toast.error(response.message || 'something went. try again');
        return;
      }
    } catch(error) {
      toast.error('An error occurred while creating your profile')
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <ToastContainer position="top-right" autoClose={3000}/>
      <header className="header">
        <div className="container">
          <div className="logo-container">
            <img src="logo.jpg" alt="Company Logo" className="logo" />
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
            <Link to="/" className="nav-link">
              <FontAwesomeIcon icon={faHome} /> Home
            </Link>
            <Link to="/features" className="nav-link">
              <FontAwesomeIcon icon={faUsers} /> Features
            </Link>
            <div className="auth-buttons">
              <Link to="/sign_in" className="btn btn-outline">
                <FontAwesomeIcon icon={faSignInAlt} /> Sign In
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="auth-main">
        <div className="container">
          <div className="auth-card">
            <div className="auth-welcome">
              <h2>Create Your Account</h2>
              <p>Join thousands of businesses managing their sales efficiently with Keepon Inventory.</p>
              <div className="auth-features">
                <div className="feature">
                  <FontAwesomeIcon icon={faBuilding} />
                  <span>Company Management</span>
                </div>
                <div className="feature">
                  <FontAwesomeIcon icon={faKey} />
                  <span>Secure Authentication</span>
                </div>
                <div className="feature">
                  <FontAwesomeIcon icon={faUserPlus} />
                  <span>Multi-user Support</span>
                </div>
              </div>
              <div className="auth-image" />
            </div>
            
            <div className="auth-form-container">
              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="auth-title">
                  <FontAwesomeIcon icon={faUserPlus} />
                  <span>Create Business Account</span>
                </div>

                {errors.general && (
                  <div className="auth-error">{errors.general}</div>
                )}

                <div className="form-group">
                  <label>Business Name</label>
                  {errors.company && (
                    <span className="field-error">{errors.company}</span>
                  )}
                  <input 
                    type="text" 
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                  />
                  
                </div>

                <div className="form-group">
                  <label>Email</label>
                  {errors.email && (
                    <span className="field-error">{errors.email}</span>
                  )}
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                  
                </div>

                <div className="form-group">
                  <label>User Name</label>
                  {errors.password && (
                    <span className="field-error">{errors.password}</span>
                  )}
                  <input 
                    type="text" 
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                  />
                  
                </div>

                <div className="form-group">
                  <label>Password</label>
                  {errors.password && (
                    <span className="field-error">{errors.password}</span>
                  )}
                  <input 
                    type="password" 
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  
                </div>

                <div className="form-options">
                  <label className="terms-agreement">
                    <input type="checkbox" required />
                    I agree to the Terms of Service
                  </label>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary auth-submit"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Register Now'}
                </button>

                <div className="auth-divider">
                  <span>OR</span>
                </div>

                <div className="social-auth">
                  <GoogleLogin
                    onSuccess={async (credentialResponse) => {
                      const token = credentialResponse.credential;

                      try {
                        if (localStorage.getItem('access')){
                          localStorage.removeItem('access');
                        }
                        const res = await api.post("sign_in_google", { token });

                        if (res.status === 'error'){
                          toast.error(res.message || 'Your profile could not proccessed')
                          return;
                        }

                        toast.success(res.status);

                        const data = res.data;

                        localStorage.setItem("access", data.access);
                        localStorage.setItem("business", data.business);
                        localStorage.setItem("user", data.user);
                        localStorage.setItem('accesses', JSON.stringify(data.accesses));
                        navigate("/selectBusiness");
                      } catch (err) {
                        console.error("Google login error", err);
                        setErrors({ general: "Google login failed" });
                      }
                    }}
                    onError={() => setErrors({ general: "Google sign-in failed" })}
                    useOneTap={false}
                    prompt='select_account'
                  />
                </div>

                <p className="auth-switch">
                  Already have an account? {' '}
                  <Link to="/sign_in">Sign In here</Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>

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
    </div>
  );
}

export default Register;