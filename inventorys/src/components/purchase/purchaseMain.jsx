import { useState, useEffect, useRef, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faTruck, faShareFromSquare, faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { useNavigate, Routes, Route, Link, useParams } from "react-router-dom";
import CreatePurchase from "./createPurchase";
import ViewPurchase from "./viewPurchase";
import AccessDenied from "../access";
import { format } from "date-fns";
import { toast } from "react-toastify";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const PurchaseMain = ({ business, user, access }) => {
  const [purchases, setPurchases] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [parsed, setParsed] = useState('{}');
  const [waitTimeout, setWaitTimeout] = useState(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');
  const overlayRef = useRef(null);
  const observer = useRef(null);
  const navigate = useNavigate();

  const excpts = !(window.location.pathname.includes('view') || window.location.pathname.includes('edit') || window.location.pathname.includes('create'));

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
    if (!startDate || !endDate) {
      setParsed('{}');
      return;
    }
    setPage(1);
    const s = format(startDate, "yyyy-MM-dd");
    const e = format(endDate, "yyyy-MM-dd");
    setParsed(JSON.stringify({ start: s, end: e }));
  }, [startDate, endDate]);
  
  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const response = await api.post(
          'fetch_purchase',
          { business, page, user, searchQuery, parsed, format: ''},
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

  const handleCreateOverlayClick = (event) => {
    if (overlayRef.current && !overlayRef.current.contains(event.target)) {
      setExporting(false);
    }
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
    if (purchases.length >= 2) {
      const index = purchases.length - 2;
      const row = document.getElementById(`row-${index}`);
      if (row) observeSecondLast(row);
    }
  }, [purchases, observeSecondLast]);

  const handleExport = async () => {
    try {
      const response = await api.post("fetch_purchase", {
        business,
        user,
        parsed,
        searchQuery,
        page: 0,
        format: exportFormat,
      });
      if (response.status === "success") {
        const link = document.createElement("a");
        link.href = `data:application/octet-stream;base64,${response.data.file}`;
        link.download = response.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setExporting(false);
      } else {
        toast.error(response.message || "Failed to export purchases");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        navigate("/sign_in");
      } else {
        toast.error("Unexpected error while exporting purchases");
      }
    }
  };

  return (
    <div className="dashboard-main">
      <div className="journal-header">
        <h1>
          <FontAwesomeIcon icon={faTruck} className="header-icon"/> Purchases
        </h1>

        {excpts && (
          <div className="journal-controls">
            <button className="share-icon" onClick={() => {setExporting(true);
              document.addEventListener('mousedown', handleCreateOverlayClick);
            }}>
              <FontAwesomeIcon icon={faShareFromSquare}/>
            </button>
          </div>
        )}
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
                  <div className="ivi_holder_box1" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <DatePicker
                      selected={startDate}
                      onChange={(date) => setStartDate(date)}
                      selectsStart
                      startDate={startDate}
                      endDate={endDate}
                      placeholderText="Start date"
                      dateFormat="dd/MM/yyyy"
                      className="ivi_input"
                      isClearable
                    />
                  </div>
                </div>
                
                <div className="ivi_subboxes1">
                  <div className="ivi_holder_box1" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <DatePicker
                      selected={endDate}
                      onChange={(date) => setEndDate(date)}
                      selectsEnd
                      startDate={startDate}
                      endDate={endDate}
                      minDate={startDate}
                      placeholderText="End date"
                      dateFormat="dd/MM/yyyy"
                      className="ivi_input"
                      isClearable
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

            {exporting && (
              <div className="modal-overlay">
                <div className="modal" ref={overlayRef}>
                  <div className="modal-header">
                    <h3>Select Format</h3>
                    <button className="modal-close" onClick={() => setExporting(false)}>
                      <FontAwesomeIcon icon={faTimesCircle} />
                    </button>
                  </div>
                  <div className="modal-content">
                    <div className="export-options">
                      <input
                        type="radio"
                        name="exportFormat"
                        id="csv"
                        value="csv"
                        checked={exportFormat === 'csv'}
                        onChange={() => setExportFormat('csv')}
                      />
                      <label htmlFor="csv">CSV</label>
                    </div>
                    <div className="export-options">
                      <input
                        type="radio"
                        name="exportFormat"
                        id="xlsx"
                        value="xlsx"
                        checked={exportFormat === 'xlsx'}
                        onChange={() => setExportFormat('xlsx')}
                      />
                      <label htmlFor="xlsx">Excel</label>
                    </div>
                    <div className="export-options">
                      <input
                        type="radio"
                        name="exportFormat"
                        id="pdf"
                        value="pdf"
                        checked={exportFormat === 'pdf'}
                        onChange={() => setExportFormat('pdf')}
                      />
                      <label htmlFor="pdf">PDF</label>
                    </div>
                    <div className="modal-actions">
                      <button className="btn btn-outline" onClick={handleExport}>
                        Export
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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