import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, faUser, faUsers, faBars, faTimes,
  faChevronRight, faSignInAlt, faKey
} from "@fortawesome/free-solid-svg-icons";
import { useRef, useState } from 'react';
import api from './api';
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from '@react-oauth/google';
import './sign_in.css';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function SignIn() {
  const [formData, setFormData] = useState({ company: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userInfo, setUserInfo] = useState({newPassword:''});
  const [showUserSelect1, setShowUserSelect1] = useState(false);
  const [passError, setpassError] = useState('');
  const userSelectRef = useRef(null);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (localStorage.getItem('access')){
        localStorage.removeItem('access');
      }
      
      const response = await api.post('sign', formData);
      
      if (response.status === 'error') {
        toast.error(response.message || 'Could not sign in. try again' );
        return;
      }

      if (response.status === 'set'){
        setShowUserSelect1(true);
        return;
      }

      toast.success(response.message);

      localStorage.setItem("business", response.data.business);
      localStorage.setItem("user", response.data.user);
      localStorage.setItem('accesses', JSON.stringify(response.data.accesses));
      navigate("/selectBusiness");
    
    } catch(error) {
      toast.error('An error occurred. Please try again.');
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
              <Link to="/register" className="btn btn-outline">
                <FontAwesomeIcon icon={faUser} /> Register
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="auth-main">
        <div className="container">
          <div className="auth-card">
            <div className="auth-welcome">
              <h2>🔐 Welcome Back to Keepon</h2>
              <p>
                Sign in to access your personalized dashboard where you can manage inventory, 
                record sales, track product movements, and view insightful reports. 
                Whether you're overseeing a small shop or running a large warehouse, 
                Keepon gives you full control and clarity over your operations.
              </p>
              <div className="auth-image" />
            </div>

            <div className="auth-form-container">
              <form onSubmit={handleSubmit} className="auth-form">
                <h1 className="auth-title">
                  <FontAwesomeIcon icon={faSignInAlt} /> Sign In
                </h1>

                {errors.general && (
                  <div className="auth-error">{errors.general}</div>
                )}

                <div className="form-group">
                  <label htmlFor="company">
                    <FontAwesomeIcon icon={faUser} /> Company Name
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">User Name</label>
                  <input
                    type="text"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">
                    <FontAwesomeIcon icon={faKey} /> Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  {errors.password && (
                    <span className="field-error">{errors.password}</span>
                  )}
                </div>

                <div className="form-options">
                  <Link to="/forgot-password" className="forgot-password">
                    Forgot password?
                  </Link>
                </div>

                <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In'}
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>

                <div className="auth-divider">
                  <span>OR</span>
                </div>

                <div className="social-auth">
                  <GoogleLogin
                    onSuccess={async (credentialResponse) => {
                      const token = credentialResponse.credential;

                      try {
                        const res = await api.post("sign_in_google", { token });

                        if (res.status === 'error'){
                          toast.error(res.message || 'Your profile could not proccessed')
                          return;
                        }

                        toast.success(res.status);

                        const data = res.data;

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
                  />
                </div>


                <div className="auth-switch">
                  Don't have an account? <Link to="/register">Register here</Link>
                </div>
              </form>
            </div>
          </div>
        </div>

        {showUserSelect1 && (
          <div className="modal-overlay">
            <div className="modal" ref={userSelectRef}>
              <div className="modal-header">
                <h3>{formData.email} <span>Set New Password</span></h3>
              </div>
              
              <form onSubmit={async(e) => {
                e.preventDefault();
                try{

                  if (!userInfo.newPassword){
                    toast.info('password can not be empty');
                    return;
                  }

                  if (userInfo.newPassword.length < 6){
                    toast.info('password can not be less than six');
                    return;
                  }

                  const response = await api.post(
                    'set_password',
                    {password: userInfo.newPassword, name:formData.email, business: formData.company}
                  );

                  if(response.status === 'success'){
                    const data = response.data;

                    localStorage.setItem("business", data.business);
                    localStorage.setItem("user", data.user);
                    localStorage.setItem('accesses', JSON.stringify(data.accesses));
                    navigate("/selectBusiness");
                  } else{
                    toast.error(response.message || 'Wrong Password!');
                  }
                }
                catch(error){
                  toast.error('An error occurred while setting password')
                  console.log(error)
                }
                
              }}>
                <div className="form-group">   
                  <label>
                    <FontAwesomeIcon icon={faKey} /> Set Password
                  </label>
                  
                  {passError && <div className="error-message">{passError}</div>}
                  <input
                    type="password"
                    value={userInfo.newPassword}
                    onChange={(e) => {setUserInfo({...userInfo, newPassword: e.target.value}); setpassError('');}}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary">
                  Save
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      <footer className="auth-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-copyright">© {new Date().getFullYear()} Keepon. All rights reserved.</div>
            <div className="footer-links">
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default SignIn;