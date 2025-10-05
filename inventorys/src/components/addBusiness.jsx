import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faKey,
} from "@fortawesome/free-solid-svg-icons";
import api from './api';
import './addBusiness.css';
import Footer from './Footer';
import enableKeyboardScrollFix from '../utils/scroll';
import { toast, ToastContainer } from 'react-toastify';

const AddBusiness = () => {
  const [businessInfo, setBusinessInfo] = useState({})
  const [passError, setpassError] = useState('');
  const [userInfo, setUserInfo] = useState({business:''})
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [showUserSelect, setShowUserSelect] = useState(false);
  const [showUserSelect1, setShowUserSelect1] = useState(false);

  const navigate = useNavigate();
  const addFormRef = useRef(null);
  const deleteFormRef = useRef(null);
  const userSelectRef = useRef(null);
  const business = localStorage.getItem('business');
  const user = localStorage.getItem('user');

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const response = await api.post('select_bussiness', {business, user});
        console.log(response);

        const businessInfo = response.data.business[0];
        setBusinessInfo(businessInfo);

        console.log(response)
        
        if (response.status === 'success'){
          if (businessInfo.new && businessInfo.google){ 
            setShowUserSelect1(true);
          }else{
            navigate('/dashboard');
          }
        }

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


  return (
    <div className="app-container">
      <ToastContainer position="top-right" autoClose={3000}/>

      <main className="business-container">

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

                  if(response.status === 'success'){
                    localStorage.setItem('business', response.data);
                    navigate('/dashboard');
                  } else{
                    toast.error(response.message || 'try again')
                    return;
                  }
                }
                catch(error){
                  toast.error('An error occurred. Please try again.');
                  console.log(error);
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

    </div>
  );
};

export default AddBusiness;