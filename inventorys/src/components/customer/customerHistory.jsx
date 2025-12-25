import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faUsers, faFileInvoice, faMoneyBillWave, faShareFromSquare, faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { useParams, Link, useNavigate } from "react-router-dom";
import "./customerHistory.css";
import { toast } from "react-toastify";

const CustomerHistory = ({ business, user, access }) => {
  const [transactions, setTransactions] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef(null);
  const { customerName } = useParams();
  const navigate = useNavigate();

  const overlayRef = useRef(null);

  useEffect(() => {
    const fetchCustomerHistory = async () => {
      try {
        const response = await api.post("fetch_customer_history", { 
          business, 
          reference: customerName,
          user 
        });

        if (response?.status === "error") {
          toast.error(response.message || "Something went wrong!");
          return;
        }

        setCustomer(response.data.customer);
        setTransactions(prev => page === 1 ? response.data.transactions : [...prev, ...response.data.transactions]);
        setHasMore(response.data.has_more);
      } catch (error) {
        console.error("Failed to fetch customer history:", error);
        toast.error("Failed to fetch customer history. Please try again.");
      }
    };

    fetchCustomerHistory();
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
      const response = await api.post("export_customer_history", {
        business,
        reference: customerName,
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
        toast.error(response.message || "Failed to export customer history");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        navigate("/sign_in");
      } else {
        toast.error("Unexpected error while exporting customer history");
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
              {customer?.name || customerName}
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

        <div className="customer-info-box">
            <div className="customer-info-item">
                <span className="info-label">Account:</span>
                <span className="info-values">{customer?.account}</span>
            </div>
            <div className="customer-info-item">
                <span className="info-label">Balance:</span>
                <span className="info-values">GHS {customer?.balance?.toFixed(2)}</span>
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
                    <th>Transaction</th>
                    <th>Type</th>
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
                            <td>{new Date(transaction.date).toLocaleDateString()}</td>
                            <td>
                              <span className={`transaction-type ${transaction.t_type}`}>
                                {transaction.t_type}
                              </span>
                            </td>
                            <td>{transaction.type}</td>
                            <td>
                              <Link to={`/dashboard/${transaction.reference.includes('SAL') ? 'sales' : 'cash'}/view/${transaction.reference}`}
                                state={{ [transaction.reference.includes('SAL') ? 'sales' : 'payments']: transaction.reference, business, user, access }}
                              >
                                {transaction.reference}
                              </Link>
                            </td>
                            <td>{transaction.description}</td>
                            <td
                              className={
                                transaction.t_type === "payment"
                                  ? "positive-amount"
                                  : "negative-amount"
                              }
                            >
                              {transaction.t_type === "payment" ? "+" : "-"}
                              {` GHS ${Math.abs(transaction.amount).toFixed(2)}`}
                            </td>
                          </tr>
                    ))  
                  ) : (
                    <tr>
                      <td colSpan="7" className="no-history">
                        No transactions found for this customer.
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

export default CustomerHistory;