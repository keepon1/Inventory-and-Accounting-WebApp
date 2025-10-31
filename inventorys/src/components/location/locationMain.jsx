import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEdit, faTimesCircle, faMapMarkerAlt,  } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import './locationMain.css';
import LocationItem from "./locationItems";
import { useNavigate, Routes, Route, useParams, Link } from "react-router-dom";
import enableKeyboardScrollFix from "../../utils/scroll";
import { toast } from "react-toastify";
import { format, set } from "date-fns"

const LocationMain = ({ business, user, access }) => {
  const [locations, setLocations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [waitTimeout, setWaitTimeout] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentLocation, setCurrentLocation] = useState({ name: '', description: '', date: '' });
  const [editData, setEditData] = useState({ originalName: '', name: '', description: '' });
  const overlayRef = useRef(null);
  const editOverlayRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    setSearchInput(e.target.value);

    if (waitTimeout) {
      clearTimeout(waitTimeout);
    }

    const timeout = setTimeout(() => {
      setSearchQuery(e.target.value.trim().toLowerCase());
    }, 500); 

    setWaitTimeout(timeout);
  };

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await api.post(
          'fetch_location',
          { business, searchQuery, user },
        );

        if (response.status == 'success'){
          setLocations(response.data);
        }else{
          toast.error(response.message || 'Error fetching locations');
          return;
        }
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem('access');
          navigate('/sign_in');
        }
      }
    };
    fetchLocations();
  }, [searchQuery]);

  const handleCreateOverlay = (e) => {
    if (overlayRef.current && !overlayRef.current.contains(e.target)) {
      setShowCreate(false);
    }
  };

  const handleEditOverlay = (e) => {
    if (editOverlayRef.current && !editOverlayRef.current.contains(e.target)) {
      setShowEdit(false);
    }
  };

  const openEdit = async (index) => {
    try {
      const info = locations[index];
      setEditData({
        originalName: info.loc,
        name: info.loc,
        description: info.description
      });
      setLoading(false);
      setShowEdit(true);
      document.addEventListener('mousedown', handleEditOverlay);
    } catch (error) {
      if (error.response?.status === 401) {
        navigate('/sign_in');
      }
    }
  };

  const handleCreate = async () => {
    if (!currentLocation.name) {
      toast.info('Location Name can not be empty');
      return;
    }

    if (!currentLocation.description) {
      toast.info('Description can not be empty');
      return;
    }

    if (currentLocation.name.length > 50) {
      toast.info('Location Name should be less than 50 characters');
      return;
    }

    if (loading){
      toast.info('Please wait... creating location');
      return;
    }
    try {
      setLoading(true);
      const response = await api.post(
        'add_location',
        { business, loc: currentLocation, user },
      );

      if (response.status === 'error') {
        toast.error(response.message || 'Location Name already exist');
        setLoading(false);
        return;
      }

      toast.success(response.message || 'Location created successfully');
      setLoading(false);

      setShowCreate(false);
      const updated = await api.post(
        'fetch_location',
        { business, user,  searchQuery},
      );
      if (updated.status == 'error'){
        toast.error(updated.message || 'Error fetching locations');
        return;
      }
      setLocations(updated.data);
      setCurrentLocation({ name: '', descript: '', date: '' });

    } catch (error) {
      toast.error('Error creating location');
      setLoading(false);
      console.error('Error details:', error);
      if (error.response?.status === 401) {
        navigate('/sign_in');
      }
    }
  };

  const handleEdit = async () => {
    if (loading){
      toast.info('Please wait... saving changes');
      return;
    };

    if (!editData.originalName) {
      toast.error('Original Location Name is missing');
      return;
    }

    if (!editData.name) {
      toast.info('Location Name can not be empty');
      return;
    }

    if (loading){
      toast.info('Please wait... saving changes');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(
        'edit_location',
        { 
          business,
          user,
          loc: { name: editData.name, description: editData.description },
          old: editData.originalName
        },
      );

      if (response.statue === 'error') {
        toast.error(response.message || 'Location Name already exist');
        setLoading(false);
        return;
      }

      toast.success(response.message || 'Location updated successfully');
      setLoading(false);

      setShowEdit(false);
      const updated = await api.post(
        'fetch_location',
        { business, searchQuery, user },
      );
      if (updated.status == 'error'){
        toast.error(updated.message || 'Error fetching locations');
        return;
      }
      setLocations(updated.data);
      setEditData({ originalName: '', name: '', descript: '' });

    } catch (error) {
      toast.error('Error updating location');
      setLoading(false);
      console.error('Error details:', error);
      
      if (error.response?.status === 401) {
        navigate('/sign_in');
      }
    }
  };

  const deleteLocation = async () => {
    if (loading){
      toast.info('Please wait... deleting location');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(
        'delete_location',
        { 
          location: editData.originalName
        },
      );

      if (response.status === 'error') {
        toast.error(response.message || 'Error deleting location');
        setLoading(false);
        return;
      }

      toast.success(response.message || 'Location deleted successfully');
      setLoading(false);
      setShowEdit(false);
      const updated = await api.post(
        'fetch_location',
        { business, searchQuery, user },
      );

      if (updated.status == 'error'){
        toast.error(updated.message || 'Error fetching locations');
        return;
      }

      setLocations(updated.data);
      setEditData({ originalName: '', name: '', descript: '' });
    } catch (error) {
      toast.error('Error deleting location');
      setLoading(false);
      console.error('Error details:', error);
      if (error.response?.status === 401) {
        navigate('/sign_in');
      }
    }
  };

  return (
    <div className="dashboard-main">
      <div className="journal-header">
        <h1>
          <FontAwesomeIcon icon={faMapMarkerAlt} className="header-icon"/> Locations
        </h1>
      </div>

      <Routes>
        <Route index element={
          <>
            <div className="journal-filters">
              <div className="create_access">
                {(access.create_access || access.admin) && (
                <button 
                  className="btn btn-outline"
                  onClick={() => {
                    setShowCreate(true);
                    document.addEventListener('mousedown', handleCreateOverlay);
                  }}
                >
                  Add Location
                </button>
                )}
              </div>
              
              <div className="ivi_display_box1">
                <div className="ivi_subboxes1">
                  <div className="ivi_holder_box1">
                    <input
                      type="search"
                      className="ivi_input"
                      placeholder="Search locations..."
                      value={searchInput}
                      onChange={handleSearch}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="items-table-box">
              <table className="items-table">
                <thead className="table-header">
                  <tr>
                    <th>Actions</th>
                    <th>Location Name</th>
                    <th>Description</th>
                    <th>Date Created</th>
                    <th>Total Items</th>
                    <th>Stock Value</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((location, index) => (
                    <tr key={index} className="table-row">
                      <td>
                          <Link to={`view/${location.loc}`} className="action-button">
                              <FontAwesomeIcon icon={faEye} />
                          </Link>
                        <button 
                          className="action-button"
                          onClick={() => openEdit(index)}
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                      </td>
                      <td>{location.loc}</td>
                      <td>{location.description}</td>
                      <td>{format(location.date, 'dd/MM/yyyy')}</td>
                      <td>{location.qty}</td>
                      <td>GHS {location.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {showCreate && (
              <div className="modal-overlay">
                <div className="modal" ref={overlayRef}>
                  <div className="modal-header">
                    <h3>Create New Location</h3>
                      <button 
                        className="modal-close"
                        onClick={() => setShowCreate(false)}
                      >
                        <FontAwesomeIcon icon={faTimesCircle} />
                      </button>
                  </div>
                  <div className="form-group">
                    <label className="ivi_label">Location Name</label>
                    {errors.name && <div className="error-message">{errors.name}</div>}
                    <input
                      id="loc-exist"
                      type="text"
                      value={currentLocation.name}
                      className="ivi_input"
                      onChange={(e) => [setCurrentLocation({...currentLocation, name: e.target.value}), setErrors('')]}
                    />
                    
                  </div>
                  <div className="form-group">
                    <label className="ivi_label">Description</label>
                    {errors.description && <div className="error-message">{errors.description}</div>}
                    <input
                      type="text"
                      value={currentLocation.description}
                      className="ivi_input"
                      onChange={(e) => [setCurrentLocation({...currentLocation, description: e.target.value}), setErrors('')]}
                    />
                    
                  </div>
                  <div>
                    <button className="btn btn-outline" onClick={handleCreate}>
                      Create Location
                    </button>
                  </div>

                </div>
                
              </div>
            )}

            {showEdit && (
              <div className="modal-overlay">
                <div className="modal" ref={editOverlayRef}>
                  <div className="modal-header">
                    <h3>Edit Location</h3>
                      <button 
                        className="modal-close"
                        onClick={() => setShowEdit(false)}
                      >
                        <FontAwesomeIcon icon={faTimesCircle} />
                      </button>
                  </div>
                  <div className="form-group">
                    <label className="ivi_label">Location Name</label>
                    {errors.names && <div className="error-message">{errors.names}</div>}
                    <input
                      type="text"
                      value={editData.name}
                      className="ivi_input"
                      onChange={(e) => setEditData({...editData, name: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="ivi_label">Description</label>
                    <input
                      type="text"
                      value={editData.description}
                      className="ivi_input"
                      onChange={(e) => setEditData({...editData, description: e.target.value})}
                    />
                  </div>
                  <div style={{display: 'flex', gap: '10px'}}>
                    <button className="btn btn-outline" onClick={handleEdit}>
                      Save Changes
                    </button>

                    <button className='btn btn-outline-red' onClick={deleteLocation}>
                      Delete Location
                    </button>
                  </div>
                </div>
              </div>
            )}

          </>
        } />
          <Route path="view/:location" element={<ViewItemWrapper user={user} business={business} access={access}/>} />
        </Routes>
    </div>
  );
};

const ViewItemWrapper = ({business, user, access}) => {
    const { location } = useParams();
    return <LocationItem location={location} access={access} user={user} business={business}/>;
  };

export default LocationMain;