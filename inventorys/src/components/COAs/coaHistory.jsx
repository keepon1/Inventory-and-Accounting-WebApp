import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faBook, faFileInvoice, faMoneyBillWave } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { useParams, Link } from "react-router-dom";
import "./accountHistory.css";
import { toast } from "react-toastify";
import {format} from 'date-fns';

const AccountHistory = ({ business, user, access }) => {
  const [transactions, setTransactions] = useState([]);
  const [account, setAccount] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const { accountCode } = useParams();

  useEffect(() => {
    const fetchAccountHistory = async () => {
      try {
        const response = await api.post("fetch_account_history", { 
          business, 
          reference: accountCode,
          user 
        });
        
        if (response?.status === "error") {
          toast.error(response.message || "Something went wrong!");
          return;
        }

        setAccount(response.data.account);
        setTransactions(response.data.transactions);
      } catch (error) {
        console.error("Failed to fetch account history:", error);
        toast.error("Failed to fetch account history. Please try again.");
      }
    };

    fetchAccountHistory();
  }, []);

  const filteredTransactions = transactions.filter(transaction => {
    if (activeTab === 'all') return true;
    if (activeTab === 'debit') return transaction.debit_amount > 0;
    if (activeTab === 'credit') return transaction.credit_amount > 0;
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
            Transaction History: {account?.name || accountCode}
          </h2>
        </div>
      </div>

      <div className="account-info-box">
        <div className="account-info-item">
          <span className="info-label">Account Code:</span>
          <span className="info-values">{account?.code}</span>
        </div>
        <div className="account-info-item">
          <span className="info-label">Account Type:</span>
          <span className="info-values">{account?.type}</span>
        </div>
        <div className="account-info-item">
          <span className="info-label">Current Balance:</span>
          <span className={`info-values ${account?.balance < 0 ? 'negative-balance' : 'positive-balance'}`}>
            GHS {Math.abs(account?.balance || 0).toFixed(2)}
            {account?.balance < 0 ? ' (Dr)' : ' (Cr)'}
          </span>
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
          className={`tab-button ${activeTab === 'debit' ? 'active' : ''}`}
          onClick={() => setActiveTab('debit')}
        >
          <FontAwesomeIcon icon={faMoneyBillWave} /> Debits
        </button>
        <button 
          className={`tab-button ${activeTab === 'credit' ? 'active' : ''}`}
          onClick={() => setActiveTab('credit')}
        >
          <FontAwesomeIcon icon={faMoneyBillWave} /> Credits
        </button>
      </div>

      <div className="history-table-box">
        <table className="history-table">
          <thead className="table-header">
            <tr>
              <th>Date</th>
              <th>Account</th>
              <th>Type</th>
              <th>Reference</th>
              <th>Description</th>
              <th>Debit</th>
              <th>Credit</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((transaction, index) => (
                <tr key={index} className="table-row">
                  <td>{format(transaction.date, 'dd/MM/yyyy')}</td>
                  <td>{transaction.hit_code} - {transaction.hit_name}</td>
                  <td>
                    <span className={`transaction-type ${transaction.type}`}>
                      {transaction.type}
                    </span>
                  </td>
                  <td>
                    <Link to={`/dashboard/${transaction.reference.includes('PUR') ? 'purchase' : 
                      transaction.reference.includes('SAL') ? 'sales' : transaction.reference.includes('JNL') ? 'journal' :
                      transaction.reference.includes('CSHR') ? 'cash' : transaction.reference.includes('PMT') ? 'payment' : ''}/view/${transaction.reference}`}
                      state={{ [transaction.reference.includes('PUR') ? 'purchase' : 
                      transaction.reference.includes('SAL') ? 'sales' : transaction.reference.includes('JNL') ? 'journals' :
                      transaction.reference.includes('CSHR' ? 'payments' : transaction.reference.includes('PMT') ? 'payments' : '')]: transaction.reference, business, user, access }}
                    >
                      {transaction.reference}
                    </Link>
                  </td>
                  <td>{transaction.description}</td>
                  <td className="debit-amount">
                    GHS {transaction.debit_amount}
                  </td>
                  <td className="credit-amount">
                    GHS {transaction.credit_amount}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-history">
                  No transactions found for this account.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AccountHistory;