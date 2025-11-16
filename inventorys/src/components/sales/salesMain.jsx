import { useState, useEffect, useRef, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faShareFromSquare, faShoppingCart, faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { useNavigate, Routes, Route, Link, useParams } from "react-router-dom";
import CreateSales from "./createSales";
import ViewSales from "./viewSales";
import EditSales from "./editSales";
import AccessDenied from "../access";
import { format } from "date-fns";
import { toast } from "react-toastify";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const SalesMain = ({ business, user, access }) => {
  const [sales, setSales] = useState([]);
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
    if (startDate && endDate) {
      setPage(1);
      setParsed(JSON.stringify({
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd')
      }));
    } else {
      setParsed('{}');
    }
  }, [startDate, endDate]);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const response = await api.post(
          'fetch_sales',
          { business,  page, searchQuery, parsed, user, format: ''},
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
    if (sales.length >= 2) {
      const index = sales.length - 2;
      const row = document.getElementById(`row-${index}`);
      if (row) observeSecondLast(row);
    }
  }, [sales, observeSecondLast]);

  const handleExport = async () => {
    try {
      const response = await api.post("fetch_sales", {
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
        toast.error(response.message || "Failed to export transfers");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        navigate("/sign_in");
      } else {
        toast.error("Unexpected error while exporting transfers");
      }
    }
  };

  return (
    <div className="dashboard-main">
      <div className="journal-header">
        <h1>
          <FontAwesomeIcon icon={faShoppingCart} className="header-icon"/> Sales
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
                    Create Sale
                  </Link>
                )}
              </div>

              <div className="ivi_display_box1">
                <div className="ivi_subboxes1">
                  <div className="ivi_holder_box1">
                    <DatePicker
                      selected={startDate}
                      onChange={date => setStartDate(date)}
                      selectsStart
                      startDate={startDate}
                      endDate={endDate}
                      placeholderText="Start date"
                      dateFormat="dd/MM/yyyy"
                      className="ivi_input"
                      wrapperClassName="date-picker-wrapper"
                      isClearable
                    />
                  </div>
                </div>
                <div className="ivi_subboxes1">
                  <div className="ivi_holder_box1">
                    <DatePicker
                      selected={endDate}
                      onChange={date => setEndDate(date)}
                      selectsEnd
                      startDate={startDate}
                      endDate={endDate}
                      minDate={startDate}
                      placeholderText="End date"
                      dateFormat="dd/MM/yyyy"
                      className="ivi_input"
                      wrapperClassName="date-picker-wrapper"
                      isClearable
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
                    <th>Phone No.</th>
                    <th>Location</th>
                    <th>Discount</th>
                    <th>Tax & Levy</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {sales.map((sale, index) => (
                    <tr key={sale.code} id={`row-${index}`} className="table-row">
                      <td>
                        <Link to={`view/${sale.code}`} className="action-button">
                          <FontAwesomeIcon icon={faEye} />
                        </Link>
                      </td>
                      <td>{sale.code}</td>
                      <td>{format(sale.date, 'dd/MM/yyyy')}</td>
                      <td>{sale.description}</td>
                      <td>{sale.customer_info__name !== 'Regular Customer' ? sale.customer_info__name : sale.customer_name}</td>
                      <td>{sale.customer_info__name !== 'Regular Customer' ? sale.customer_info__contact : sale.customer_contact}</td>
                      <td>{sale.location_address__location_name}</td>
                      <td>GHS {sale.discount}</td>
                      <td>GHS {sale.tax_levy}</td>
                      <td>GHS {sale.gross_total}</td>
                      <td>{sale.status}</td>
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