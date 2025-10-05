import React, { useState, useEffect, useRef, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faEye, faEdit, faTruck } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { useNavigate, Routes, Route, Link, useParams } from "react-router-dom";
import CreatePurchase from "./createPurchase";
import ViewPurchase from "./viewPurchase";
import { handleDateSearch, isCompleteInput } from "../../utils/dateformat";
import AccessDenied from "../access";
import { format } from "date-fns";
import { toast } from "react-toastify";

const PurchaseMain = ({ business, user, access }) => {
  const [purchases, setPurchases] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchDateInput, setSearchDateInput] = useState('');
  const [parsed, setParsed] = useState('{}');
  const [waitTimeout, setWaitTimeout] = useState(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const observer = useRef(null);
  const navigate = useNavigate();

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

  useEffect(() => {
    const trimmed = searchDateInput.trim();
    
    if (!trimmed) {
      setParsed('{}');
      return;
    }
    
    if (isCompleteInput(trimmed)) {
      try {
        setPage(1);
        const result = handleDateSearch(trimmed);
        setParsed(JSON.stringify(result));
      } catch (err) {
        setParsed('{}');
      }
    }
  }, [searchDateInput]);

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const response = await api.post(
          'fetch_purchase',
          { business, page, user, searchQuery, parsed},
        );
        if (response.status === 'success'){
          setPurchases(prev => page === 1 ? response.data.purchases : [...prev, ...response.data.purchases]);
          setHasNext(response.data.has_more);
        }else{
          toast.error(response.message || 'Failed to fetch purchases');
        }
      } catch (error) {
        toast.error("An error occurred while fetching purchases.");
        if (error.response?.status === 401) {
          localStorage.removeItem('access');
          navigate('/sign_in');
        }
      }
    };
    fetchPurchases();
  }, [navigate, page, searchQuery, parsed]);

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
      if (purchases.length >= 2) {
        const index = purchases.length - 2;
        const row = document.getElementById(`row-${index}`);
        if (row) observeSecondLast(row);
      }
    }, [purchases, observeSecondLast]);

  return (
    <div className="dashboard-main">
      <div className="journal-header">
        <h1>
          <FontAwesomeIcon icon={faTruck} className="header-icon"/> Purchases
        </h1>
      </div>

      <Routes>
        <Route index element={
          <>
            <div className="journal-filters">
              <div className="create_access">
                {(access.admin || access.create_access) && (
                  <Link to="create" className="btn btn-outline">
                    Create Purchase
                  </Link>
                )}
              </div>
              
              <div className="ivi_display_box1">
                <div className="ivi_subboxes1">
                  <div className="ivi_holder_box1">
                    <input 
                      type="search"
                      className="ivi_input"
                      placeholder="date e.g.p1 or p1...p3 or 01/01/2025"
                      value={searchDateInput}
                      onChange={e => setSearchDateInput(e.target.value)}
                    />
                  </div>
                </div>

                <div className="ivi_subboxes1">
                  <div className="ivi_holder_box1">
                    <input
                      type="search"
                      className="ivi_input"
                      placeholder="Search purchases..."
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
                    <th>view</th>
                    <th>Purchase No</th>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Supplier</th>
                    <th>Location</th>
                    <th>Discount</th>
                    <th>Tax & Levy</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {purchases.map((purchase, index) => (
                    <tr key={purchase.code} id={`row-${index}`} className="table-row">
                      <td>
                        <Link to={`view/${purchase.code}`} className="action-button">
                          <FontAwesomeIcon icon={faEye} />
                        </Link>
                      </td>
                      <td>{purchase.code}</td>
                      <td>{format(purchase.date, 'dd/MM/yyyy')}</td>
                      <td>{purchase.description}</td>
                      <td>{purchase.supplier__name}</td>
                      <td>{purchase.location_address__location_name}</td>
                      <td>GHS {purchase.discount}</td>
                      <td>GHS {purchase.tax_levy}</td>
                      <td>GHS {purchase.gross_total}</td>
                      <td>{purchase.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        } />

        {(access.admin || access.create_access) &&
          <Route path="create" element={<CreatePurchase business={business} user={user} access={access}/>} />
        }
        <Route path="view/:purchaseNumber" element={<ViewPurchaseWrapper business={business} user={user} access={access} />} />
        <Route path="*" element={<AccessDenied/>} />
      </Routes>
    </div>
  );
};

const ViewPurchaseWrapper = ({user, access, business}) => {
  const { purchaseNumber } = useParams();
  return <ViewPurchase purchase={purchaseNumber} business={business} access={access} user={user} />;
};

export default PurchaseMain;