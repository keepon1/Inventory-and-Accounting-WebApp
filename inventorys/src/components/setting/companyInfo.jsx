import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding, faMapMarkerAlt, faPhone,
  faEnvelope, faEdit,
  faAddressBook,
  faAudioDescription,
  faTimesCircle,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import api from '../api';
import './info.css';
import { Link, useNavigate } from 'react-router-dom';
import enableKeyboardScrollFix from '../../utils/scroll';
import { toast } from 'react-toastify';

const BusinessInfo = ({ business, user }) => {
  const [imagePreview, setImagePreview] = useState(null);
  const [info, setInfo] = useState({});
  const [showEdit, setShowEdit] = useState(false);
  const [detail, setDetail] = useState({name:'', email:'', address:'', contact:'', description:'', location:''})
  const [errors, setErrors] = useState({});
  const editOverlayRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async() =>{
      try{
        const response = await api.post('view_business', {business, user});

        if (response.status === 'error'){
          toast.error(response.message || 'Error occured while fetching data');
          return;
        }

        setInfo(response.data);
        if (business.image) {
            setImagePreview(business.image);
        }
      }catch{

      }};
    fetch();
    const cleanup = enableKeyboardScrollFix();
    return cleanup;
  }, [business]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async () => {
    if(detail.name === '' || !detail.name){
        setErrors({name: 'Company Name can not be empty'})
        return;
    }
    try {
        const response = await api.post('edit_business', {data:detail, business, user});

        if(response.status === 'success'){
          toast.success(response.message || 'Updated info successfully');

          const response1 = await api.post('view_business', {business:detail.name, user});
          if(response.status === 'success'){
            setInfo(response1.data);
            setShowEdit(false);
          }else{
            toast.error(response1.message || 'Error occured while fetching data');
            return;
          }
        }else{
          toast.error(response.message || 'Error updating business info');
          return;
        }

    } catch (error) {
      toast.error('Error updating business info');
      console.error('Error updating business info:', error);
    }
  };

    const handleEditOverlay = (e) => {
        if (editOverlayRef.current && !editOverlayRef.current.contains(e.target)) {
        setShowEdit(false);
        }
    };


  return (
    <div className="info-container">
        <div className="settings-header">
          <div className='header-back'>
            <Link to="../" className='back-link'>
              <FontAwesomeIcon icon={faArrowLeft} className='back-icon' />
            </Link>
            <h2>Business Information</h2>
          </div>
        </div>

        <div className="item-header">
            <button className="btn btn-outline" onClick={() => {
                setShowEdit(true);
                setDetail(info);
                document.addEventListener('mousedown', handleEditOverlay);
                }}>
                <FontAwesomeIcon icon={faEdit} /> Edit
            </button>
        </div>

        <div className="form-grid">
       
            <div className="form-column">

                <div className="form-group">
                <label htmlFor="bussiness_name">Business Name</label>
                    <div className="info-value">{info.name}</div>
                </div> 

                <div className="form-group">
                    <label htmlFor="image">Business Logo</label>
                    <div className='image-box'>
                        <div className="image-display">
                            <img src="/Screenshot (5).png" alt="Business logo" />
                        </div>
                    </div>
                </div>
                
            </div>

          <div className="form-column">
            <div className="info-item">
                <FontAwesomeIcon icon={faAudioDescription} className="info-icon" />
                <div className="info-block">
                    <label htmlFor="description">Description</label>
                    <div className="info-value">{info.description}</div>
                </div>
            </div>

            <div className="info-item">
              <FontAwesomeIcon icon={faMapMarkerAlt} className="info-icon" />
              <div className="info-block">
                <label htmlFor="location">Location</label>
                  <div className="info-value">{info.location}</div>
              </div>
            </div>

            <div className="info-item">
                <FontAwesomeIcon icon={faAddressBook} className="info-icon" />
                <div className="info-block">
                    <label htmlFor="address">Address</label>
                    <div className="info-value">{info.address}</div>
                </div>
            </div>

            <div className="info-item">
              <FontAwesomeIcon icon={faPhone} className="info-icon" />
              <div className="info-block">
                <label htmlFor="telephone">Telephone</label>
                  <div className="info-value">{info.contact}</div>

              </div>
            </div>


            <div className="info-item">
              <FontAwesomeIcon icon={faEnvelope} className="info-icon" />
              <div className="info-block">
                <label htmlFor="email">Email</label>
                  <div className="info-value">{info.email}</div>
              </div>
            </div>
          </div>
        </div>

        {showEdit && (
            <div className="modal-overlay">
                <div className="modal" ref={editOverlayRef}>
                    <div className="modal-header">
                      <h3>Edit Company Details</h3>
                        <button 
                          className="modal-close"
                          onClick={() => setShowEdit(false)}
                        >
                          <FontAwesomeIcon icon={faTimesCircle} />
                        </button>
                    </div>
                    <div className="form-group">
                      <label className="ivi_label">Company Name</label>
                      {errors.names && <div className="error-message">{errors.names}</div>}
                      <input
                        type="text"
                        value={detail.name}
                        className="ivi_input"
                        onChange={(e) => setDetail({...detail, name: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="ivi_label">Address</label>
                      <input
                        type="text"
                        value={detail.address}
                        className="ivi_input"
                        onChange={(e) => setDetail({...detail, address: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="ivi_label">Contact</label>
                      <input
                        type="text"
                        value={detail.contact}
                        className="ivi_input"
                        onChange={(e) => setDetail({...detail, contact: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="ivi_label">Email</label>
                      <input
                        type="email"
                        value={detail.email}
                        className="ivi_input"
                        onChange={(e) => setDetail({...detail, email: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="ivi_label">Location</label>
                      <input
                        type="email"
                        value={detail.location}
                        className="ivi_input"
                        onChange={(e) => setDetail({...detail, location: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="ivi_label">Description</label>
                      <input
                        type="email"
                        value={detail.description}
                        className="ivi_input"
                        onChange={(e) => setDetail({...detail, description: e.target.value})}
                      />
                    </div>
                    <div>
                      <button className="btn btn-primary" onClick={onSubmit}>
                        Save Changes
                      </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default BusinessInfo;