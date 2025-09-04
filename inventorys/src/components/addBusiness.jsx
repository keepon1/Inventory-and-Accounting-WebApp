import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from "react-router-dom";
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimesCircle, faBuilding, faMapMarkerAlt, 
  faFileAlt, faUser, faCheckCircle,
  faTimes,
  faBars,
  faKey,
  faUserCircle
} from "@fortawesome/free-solid-svg-icons";
import api from './api';
import './addBusiness.css';
import Footer from './Footer';
import enableKeyboardScrollFix from '../utils/scroll';

const AddBusiness = () => {
  const [companyInfo, setCompanyInfo] = useState({ company: '', email: '' });
  const [businesses, setBusinesses] = useState([]);
  const [businessInfo, setBusinessInfo] = useState({})
  const [businessOptions, setBusinessOptions] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [nameError, setNameError] = useState('');
  const [passError, setpassError] = useState('');
  const [userInfo, setUserInfo] = useState({business:''})
  
  const [addForm, setAddForm] = useState({
    business: '', 
    location: '', 
    description: '', 
    name: '',
    terms: false,
    password: ''
  });
  
  const [deleteForm, setDeleteForm] = useState({
    business: '', 
    permit: '', 
    name: '', 
    terms: false
  });
  

  const [activeTab, setActiveTab] = useState('list');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [showUserSelect, setShowUserSelect] = useState(false);
  const [showUserSelect1, setShowUserSelect1] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = useNavigate();
  const addFormRef = useRef(null);
  const deleteFormRef = useRef(null);
  const userSelectRef = useRef(null);
  const business = localStorage.getItem('business');
  const user = localStorage.getItem('user');

  const permitOptions = [
    { value: 'Yes', label: 'Yes' },
    { value: 'No', label: 'No' },
  ];

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const response = await api.post('select_bussiness', {business, user});

        const businessInfo = response.business[0];
        setBusinessInfo(businessInfo);
        
        if (typeof businessInfo == 'object'){
          if (businessInfo.new && businessInfo.google){ 
            setShowUserSelect1(true);
          }else{
            navigate('/dashboard');
          }
        }
        
        const options = response.business.map(item => ({
          value: item.b_name,
          label: item.b_name
        }));

        setCompanyInfo(response.company_info);
        setBusinesses(response.business);
        setBusinessOptions(options);
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem('access');
          navigate('/sign_in');
        }
      }
    };

    fetchBusinesses();
    const cleanup = enableKeyboardScrollFix();
    return cleanup;

  }, []);

  const handleAddBusiness = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post(
        'add_business', 
        addForm,
      );

      if (response === 'Business Name Exist') {
        setNameError('Bussiness name already exists!');
      } else if (response === 'successful') {
        
        const response = await api.get('select_bussiness');

        const options = response.business.map(item => ({
          value: item.b_name,
          label: item.b_name
        }));

        setCompanyInfo(response.company_info);
        setBusinesses(response.business);
        setBusinessOptions(options);
        setActiveTab('list');
      }
    } catch (error) {
      console.error('Error adding business:', error);
    }
  };

  const handleDeleteBusiness = async (e) => {
    e.preventDefault();
    try {
      await api.post(
        'delete_business', 
        deleteForm,
      );
    } catch (error) {
      console.error('Error deleting business:', error);
    }
  };

  const SignOut = async () => {
    try {
      await api.post(
        'sign_out1',
        companyInfo,
      );
      localStorage.removeItem('access');
      navigate('/sign_in')
    } catch (error) {
      console.error('Error deleting business:', error);
    }
  };

  const handleBusinessSelect = async (businessName) => {
    try {
      const response = await api.post(
        'get_user',
        { business: businessName }
      );

        const options = response.map(item => ({
          value: item.user,
          label: item.user
        }));
        setUserOptions(options);
        setSelectedBusiness(businessName);
        setShowUserSelect(true);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleClickOutside = (ref, closeHandler) => (event) => {
    if (ref.current && !ref.current.contains(event.target)) {
      closeHandler();
    }
  };

  useEffect(() => {
    if (showAddForm) {
      const handler = handleClickOutside(addFormRef, () => setShowAddForm(false));
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [showAddForm]);

  useEffect(() => {
    if (showDeleteForm) {
      const handler = handleClickOutside(deleteFormRef, () => setShowDeleteForm(false));
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [showDeleteForm]);

  useEffect(() => {
    if (showUserSelect) {
      const handler = handleClickOutside(userSelectRef, () => setShowUserSelect(false));
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [showUserSelect]);

  const checkPassword = async(user) => {
    try{
      const response = await api.post('check_password', {user, business:selectedBusiness});
      if (response === 'exist'){
        setUserInfo({...userInfo, user: user, exist:true});
        return;
      }
      if (response === 'new'){
        setUserInfo({...userInfo, user: user, exist:false});
        return;
      }
      
    }catch{}
  }

  return (
    <div className="app-container">
      <header className={`header ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <div className="logo-container">
            <img src="/logo.jpg" alt="Keepon Logo" className="logo" />
            <span className="logo-text">Keepon</span>
          </div>

          <button 
            className="menu-toggle" 
            onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <FontAwesomeIcon icon={menuOpen ? faTimes : faBars} />
          </button>

          <nav className={`nav-menu ${menuOpen ? 'open' : ''}`}>
            <Link to="/dashboard" className="btn btn-outline btn-sm">
              <FontAwesomeIcon icon={faBuilding} /> Dashboard
            </Link>
            <div className="auth-buttons">
              <button className="btns btn-outline" onClick={SignOut}>Sign Out</button>
            </div>
          </nav>
        </div>
      </header>

      <main className="business-container">
        <section className="business-hero">
          <div className="container">
            <h1>Manage Your Businesses</h1>
          </div>
        </section>

        <section className="business-management">
          <div className="container">
            <div className="business-tabs">
              <button 
                className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
                onClick={() => setActiveTab('list')}
              >
                My Businesses
              </button>
              <button 
                className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`}
                onClick={() => setActiveTab('add')}
              >
                Add New
              </button>
            </div>

            {activeTab === 'list' ? (
              <div className="business-list">
                <div className="business-actions">
                  <button 
                    className="btn btn-outline"
                    onClick={() => setShowDeleteForm(true)}
                  >
                    Remove Business
                  </button>
                </div>

                <div className="business-table-container">
                  <table className="business-table">
                    <thead>
                      <tr>
                        <th>Business Name</th>
                        <th>Location</th>
                        <th className='action-width'>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {businesses.map((business, index) => (
                        <tr key={index}>
                          <td>{business.b_name}</td>
                          <td>{business.location}</td>
                          <td>
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => handleBusinessSelect(business.b_name)}
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="add-business-form">
                <form onSubmit={handleAddBusiness}>
                  <div className="form-group">
                    <label>
                      <FontAwesomeIcon icon={faBuilding} /> Business Name
                    </label>
                    {nameError && <div className="error-message">{nameError}</div>}
                    <input
                      type="text"
                      value={addForm.business}
                      onChange={(e) => [setAddForm({...addForm, business: e.target.value}), setNameError('')]}
                      required
                    />
                    
                  </div>

                  <div className="form-group">
                    <label>
                      <FontAwesomeIcon icon={faMapMarkerAlt} /> Location
                    </label>
                    <input
                      type="text"
                      value={addForm.location}
                      onChange={(e) => setAddForm({...addForm, location: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      <FontAwesomeIcon icon={faFileAlt} /> Description
                    </label>
                    <input
                      type='text'
                      value={addForm.description}
                      onChange={(e) => setAddForm({...addForm, description: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      <FontAwesomeIcon icon={faUser} /> Administrator Name
                    </label>
                    <input
                      type="text"
                      value={addForm.name}
                      onChange={(e) => setAddForm({...addForm, name: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      <FontAwesomeIcon icon={faKey} /> Pin or Password
                    </label>
                    <input
                      type="password"
                      value={addForm.password}
                      onChange={(e) => setAddForm({...addForm, password: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-options">
                    <label htmlFor="terms-agreement">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={addForm.terms}
                      onChange={(e) => setAddForm({...addForm, terms: e.target.checked})}
                      required
                    />
                      I accept the terms and conditions
                    </label>
                  </div>

                  <button type="submit" className="btn btn-primary">
                    <FontAwesomeIcon icon={faCheckCircle} /> Create Business
                  </button>
                </form>
              </div>
            )}
          </div>
        </section>

        {showAddForm && (
          <div className="modal-overlay">
            <div className="modal" ref={addFormRef}>
              <div className="modal-header">
                <h3>Add New Business</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowAddForm(false)}
                >
                  <FontAwesomeIcon icon={faTimesCircle} />
                </button>
              </div>
              
              <form onSubmit={handleAddBusiness}>
                
                <button type="submit" className="btn btn-primary">
                  Create Business
                </button>
              </form>
            </div>
          </div>
        )}


        {showDeleteForm && (
          <div className="modal-overlay">
            <div className="modal" ref={deleteFormRef}>
              <div className="modal-header">
                <h3>Remove Business</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowDeleteForm(false)}
                >
                  <FontAwesomeIcon icon={faTimesCircle} />
                </button>
              </div>
              
              <form onSubmit={handleDeleteBusiness}>
                <div className="form-group">
                <div className="month-selectors">
                  <label>Select Business</label>
                  <Select 
                    options={businessOptions}
                    onChange={(selected) => setDeleteForm({
                      ...deleteForm,
                      business: selected.value
                    })}
                    className="month-select"
                    classNamePrefix="select"
                  />
                </div>
                </div>

                <div className="form-group">
                  <label>Remove Permanently?</label>
                  <Select 
                    options={permitOptions}
                    onChange={(selected) => setDeleteForm({
                      ...deleteForm,
                      permit: selected.value,
                    })}
                    className="month-select"
                    classNamePrefix="select"
                  />
                </div>

                <div className="form-group">
                  <label>Your Name (Confirmation)</label>
                  <input
                    type="text"
                    value={deleteForm.name}
                    onChange={(e) => setDeleteForm({
                      ...deleteForm,
                      name: e.target.value
                    })}
                    required
                  />
                </div>

                <div className="form-options">
                  
                  <label htmlFor="terms-agreement">
                  <input
                    type="checkbox"
                    id="delete-terms"
                    checked={deleteForm.terms}
                    onChange={(e) => setDeleteForm({
                      ...deleteForm,
                      terms: e.target.checked
                    })}
                    required
                  />
                    I confirm I want to remove this business
                  </label>
                </div>

                <button type="submit" className="btn btn-primary">
                  Remove Business
                </button>
              </form>
            </div>
          </div>
        )}

        {showUserSelect1 && (
          <div className="modal-overlay">
            <div className="modal" ref={userSelectRef}>
              <div className="modal-header">
                <h3>Setup Business</h3>
              </div>
              
              <form onSubmit={async(e) => {
                e.preventDefault();
                try{
                  const response = await api.post(
                    'verify_user',
                    {new_business:userInfo.business, business: businessInfo.b_name, user }
                  );

                  if(response.status === 'done'){
                    localStorage.setItem('business', response.data);
                    navigate('/dashboard');
                  } else{
                    setpassError('Wrong Password!');
                  }
                }
                catch(error){
                  console.log(error)
                }
                
              }}>
                <div className="form-group">   
                  <label>
                    <FontAwesomeIcon icon={faKey} /> Business Name
                  </label>
                  
                  {passError && <div className="error-message">{passError}</div>}
                  <input
                    type="text"
                    value={userInfo.business}
                    onChange={(e) => [setUserInfo({...userInfo, business: e.target.value}), setpassError('')]}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary">
                  Proceed to Dashboard
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AddBusiness;