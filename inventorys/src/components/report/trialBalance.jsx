import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBalanceScale,
  faChevronDown,
  faChevronUp,
  faTable,
  faChartBar,
  faExclamationTriangle,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../api';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const TrialBalance = ({ business, user }) => {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const [trialBalance, setTrialBalance] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(startOfYear);
  const [endDate, setEndDate] = useState(today);
  const [expandedAccounts, setExpandedAccounts] = useState({});
  const [activeView, setActiveView] = useState('table');
  const [alertsCollapsed, setAlertsCollapsed] = useState(true);

  const processTrialBalanceData = (response) => {
    const groups = {
      Assets: { name: 'Assets', debit: 0, credit: 0, accounts: [] },
      Liabilities: { name: 'Liabilities', debit: 0, credit: 0, accounts: [] },
      Equity: { name: 'Equity', debit: 0, credit: 0, accounts: [] },
      Revenue: { name: 'Revenue', debit: 0, credit: 0, accounts: [] },
      Expenses: { name: 'Expenses', debit: 0, credit: 0, accounts: [] },
    };

    response.forEach(acc => {
      const { account_type, debit, credit, real_account, sub_account } = acc;
      if (!groups[account_type]) return;

      groups[account_type].accounts.push({
        id: acc.id,
        real_account,
        sub_account,
        debit,
        credit,
        balance: (debit || 0) - (credit || 0),
      });

      groups[account_type].debit += debit || 0;
      groups[account_type].credit += credit || 0;
    });

    return Object.values(groups);
  };

  useEffect(() => {
    const fetchTrialBalance = async () => {
      try {
        const response = await api.post('fetch_trial_balance', { 
          business,
          user,
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd')
        });
        
        const processedData = processTrialBalanceData(response);
        
        setTrialBalance(processedData);
        setFilteredData(processedData);
      } catch (error) {
        console.error('Error fetching trial balance:', error);
      }
    };
    
    fetchTrialBalance();
  }, [business, startDate, endDate]);

  useEffect(() => {
    let result = [...trialBalance];
    
    if (searchQuery) {
      result = result.map(accountType => ({
        ...accountType,
        accounts: accountType.accounts.filter(account =>
          account.real_account?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          account.sub_account?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
      }));
    }
    
    setFilteredData(result);
  }, [searchQuery, trialBalance]);

  const toggleAccountExpand = (accountType) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [accountType]: !prev[accountType]
    }));
  };

  const getUnbalancedAccounts = () => {
    const totalDebits = filteredData.reduce((sum, type) => sum + type.debit, 0);
    const totalCredits = filteredData.reduce((sum, type) => sum + type.credit, 0);
    return Math.abs(totalDebits - totalCredits) > 0.01;
  };

  const renderTable = () => (
    <div className="stock-table">
      <table className='ia_main_table'>
        <thead>
          <tr>
            <th>Account</th>
            <th>Debit (GHS)</th>
            <th>Credit (GHS)</th>
            <th>Balance (GHS)</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map((accountType) => (
            <React.Fragment key={accountType.name}>
              <tr className="account-type-row">
                <td>
                  <button 
                    className="expand-btn"
                    onClick={() => toggleAccountExpand(accountType.name)}
                  >
                    <FontAwesomeIcon 
                      icon={expandedAccounts[accountType.name] ? faChevronUp : faChevronDown} 
                    />
                  </button>
                  {accountType.name}
                </td>
                <td>GHS {accountType.debit.toFixed(2)}</td>
                <td>GHS {accountType.credit.toFixed(2)}</td>
                <td>
                  GHS {accountType.name === 'Assets' || accountType.name === 'Expenses' 
                    ? (accountType.debit - accountType.credit).toFixed(2)
                    : (accountType.credit - accountType.debit).toFixed(2)}
                </td>
              </tr>
              
              {expandedAccounts[accountType.name] && accountType.accounts.map((account) => (
                <tr key={account.real_account} className="account-detail-row">
                  <td>{account.real_account || account.sub_account?.name}</td>
                  <td>GHS {account.debit?.toFixed(2) || '0.00'}</td>
                  <td>GHS {account.credit?.toFixed(2) || '0.00'}</td>
                  <td>GHS {account.balance.toFixed(2)}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
          
          <tr className="totals-row">
            <td><strong>Totals</strong></td>
            <td>
              <strong>GHS {filteredData.reduce((sum, type) => sum + type.debit, 0).toFixed(2)}</strong>
            </td>
            <td>
              <strong>GHS {filteredData.reduce((sum, type) => sum + type.credit, 0).toFixed(2)}</strong>
            </td>
            <td className={getUnbalancedAccounts() ? 'low-stock' : ''}>
              <strong>
                GHS {(
                  filteredData.reduce((sum, type) => {
                    if (type.name === 'Assets' || type.name === 'Expenses') {
                      return sum + (type.debit - type.credit);
                    } else {
                      return sum + (type.credit - type.debit);
                    }
                  }, 0)
                ).toFixed(2)}
              </strong>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderChart = () => {
    const chartData = filteredData.map(type => ({
      name: type.name,
      value: type.name === 'Assets' || type.name === 'Expenses' 
        ? type.debit - type.credit 
        : type.credit - type.debit
    }));

    return (
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Balance']} />
            <Legend />
            <Bar dataKey="value" name="Balance" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="dashboard-main">
      <div className="journal-header">
        <div className='header-back'>
          <Link to="../" className='back-link'>
            <FontAwesomeIcon icon={faArrowLeft} className='back-icon' />
          </Link>
          <h2>
            Trial Balance
          </h2>
        </div>
      </div>

      <div className="journal-filters">
        <div className="create_access"></div>
        <div className="ivi_display_box1">       
          <div className="ivi_subboxes1">
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ivi_input"
            />
          </div>
          
          <div className="ivi_subboxes1">
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              dateFormat="MMMM yyyy"
              showMonthYearPicker
              placeholderText="Select Month"
              className="ivi_input"
            />
          </div>
          <div className="chart-selector">
            <button 
              className={`chart-btn ${activeView === 'table' ? 'active' : ''}`}
              onClick={() => setActiveView('table')}
            >
              <FontAwesomeIcon icon={faTable} /> Table
            </button>
            <button 
              className={`chart-btn ${activeView === 'chart' ? 'active' : ''}`}
              onClick={() => setActiveView('chart')}
            >
              <FontAwesomeIcon icon={faChartBar} /> Chart
            </button>
          </div>
        </div>

        
      </div>

      {activeView === 'table' ? renderTable() : renderChart()}

      <div className="alerts-section">
        <div className="alerts-header" onClick={() => setAlertsCollapsed(!alertsCollapsed)}>
          <h3>
            <FontAwesomeIcon icon={faExclamationTriangle} className="alert-icon" />
            Balance Alerts ({getUnbalancedAccounts() ? 1 : 0})
          </h3>
          <FontAwesomeIcon 
            icon={faChevronDown} 
            className={`alert-toggle ${alertsCollapsed ? 'collapsed' : ''}`} 
          />
        </div>
        <div className={`alerts-content ${alertsCollapsed ? 'collapsed' : ''}`}>
          {getUnbalancedAccounts() ? (
            <div className="alert-item">
              <div className="alert-header">
                <span className="item-name">Unbalanced Trial</span>
              </div>
              <div className="alert-details">
                <span>Total Debits:GHS {filteredData.reduce((sum, type) => sum + type.debit, 0).toFixed(2)}</span>
                <span>Total Credits:GHS {filteredData.reduce((sum, type) => sum + type.credit, 0).toFixed(2)}</span>
                <span>Difference: GHS {Math.abs(
                  filteredData.reduce((sum, type) => sum + type.debit, 0) -
                  filteredData.reduce((sum, type) => sum + type.credit, 0)
                ).toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <p className="no-alerts">Trial balance is balanced</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrialBalance;
