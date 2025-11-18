import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faUsers, faFileInvoice, faMoneyBillWave } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { useParams, Link } from "react-router-dom";
import "./customerHistory.css";
import { toast } from "react-toastify";

const CustomerHistory = ({ business, user, access }) => {
  const [transactions, setTransactions] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const { customerName } = useParams();

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
        setTransactions(response.data.transactions);
      } catch (error) {
        console.error("Failed to fetch customer history:", error);
        toast.error("Failed to fetch customer history. Please try again.");
      }
    };

    fetchCustomerHistory();
  }, [business, customerName, user]);

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
                          <tr key={index} className="table-row">
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
    </div>
  );
};

export default CustomerHistory;