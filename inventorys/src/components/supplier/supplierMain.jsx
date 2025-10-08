import { useState, useEffect, useRef, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTimesCircle, faUserGroup,  } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { useNavigate, Routes, Route, useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import SupplierHistory from "./supplierHistory";
import AccessDenied from "../access";

const SupplierMain = ({ business, user, access }) => {
  const [suppliers, setsuppliers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentsupplier, setCurrentsupplier] = useState({ name: '', address: '', contact: '', email:'' });
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
          'fetch_suppliers',
          { business, user, page, searchQuery },
        );

        if (response.status === 'error') {
          toast.error(response.message || 'An error occurred while fetching suppliers.');
          return;
        }
        setsuppliers(prev => page === 1 ? response.data.data : [...prev, ...response.data.data]);
        setHasNext(response.data.has_more);
      } catch (error) {
        toast.error('An error occurred while fetching suppliers.');
        if (error.response?.status === 401) {
          localStorage.removeItem('access');
          navigate('/sign_in');
        }
      }
    };
    fetchLocations();
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
    if (suppliers.length >= 2) {
      const index = suppliers.length - 2;
      const row = document.getElementById(`row-${index}`);
      if (row) observeSecondLast(row);
    }
  }, [suppliers, observeSecondLast]);

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
    const info = suppliers[index];
    setEditData({
      originalName: info.name,
      name: info.name,
      address: info.address,
      contact: info.contact,
      email: info.email,
    });
    setLoading(false);
    setShowEdit(true);
    document.addEventListener('mousedown', handleEditOverlay);
  };

  const handleCreate = async () => {
    if (!currentsupplier.name) {
      toast.info('supplier`s Name can not be empty');
      return;
    }

    if (loading) {
      toast.info('Please wait... creation in progress');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(
        'add_supplier',
        { business, supplier: currentsupplier, user },
      );

      if (response.status === 'error') {
        toast.error(response.message || 'supplier already exist');
        setLoading(false);
        return;
      }

      toast.success(response.message || 'supplier created successfully');
      setLoading(false);
      setShowCreate(false);
      const updated = await api.post(
        'fetch_suppliers',
        { business, user, page, searchQuery },
      );

      if (updated.status === 'error') {
        toast.error(updated.message || 'An error occurred while fetching suppliers.');
        return;
      }

      setsuppliers(prev => page === 1 ? updated.data.data : [...prev, ...updated.data.data]);
      setHasNext(updated.data.has_more);
      setCurrentsupplier({ name: '', address: '', contact: '',  email:''});

    } catch (error) {
      toast.error('An error occurred while creating supplier.');
      setLoading(false);
      console.error(error);
      if (error.response?.status === 401) {
        navigate('/sign_in');
      }
    }
  };

  const handleEdit = async () => {
    if (!editData.originalName) {
      toast.error('Original supplier name is missing.');
      return;
    };

    if (!editData.name) {
      toast.info('supplier`s Name can not be empty');
      return;
    }

    if (loading) {
      toast.info('Please wait... editing in progress');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(
        'edit_supplier',
        { 
          business,
          supplier: { name: editData.name, address: editData.address, contact:editData.contact, email:editData.email },
          old: editData.originalName,
          user
        },
      );

      if (response.status === 'error') {
        toast.info(response.message || 'supplier`s Name already exist');
        setLoading(false);
        return;
      }

      toast.success(response.message || 'supplier edited successfully');
      setLoading(false);
      setShowEdit(false);
      const updated = await api.post(
        'fetch_suppliers',
        { business, user, page, searchQuery },
      );

      if (updated.status === 'error') {
        toast.error(updated.message || 'An error occurred while fetching suppliers.');
        return;
      }

      setsuppliers(prev => page === 1 ? updated.data.data : [...prev, ...updated.data.data]);
      setHasNext(updated.data.has_more);
      setEditData({ originalName: '', name: '', address: '', contact:'', email:'' });

    } catch (error) {
      toast.error('An error occurred while editing supplier.');
      setLoading(false);
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
          <FontAwesomeIcon icon={faUserGroup} className="header-icon"/> Suppliers
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
                    Add Supplier
                  </button>
                )}
              </div>

              <div className="ivi_display_box1">
                <div className="ivi_subboxes1">
                  <div className="ivi_holder_box1">
                    <input
                      type="search"
                      className="ivi_input"
                      placeholder="Search suppliers..."
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
                  {suppliers.map((supplier, index) => (
                    <tr key={index} className="table-row">
                      <td>
                        <button 
                          className="action-button"
                          onClick={() => openEdit(index)}
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                      </td>
                      <td>{supplier.account}</td>
                      <td>{supplier.name}</td>
                      <td>{supplier.contact}</td>
                      <td>{supplier.address}</td>
                      <td>{supplier.email}</td>
                      <td><Link to={`history/${supplier.account} - ${supplier.name}`} className="transaction-link">GHS {supplier.credit}</Link></td>
                      <td><Link to={`history/${supplier.account} - ${supplier.name}`} className="transaction-link">GHS {supplier.debit}</Link></td>
                      <td><Link to={`history/${supplier.account} - ${supplier.name}`} className="transaction-link">GHS {(supplier.credit - supplier.debit).toFixed(2) }</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>


            {showCreate && (
              <div className="modal-overlay">
                <div className="modal" ref={overlayRef}>
                  <div className="modal-header">
                    <h3>Create New Supplier</h3>
                      <button 
                        className="modal-close"
                        onClick={() => setShowCreate(false)}
                      >
                        <FontAwesomeIcon icon={faTimesCircle} />
                      </button>
                  </div>
                  <div className="form-group">
                    <label className="ivi_label">supplier Name</label>
                    {errors.name && <div className="error-message">{errors.name}</div>}
                    <input
                      id="loc-exist"
                      type="text"
                      value={currentsupplier.name}
                      className="ivi_input"
                      onChange={(e) => [setCurrentsupplier({...currentsupplier, name: e.target.value}), setErrors('')]}
                    />
                    
                  </div>
                  <div className="form-group">
                    <label className="ivi_label">Address</label>
                    <input
                      type="text"
                      value={currentsupplier.address}
                      className="ivi_input"
                      onChange={(e) => [setCurrentsupplier({...currentsupplier, address: e.target.value}), setErrors('')]}
                    />
                    
                  </div>
                  <div className="form-group">
                    <label className="ivi_label">Contact</label>
                    <input
                      type="text"
                      value={currentsupplier.contact}
                      className="ivi_input"
                      onChange={(e) => [setCurrentsupplier({...currentsupplier, contact: e.target.value}), setErrors('')]}
                    />
                    
                  </div>
                  <div className="form-group">
                    <label className="ivi_label">Email</label>
                    <input
                      type="email"
                      value={currentsupplier.email}
                      className="ivi_input"
                      onChange={(e) => [setCurrentsupplier({...currentsupplier, email: e.target.value}), setErrors('')]}
                    />
                    
                  </div>
                  <div>
                    <button className="btn btn-primary" onClick={handleCreate}>
                      Create Supplier
                    </button>
                  </div>

                </div>
                
              </div>
            )}


            {showEdit && (
              <div className="modal-overlay">
                <div className="modal" ref={editOverlayRef}>
                  <div className="modal-header">
                    <h3>Edit supplier</h3>
                      <button 
                        className="modal-close"
                        onClick={() => setShowEdit(false)}
                      >
                        <FontAwesomeIcon icon={faTimesCircle} />
                      </button>
                  </div>
                  <div className="form-group">
                    <label className="ivi_label">Supplier Name</label>
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
        <Route path="history/:supplierName" element={<SupplierHistoryWrapper business={business} user={user} access={access} />} />
        <Route path="*" element={<AccessDenied />} />
      </Routes>
    </div>
  );
};

const SupplierHistoryWrapper = ({ business, user, access }) => {
  const { supplierName } = useParams();
  return <SupplierHistory supplierName={supplierName} business={business} user={user} access={access} />;
};

export default SupplierMain;