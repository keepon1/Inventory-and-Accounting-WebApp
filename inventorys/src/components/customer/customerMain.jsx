import React, { useState, useEffect, useRef, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faEye, faEdit, faTimesCircle, faMapMarkerAlt, faUsers,  } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { useNavigate, Routes, Route, useParams, Link } from "react-router-dom";
import enableKeyboardScrollFix from "../../utils/scroll";
import { toast } from "react-toastify";
import CustomerHistory from "./customerHistory";
import AccessDenied from "../access";
import { set } from "date-fns";

const CustomerMain = ({ business, user, access }) => {
  const [customers, setCustomers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentCustomer, setCurrentCustomer] = useState({ name: '', address: '', contact: '', email:'' });
  const [editData, setEditData] = useState({ originalName: '', name: '', address: '', contact:'', email:'' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [waitTimeout, setWaitTimeout] = useState(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const overlayRef = useRef(null);
  const editOverlayRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await api.post(
          'fetch_customers',
          { business, user, page, searchQuery },
        );

        if (response.status === 'error') {
          toast.error(response.message || 'Failed to fetch customers');
          return;
        }

        setCustomers(prev => page === 1 ? response.data.data : [...prev, ...response.data.data]);
        setHasNext(response.data.has_more);
      } catch (error) {
        console.error('Error fetching customers:', error);
        toast.error('An error occurred while fetching customers.');
        if (error.response?.status === 401) {
          localStorage.removeItem('access');
          navigate('/sign_in');
        }
      }
    };
    fetchLocations();
    const cleanup = enableKeyboardScrollFix();
    return cleanup;
  }, [page, searchQuery]);

  const handleSearch = (e) => {
    setSearchInput(e.target.value);
    setPage(1);
  
    if (waitTimeout) {
      clearTimeout(waitTimeout);
    }
    
    const timeout = setTimeout(() => {
      setSearchQuery(e.target.value.trim().toLowerCase());
    }, 500); 
    
    setWaitTimeout(timeout);
  };
  
  const observeSecondLast = useCallback(node => {
    if (observer.current) observer.current.disconnect();
        
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNext) {
        setPage(prev => prev + 1);
      }
    });
        
    if (node) observer.current.observe(node);
  }, [hasNext]);
        
  useEffect(() => {
    if (customers.length >= 2) {
      const index = customers.length - 2;
      const row = document.getElementById(`row-${index}`);
      if (row) observeSecondLast(row);
    }
  }, [customers, observeSecondLast]);

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

  const openEdit = async (customerName) => {
    const info = customers[customerName]
      setEditData({
        originalName: info.name,
        name: info.name,
        address: info.address,
        contact: info.contact,
        email: info.email,
      });
      setShowEdit(true);
      document.addEventListener('mousedown', handleEditOverlay);
  };

  const handleCreate = async () => {
    if (!currentCustomer.name) {
      toast.info('Customer`s Name can not be empty');
      return;
    }

    if (loading){
      toast.info('Please wait, creating customer');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(
        'add_customer',
        { business, customer: currentCustomer, user },
      );

      if (response.status === 'error') {
        setLoading(false);
        toast.error(response.message || 'Customer already exist');
        return;
      }

      toast.success(response.message || 'Customer created successfully');
      setShowCreate(false);
      const updated = await api.post(
        'fetch_customers',
        { business, user, page, searchQuery },
      );

      if (updated.status === 'error') {
        toast.error(updated.message || 'Failed to fetch customers');
        return;
      }

      setCustomers(prev => page === 1 ? updated.data.data : [...prev, ...updated.data.data]);
      setHasNext(updated.data.has_more);
      setCurrentCustomer({ name: '', address: '', contact: '',  email:''});

    } catch (error) {
      setLoading(false);
      toast.error('An error occurred while creating customer.');
      console.error(error);
      if (error.response?.status === 401) {
        navigate('/sign_in');
      }
    }
  };

  const handleEdit = async () => {
    if (!editData.name) {
      toast.info('Customer`s Name can not be empty');
      return;
    }

    if (loading){
      toast.info('Please wait, editing customer');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(
        'edit_customer',
        { 
          business,
          customer: { name: editData.name, address: editData.address, contact:editData.contact, email:editData.email },
          old: editData.originalName,
          user
        }
      );

      if (response.status === 'error') {
        setLoading(false);
        toast.error(response.message || 'Customer`s Name already exist');
        return;
      }

      toast.success(response.message || 'Customer updated successfully');
      setShowEdit(false);
      const updated = await api.post(
        'fetch_customers',
        { business, user, page, searchQuery }
      );

      if (updated.status === 'error') {
        toast.error(updated.message || 'Failed to fetch customers');
        return;
      }
      setCustomers(prev => page === 1 ? updated.data.data : [...prev, ...updated.data.data]);
      setHasNext(updated.data.has_more);
      setEditData({ originalName: '', name: '', address: '', contact:'', email:'' });

    } catch (error) {
      setLoading(false);
      toast.error('An error occurred while editing customer.');
      console.error(error);
      if (error.response?.status === 401) {
        navigate('/sign_in');
      }
    }
  };

  return (
    <div className="dashboard-main">
      <div className="journal-header">
        <h1>
          <FontAwesomeIcon icon={faUsers} className="header-icon"/> Customers
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
                    Add Customer
                  </button>
                )}
              </div>

              <div className="ivi_display_box1">
                <div className="ivi_subboxes1">
                  <div className="ivi_holder_box1">
                    <input
                      type="search"
                      className="ivi_input"
                      placeholder="Search customers..."
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
                    <th>Edit</th>
                    <th>Account</th>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Address</th>
                    <th>Email</th>
                    <th>Invoices</th>
                    <th>Payments</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer, index) => (
                    <tr key={index} className="table-row">
                      <td>
                        <button 
                          className="action-button"
                          onClick={() => openEdit(index)}
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                      </td>
                      <td>{customer.account}</td>
                      <td>{customer.name}</td>
                      <td>{customer.contact}</td>
                      <td>{customer.address}</td>
                      <td>{customer.email}</td>
                      <td><Link to={`history/${customer.account} - ${customer.name}`} className="transaction-link">GHS {customer.debit}</Link></td>
                      <td><Link to={`history/${customer.account} - ${customer.name}`} className="transaction-link">GHS {customer.credit}</Link></td>
                      <td><Link to={`history/${customer.account} - ${customer.name}`} className="transaction-link">GHS {(customer.debit - customer.credit).toFixed(2) }</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>


            {showCreate && (
              <div className="modal-overlay">
                <div className="modal" ref={overlayRef}>
                  <div className="modal-header">
                    <h3>Create New Customer</h3>
                      <button 
                        className="modal-close"
                        onClick={() => setShowCreate(false)}
                      >
                        <FontAwesomeIcon icon={faTimesCircle} />
                      </button>
                  </div>
                  <div className="form-group">
                    <label className="ivi_label">Customer Name</label>
                    {errors.name && <div className="error-message">{errors.name}</div>}
                    <input
                      id="loc-exist"
                      type="text"
                      value={currentCustomer.name}
                      className="ivi_input"
                      onChange={(e) => [setCurrentCustomer({...currentCustomer, name: e.target.value}), setErrors('')]}
                    />
                    
                  </div>
                  <div className="form-group">
                    <label className="ivi_label">Address</label>
                    <input
                      type="text"
                      value={currentCustomer.address}
                      className="ivi_input"
                      onChange={(e) => [setCurrentCustomer({...currentCustomer, address: e.target.value}), setErrors('')]}
                    />
                    
                  </div>
                  <div className="form-group">
                    <label className="ivi_label">Contact</label>
                    <input
                      type="text"
                      value={currentCustomer.contact}
                      className="ivi_input"
                      onChange={(e) => [setCurrentCustomer({...currentCustomer, contact: e.target.value}), setErrors('')]}
                    />
                    
                  </div>
                  <div className="form-group">
                    <label className="ivi_label">Email</label>
                    <input
                      type="email"
                      value={currentCustomer.email}
                      className="ivi_input"
                      onChange={(e) => [setCurrentCustomer({...currentCustomer, email: e.target.value}), setErrors('')]}
                    />
                    
                  </div>
                  <div>
                    <button className="btn btn-primary" onClick={handleCreate}>
                      Create Customer
                    </button>
                  </div>

                </div>
                
              </div>
            )}


            {showEdit && (
              <div className="modal-overlay">
                <div className="modal" ref={editOverlayRef}>
                  <div className="modal-header">
                    <h3>Edit Customer</h3>
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
                    <label className="ivi_label">Address</label>
                    <input
                      type="text"
                      value={editData.address}
                      className="ivi_input"
                      onChange={(e) => setEditData({...editData, address: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="ivi_label">Contact</label>
                    <input
                      type="text"
                      value={editData.contact}
                      className="ivi_input"
                      onChange={(e) => setEditData({...editData, contact: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="ivi_label">Email</label>
                    <input
                      type="email"
                      value={editData.email}
                      className="ivi_input"
                      onChange={(e) => setEditData({...editData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <button className="btn btn-primary" onClick={handleEdit}>
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

          </>
        } />
        <Route path="history/:customerName" element={<CustomerHistoryWrapper business={business} user={user} access={access} />} />
        <Route path="*" element={<AccessDenied />} />
      </Routes>
    </div>
  );
};

const CustomerHistoryWrapper = ({ business, user, access }) => {
  const { customerName } = useParams();
  return <CustomerHistory customerName={customerName} business={business} user={user} access={access} />;
};

export default CustomerMain;