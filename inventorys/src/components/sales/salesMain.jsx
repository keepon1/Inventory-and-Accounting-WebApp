import React, { useState, useEffect, useRef, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faEye, faEdit, faShoppingCart } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { useNavigate, Routes, Route, Link, useParams } from "react-router-dom";
import CreateSales from "./createSales";
import ViewSales from "./viewSales";
import EditSales from "./editSales";
import { handleDateSearch, isCompleteInput } from "../../utils/dateformat";
import AccessDenied from "../access";
import { format } from "date-fns";
import { toast } from "react-toastify";

const SalesMain = ({ business, user, access }) => {
  const [sales, setSales] = useState([]);
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
    const fetchSales = async () => {
      try {
        const response = await api.post(
          'fetch_sales',
          { business,  page, searchQuery, parsed, user},
        );
        if (response.status === 'success'){
          setSales(prev => page === 1 ? response.data.sales : [...prev, ...response.data.sales]);
          setHasNext(response.data.has_more);
        }else{
          toast.error(response.message);
        }
      } catch (error) {
        toast.error("An error occurred while fetching sales.");
        if (error.response?.status === 401) {
          localStorage.removeItem('access');
          navigate('/sign_in');
        }
      }
    };
    fetchSales();
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
    if (sales.length >= 2) {
      const index = sales.length - 2;
      const row = document.getElementById(`row-${index}`);
      if (row) observeSecondLast(row);
    }
  }, [sales, observeSecondLast]);

  return (
    <div className="dashboard-main">
      <div className="journal-header">
        <h1>
          <FontAwesomeIcon icon={faShoppingCart} className="header-icon"/> Sales
        </h1>
      </div>

      <Routes>
        <Route index element={
          <>
            <div className="journal-filters">
              <div className="create_access">
                {(access.admin || access.create_access) && (
                  <Link to="create" className="btn btn-outline">
                    Create Sale
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
                      placeholder="search sales..."
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
                    <th>View</th>
                    <th>Sale No</th>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Customer</th>
                    <th>Location</th>
                    <th>Discount</th>
                    <th>Tax & Levy</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.code} className="table-row">
                      <td>
                        <Link to={`view/${sale.code}`} className="action-button">
                          <FontAwesomeIcon icon={faEye} />
                        </Link>
                      </td>
                      <td>{sale.code}</td>
                      <td>{format(sale.date, 'dd/MM/yyyy')}</td>
                      <td>{sale.description}</td>
                      <td>{sale.customer_info__name !== 'Regular Customer' ? sale.customer_info__name : sale.customer_name}</td>
                      <td>{sale.location_address__location_name}</td>
                      <td>&#8373; {sale.discount}</td>
                      <td>&#8373; {sale.tax_levy}</td>
                      <td>&#8373; {sale.gross_total}</td>
                      <td>{sale.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        } />

        {(access.admin || access.create_access) &&
          <Route path="create" element={<CreateSales business={business} user={user} access={access} />} />
        }
        <Route path="view/:saleNumber" element={<ViewSaleWrapper  business={business} user={user} access={access}/>} />
        {(access.admin || access.edit_access) &&
          <Route path="edit/:saleNumber" element={<EditSaleWrapper business={business} user={user} access={access}/>} />
        }
        <Route path="*" element={<AccessDenied/>} />
      </Routes>
    </div>
  );
};

const ViewSaleWrapper = ({user, access, business}) => {
  const { saleNumber } = useParams();
  return <ViewSales sales={saleNumber}  business={business} access={access} user={user} />;
};

const EditSaleWrapper = ({ business, user, access}) => {
  const { saleNumber } = useParams();
  return <EditSales sale={saleNumber} business={business} user={user} access={access}/>;
};

export default SalesMain;