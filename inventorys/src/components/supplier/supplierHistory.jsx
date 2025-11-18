import { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faFileInvoice, faMoneyBillWave } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { useParams, Link } from "react-router-dom";
import "./supplierHistory.css";
import { toast } from "react-toastify";
import { format } from "date-fns";

const SupplierHistory = ({ business, user, access }) => {
  const [transactions, setTransactions] = useState([]);
  const [supplier, setSupplier] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const { supplierName } = useParams();

  useEffect(() => {
    const fetchSupplierHistory = async () => {
      try {
        const response = await api.post("fetch_supplier_history", { 
          business, 
          reference: supplierName,
          user 
        });
        
        if (response?.status === "error") {
          toast.error(response.message || "Something went wrong!");
          return;
        }

        setSupplier(response.data.supplier);
        setTransactions(response.data.transactions);
      } catch (error) {
        console.error("Failed to fetch supplier history:", error);
        toast.error("Failed to fetch supplier history. Please try again.");
      }
    };

    fetchSupplierHistory();
  }, [business, supplierName, user]);

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
                <tr key={index} className="table-row">
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
    </div>
  );
};

export default SupplierHistory;