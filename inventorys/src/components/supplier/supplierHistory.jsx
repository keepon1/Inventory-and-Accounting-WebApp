import { useState, useEffect, useRef, useCallback } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faFileInvoice, faMoneyBillWave, faShareFromSquare, faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { useParams, Link, useNavigate } from "react-router-dom";
import "./supplierHistory.css";
import { toast } from "react-toastify";
import { format, set } from "date-fns";

const SupplierHistory = ({ business, user, access }) => {
  const [transactions, setTransactions] = useState([]);
  const [supplier, setSupplier] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef(null);
  const { supplierName } = useParams();
  const navigate = useNavigate();

  const overlayRef = useRef(null);

  useEffect(() => {
    const fetchSupplierHistory = async () => {
      try {
        const response = await api.post("fetch_supplier_history", { 
          business, 
          reference: supplierName,
          user,
          page
        });
        
        if (response?.status === "error") {
          toast.error(response.message || "Something went wrong!");
          return;
        }

        setSupplier(response.data.supplier);
        setTransactions(prev => page === 1 ? response.data.transactions : [...prev, ...response.data.transactions]);
        setHasMore(response.data.has_more);
      } catch (error) {
        console.error("Failed to fetch supplier history:", error);
        toast.error("Failed to fetch supplier history. Please try again.");
      }
    };

    fetchSupplierHistory();
  }, [page]);

  const handleCreateOverlayClick = (e) => {
    if (overlayRef.current && !overlayRef.current.contains(e.target)) {
      setExporting(false);
    }
  };

  const observeSecondLast = useCallback(node => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [hasMore]);

  useEffect(() => {
    if (transactions.length >= 2) {
      const index = transactions.length - 2;
      const row = document.getElementById(`row-${index}`);

      if (row) {
        observeSecondLast(row);
      }
    }
  }, [transactions, observeSecondLast]);

  const handleExport = async () => {
    try {
      const response = await api.post("export_supplier_history", {
        business,
        reference: supplierName,
        format: exportFormat,
        user
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
        toast.error(response.message || "Failed to export supplier history");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        navigate("/sign_in");
      } else {
        toast.error("Unexpected error while exporting supplier history");
      }
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (activeTab === 'all') return true;
    if (activeTab === 'invoices') return transaction.t_type === 'invoice';
    if (activeTab === 'payments') return transaction.t_type === 'payment';
    return true;
  });

  return (
    <div className="dashboard-main">
      <div className="journal-header">
        <div className="header-back">
          <Link to="../" className="back-link">
              <FontAwesomeIcon icon={faArrowLeft} className="back-icon" />
          </Link>
        <h2>
          {supplier?.name || supplierName}
        </h2>
        </div>

        <div className="journal-controls">
          <button className="share-icon" onClick={() => { 
            setExporting(true); 
            document.addEventListener('mousedown', handleCreateOverlayClick);
          }}>
            <FontAwesomeIcon icon={faShareFromSquare}/>
          </button>
        </div>
      </div>

      <div className="supplier-info-box">
        <div className="supplier-info-item">
          <span className="info-label">Account:</span>
          <span className="info-values">{supplier?.account}</span>
        </div>
        <div className="supplier-info-item">
          <span className="info-label">Balance:</span>
          <span className="info-values">GHS {supplier?.balance?.toFixed(2)}</span>
        </div>
      </div>

      <div className="history-tabs">
        <button 
          className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Transactions
        </button>
        <button 
          className={`tab-button ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          <FontAwesomeIcon icon={faFileInvoice} /> Invoices
        </button>
        <button 
          className={`tab-button ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          <FontAwesomeIcon icon={faMoneyBillWave} /> Payments
        </button>
      </div>

      <div className="history-table-box">
        <table className="history-table">
          <thead className="table-header">
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Transaction</th>
              <th>Reference</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((transaction, index) => (
                <tr key={index} 
                id={`row-${index}`}
                className="table-row">
                  <td>{format(transaction.date, 'dd/MM/yyyy')}</td>
                  <td>
                    <span className={`transaction-type ${transaction.t_type}`}>
                      {transaction.t_type}
                    </span>
                  </td>
                  <td>{transaction.type}</td>
                  <td>
                    <Link to={`/dashboard/${transaction.reference.includes('PUR') ? 'purchase' : 'payment'}/view/${transaction.reference}`}
                      state={{ [transaction.reference.includes('PUR') ? 'purchase' : 'payments']: transaction.reference, business, user, access }}
                    >
                      {transaction.reference}
                    </Link>
                  </td>
                  <td>{transaction.description}</td>
                  <td className={transaction.t_type === 'payment' ? "negative-amount" : "positive-amount"}>
                    {transaction.t_type === 'payment' ? '-' : '+'} GHS {Math.abs(transaction.amount).toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="no-history">
                  No transactions found for this supplier.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {exporting && (
        <div className="modal-overlay">
          <div className="modal" ref={overlayRef}>
            <div className="modal-header">
              <h3>Select Export Format</h3>
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
    </div>
  );
};

export default SupplierHistory;