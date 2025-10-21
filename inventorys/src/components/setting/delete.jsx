import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExclamationTriangle,
  faArrowLeft,
  faTrash,
  faBuilding
} from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { toast } from 'react-toastify';
import './DeleteBusiness.css';

const DeleteBusiness = ({ business, user }) => {
  const [businessData, setBusinessData] = useState(null);
  const [confirmationText, setConfirmationText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBusinessData = async () => {
      try {
        const response = await api.post('get_business_details', { business, user });
        
        if (response.status === 'success') {
          setBusinessData(response.data);
        } else {
          toast.error('Failed to fetch business details');
          navigate('/dashboard');
        }
      } catch (error) {
        toast.error('Error loading business information');
        console.error(error);
        if (error.response?.status === 401) {
          navigate('/sign_in');
        }
      }
    };

    fetchBusinessData();
  }, [business, user, navigate]);

  const handleDeleteBusiness = async () => {
    if (confirmationText !== 'DELETE') {
      toast.error('Please type "DELETE" to confirm');
      return;
    }

    if (isLoading) {
      toast.info('Deletion in progress...');
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.post('delete_business', {
        business,
        user_id: user
      });

      if (response.status === 'success') {
        toast.success('Business deleted successfully');
        document.cookie = 'access=; Max-Age=0; path=/;';
        document.cookie = 'refresh=; Max-Age=0; path=/;';
        navigate('/sign_in');
      } else {
        toast.error(response.message || 'Failed to delete business');
        setIsLoading(false);
      }
    } catch (error) {
      toast.error('An error occurred while deleting the business');
      setIsLoading(false);
      console.error(error);
    }
  };

  const getBusinessStats = () => {
    if (!businessData) return null;

    return [
      { label: 'Products', value: businessData.product_count || 0 },
      { label: 'Categories', value: businessData.category_count || 0 },
      { label: 'Brands', value: businessData.brand_count || 0 },
      { label: 'Orders', value: businessData.order_count || 0 },
      { label: 'Customers', value: businessData.customer_count || 0 }
    ];
  };

  if (!businessData) {
    return (
      <div className="delete-business-container">
        <div className="loading-spinner">Loading business information...</div>
      </div>
    );
  }

  return (
    <div className="delete-business-container">
      <div className="delete-business-header">
        <div className="header-back">
          <Link to="/dashboard" className="back-link">
            <FontAwesomeIcon icon={faArrowLeft} className="back-icon" />
          </Link>
          <h1>Delete Business</h1>
        </div>
      </div>

      <div className="delete-business-content">
        {/* Step 1: Warning */}
        {step === 1 && (
          <div className="warning-step">
            <div className="warning-icon">
              <FontAwesomeIcon icon={faExclamationTriangle} />
            </div>
            
            <h2>Warning: This action cannot be undone</h2>
            
            <div className="business-card">
              <div className="business-icon">
                <FontAwesomeIcon icon={faBuilding} />
              </div>
              <div className="business-info">
                <h3>{businessData.name}</h3>
                <p className="business-description">{businessData.description}</p>
                <p className="business-created">
                  Created: {new Date(businessData.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="business-stats">
              <h4>What will be deleted:</h4>
              <div className="stats-grid">
                {getBusinessStats()?.map((stat, index) => (
                  <div key={index} className="stat-item">
                    <span className="stat-value">{stat.value}</span>
                    <span className="stat-label">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="warning-message">
              <p>
                <strong>All of the following will be permanently deleted:</strong>
              </p>
              <ul>
                <li>All products and inventory data</li>
                <li>All categories and brands</li>
                <li>All customer records</li>
                <li>All order history and transactions</li>
                <li>All business settings and configurations</li>
              </ul>
              <p className="final-warning">
                This action cannot be reversed. Please make sure you have exported any important data before proceeding.
              </p>
            </div>

            <div className="action-buttons">
              <button 
                className="btn btn-secondary"
                onClick={() => navigate('/dashboard')}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={() => setStep(2)}
              >
                I understand, continue to delete
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Confirmation */}
        {step === 2 && (
          <div className="confirmation-step">
            <div className="confirmation-icon">
              <FontAwesomeIcon icon={faTrash} />
            </div>
            
            <h2>Final Confirmation</h2>
            
            <div className="confirmation-message">
              <p>
                To confirm deletion of <strong>"{businessData.name}"</strong>, 
                please type <strong>DELETE</strong> in the box below:
              </p>
            </div>

            <div className="confirmation-input">
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="confirmation-text-input"
              />
            </div>

            <div className="final-stats">
              <div className="final-stat">
                <span className="stat-number">{businessData.product_count || 0}</span>
                <span className="stat-text">products will be deleted</span>
              </div>
            </div>

            <div className="action-buttons">
              <button 
                className="btn btn-secondary"
                onClick={() => setStep(1)}
                disabled={isLoading}
              >
                Go Back
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleDeleteBusiness}
                disabled={isLoading || confirmationText !== 'DELETE'}
              >
                {isLoading ? 'Deleting...' : 'Permanently Delete Business'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeleteBusiness;
