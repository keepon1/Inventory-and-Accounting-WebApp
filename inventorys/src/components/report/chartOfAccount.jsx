import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDollarSign,
  faChartPie,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import api from '../api';
import './itemSummary.css';
import { Link } from 'react-router-dom';
import { format, set } from 'date-fns';
import AccessDenied from '../access';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const ChartOfAccounts = ({ business, user }) => {
  const [accounts, setAccounts] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [accountType, setAccountType] = useState('all');
  const [activeChart, setActiveChart] = useState('balance');
  const [hasAccess, setHasAccess] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const accountsRes = await api.post('fetch_chart_of_accounts', { business });

        if (accountsRes === 'no access') {
          setHasAccess(false);
          return;
        }
        setAccounts(accountsRes);
        setFilteredAccounts(accountsRes);
      } catch (error) {
        console.error('Error fetching accounts:', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let result = accounts;
    
    if (searchQuery) {
      result = result.filter(account =>
        account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (accountType !== 'all') {
      result = result.filter(account => account.type === accountType);
    }
    
    setFilteredAccounts(result);
  }, [accounts, searchQuery, accountType]);

  const getBalanceData = () => {
    return filteredAccounts
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
      .slice(0, 10)
      .map(account => ({
        name: account.name,
        balance: account.balance,
        type: account.type
      }));
  };

  const getTypeDistributionData = () => {
    const typeMap = {};
    filteredAccounts.forEach(account => {
      if (!typeMap[account.type]) {
        typeMap[account.type] = 0;
      }
      typeMap[account.type] += Math.abs(account.balance);
    });
    
    return Object.entries(typeMap).map(([name, value]) => ({ name, value }));
  };

  const renderChart = () => {
    switch (activeChart) {
      case 'balance':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getBalanceData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="balance" name="Balance" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'types':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={getTypeDistributionData()}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {getTypeDistributionData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  if (!hasAccess) {
    return <AccessDenied />;
  }

  return (
    <div className="dashboard-main">
      <div className="journal-header">
        <div className='header-back'>
          <Link to="../" className='back-link'>
            <FontAwesomeIcon icon={faArrowLeft} className='back-icon' />
          </Link>
          <h2>
            Chart of Accounts
          </h2>
        </div>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <input
            className='ivi_input'
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <Select 
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'asset', label: 'Assets' },
              { value: 'liability', label: 'Liabilities' },
              { value: 'equity', label: 'Equity' },
              { value: 'revenue', label: 'Revenue' },
              { value: 'expense', label: 'Expenses' }
            ]}
            onChange={e => setAccountType(e.value)}
            className="ivi_select"
            classNamePrefix="ivi_select"
            placeholder="Account Type"
          />
        </div>
      </div>

      <div className="chart-selector">
        <button 
          className={`chart-btn ${activeChart === 'balance' ? 'active' : ''}`}
          onClick={() => setActiveChart('balance')}
        >
          <FontAwesomeIcon icon={faDollarSign} /> Account Balances
        </button>
        <button 
          className={`chart-btn ${activeChart === 'types' ? 'active' : ''}`}
          onClick={() => setActiveChart('types')}
        >
          <FontAwesomeIcon icon={faChartPie} /> Type Distribution
        </button>
      </div>

      <div className="chart-container">
        {renderChart()}
      </div>

      <div className="stock-table">
        <h3>Accounts ({filteredAccounts.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Account</th>
              <th>Type</th>
              <th>Balance</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.map(account => (
              <tr key={account.code}>
                <td>{account.code}</td>
                <td>{account.name}</td>
                <td>{account.type}</td>
                <td className={account.balance >= 0 ? 'positive' : 'negative'}>
                  GHS {Math.abs(account.balance).toFixed(2)}
                </td>
                <td>{account.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ChartOfAccounts;