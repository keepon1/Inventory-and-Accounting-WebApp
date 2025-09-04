import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBook, faSearch,
  faFileExport, faChevronDown, faChevronRight,
  faTimesCircle,
} from '@fortawesome/free-solid-svg-icons';
import './coaMain.css';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { Link } from 'react-router-dom';
import api from '../api';
import enableKeyboardScrollFix from '../../utils/scroll';

const AccountMain = ({ business, user, access }) => {
  const [accountsData, setAccountsData] = useState([]);
  const [detail, setDetail] = useState({account:{value:'', label:''}, sub:null, real:'', description:''});
  const [showCreate, setShowCreate] = useState(false);
  const [formError, setFormError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAccounts, setExpandedAccounts] = useState({});
  const overlayRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.post('fetch_coa', {business, user});
        
        setAccountsData(response);
      } catch (error) {
        console.error("Error fetching chart of accounts:", error);
      }
    };
    fetchData();
    const cleanup = enableKeyboardScrollFix();
    return cleanup;
  }, [business]);

  const handleCreateOverlay = (e) => {
    if (overlayRef.current && !overlayRef.current.contains(e.target)) {
      setShowCreate(false);
    }
  };

  const formatAmount = (amount) => parseFloat(amount || 0).toFixed(2);

  const toggleAccountExpansion = (accountCode) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [accountCode]: !prev[accountCode]
    }));
  };

  const getAllAccounts = () => {
    const allAccounts = [];
    accountsData.forEach(parent => {
      allAccounts.push({
        value: parent.code,
        label: `${parent.code} - ${parent.name}`,
        level: 'parent'
      });
      
      if (parent.subs) {
        parent.subs.forEach(sub => {
          allAccounts.push({
            value: sub.code,
            label: `${sub.code} - ${sub.name}`,
            level: 'sub',
            parentCode: parent.code
          });
        });
      }
    });
    return allAccounts;
  };

  const getSubAccounts = (parentCode) => {
    const parent = accountsData.find(acc => acc.code == parentCode);
    if (!parent || !parent.subs) return [];
    
    return parent.subs.map(sub => ({
      value: sub.name,
      label: `${sub.code} - ${sub.name}`
    }));
  };

  const filteredAccounts = accountsData.filter(account =>
    account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.code.toString().includes(searchQuery) ||
    (account.subs && account.subs.some(sub =>
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.code.toString().includes(searchQuery) ||
      (sub.accounts && sub.accounts.some(acc =>
        acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.code.toString().includes(searchQuery)
      ))
    ))
  );

  const addAccount = async() => {
    if (!detail.account){
      setFormError('Account is required');
      return;
    }

    if (!detail.sub){
      setFormError('Sub Account is required');
      return;
    }

    if (detail.real === ''){
      setFormError('Real Account is required');
      return;
    }

    const data = {
      business,
      user,
      account: detail.account.value || '',
      sub: detail.sub.value || '',
      real: detail.real || '',
      description: detail.description || '',
    }

    try{
      const response = await api.post('create_account', data);
      console.log(response)
      if (response === 'done'){
        setShowCreate(false);
        setDetail({account:{value:'', label:''}, sub:null, real:'', description:''});

        const refreshResponse = await api.post('fetch_coa', { business, user });
        setAccountsData(refreshResponse || []);
      }
    } catch(error) {
      console.error("Error creating account:", error);
    }
  };

  return (
    <div className="journal-container">
      <div className="ledger-header">
        <h1><FontAwesomeIcon icon={faBook} className="header-icon" /> Chart of Accounts</h1>
        <div className="ledger-controls">
          <button className="btn btn-outline"><FontAwesomeIcon icon={faFileExport} /> Export</button>
        </div>
      </div>

      <div className="journal-filters">
        <div className="create_access">
        {(access.create_access || access.admin) && (
          <button className="btn btn-outline" onClick={() => {
            setShowCreate(true);
            document.addEventListener('mousedown', handleCreateOverlay);
          }}>
            Add Account
          </button>
        )}
        </div>

        <div className="ivi_display_box1">
          <div className="ivi_subboxes1">
            <div className="ivi_holder_box1">
              <input
                type="text"
                placeholder="Search accounts..."
                className='ivi_input'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="items-table-box">
        <table className="items-table">
          <thead className="table-header">
            <tr>
              <th style={{width: '20%'}}>Code</th>
              <th style={{width: '40%'}}>Name</th>
              <th className="text-right" style={{width: '15%'}}>Balance</th>
              <th style={{width: '5%'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.map(account => (
              <React.Fragment key={account.code}>
                <tr className="account-row parent-row">
                  <td>
                    <span 
                      className="expand-toggle"
                      onClick={() => toggleAccountExpansion(account.code)}
                    >
                      <FontAwesomeIcon 
                        icon={expandedAccounts[account.code] ? faChevronDown : faChevronRight} 
                      />
                    </span>
                    {account.code}
                  </td>
                  <td>{account.name}</td>
                  <td className="text-right">{formatAmount(account.total)}</td>
                  <td>
                    <button 
                      className="btn-icon"
                      onClick={() => toggleAccountExpansion(account.code)}
                    >
                      {expandedAccounts[account.code] ? 'Collapse' : 'Expand'}
                    </button>
                  </td>
                </tr>
                
                {expandedAccounts[account.code] && account.subs && account.subs.map(sub => (
                  <React.Fragment key={sub.code}>
                    <tr className="sub-account-row">
                      <td>
                        <span className="indent"></span>
                        {sub.code}
                      </td>
                      <td>{sub.name}</td>
                      <td className="text-right">{formatAmount(sub.total)}</td>
                      <td></td>
                    </tr>
                    
                    {sub.accounts && sub.accounts.map(real => (
                      <tr key={real.code} className="real-account-row">
                        <td>
                          <span className="indent-double"></span>
                          {real.code}
                        </td>
                        <td>{real.name}</td>
                        <td className="text-right">{formatAmount(real.balance)}</td>
                        <td></td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="modal-overlay">
          <div className="modal" ref={overlayRef}>
            <div className="modal-header">
              <h3>Create New Account</h3>
              <button 
                className="modal-close"
                onClick={() => setShowCreate(false)}
              >
                <FontAwesomeIcon icon={faTimesCircle} />
              </button>
            </div>
            {formError && <div className="error-message">{formError}</div>}
            <div className="month-selectors">
              <label>Parent Account</label>
              <Select 
                options={getAllAccounts().filter(acc => acc.level === 'parent')}
                value={detail.account}
                onChange={(e) => setDetail({...detail, account:e})}
                className="month-select"
                classNamePrefix="month-select"
                required
              />       
            </div>
            <div className="month-selectors">
              <label>Sub Account</label>
              <CreatableSelect
                options={getSubAccounts(detail.account.value)}
                value={detail.sub}
                onChange={(e) => setDetail({...detail, sub:e})}
                className="month-select"
                classNamePrefix="month-select"
                required
              />
            </div>
            <div className="form-group">
              <label>Account Name</label>
              <input
                type="text"
                value={detail.real}
                onChange={(e) => setDetail({...detail, real:e.target.value})}
                className="ivi_input"
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={detail.description}
                onChange={(e) => setDetail({...detail, description:e.target.value})}
                className="ivi_input"
                required
              />       
            </div>
            <div className="form-note">
              <span className="error-message">Note: you can't revert when created</span>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={addAccount}>
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountMain;