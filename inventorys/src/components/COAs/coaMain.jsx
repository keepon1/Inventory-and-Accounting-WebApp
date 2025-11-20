import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBook,
  faChevronDown, faChevronRight,
  faTimesCircle,
  faShareFromSquare
} from '@fortawesome/free-solid-svg-icons';
import './coaMain.css';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { Link, Route, Routes, useParams } from 'react-router-dom';
import api from '../api';
import { toast } from 'react-toastify';
import AccountHistory from './coaHistory';
import AccessDenied from '../access';
import { set } from 'date-fns';

const AccountMain = ({ business, user, access }) => {
  const [accountsData, setAccountsData] = useState([]);
  const [detail, setDetail] = useState({account:{value:'', label:''}, sub:null, real:'', description:''});
  const [showCreate, setShowCreate] = useState(false);
  const [formError, setFormError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAccounts, setExpandedAccounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');
  const overlayRef = useRef(null);
  const exportOverlayRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.post('fetch_coa', {business, user});
        
        if (response.status === 'error') {
          toast.error(response.message || "Failed to fetch chart of accounts");
          return;
        }
        setAccountsData(response);
      } catch (error) {
        toast.error("Failed to fetch chart of accounts");
        console.error("Error fetching chart of accounts:", error);
      }
    };
    fetchData();
  }, [business]);

  const handleCreateOverlay = (e) => {
    if (overlayRef.current && !overlayRef.current.contains(e.target)) {
      setShowCreate(false);
    }
  };

  const handleExportOverlayClick = (event) => {
    if (exportOverlayRef.current && !exportOverlayRef.current.contains(event.target)) {
      setExporting(false);
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
      toast.info('Account is required');
      return;
    }

    if (!detail.sub){
      toast.info('Sub Account is required');
      return;
    }

    if (detail.real === ''){
      toast.info('Real Account is required');
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

    if (loading){
      toast.info('Please wait, creating account');
      return;
    }

    try{
      setLoading(true);
      const response = await api.post('create_account', data);
      
      if (response.status === 'success'){
        toast.success(response.message || 'Account created successfully');
        setShowCreate(false);
        setDetail({account:{value:'', label:''}, sub:null, real:'', description:''});

        const refreshResponse = await api.post('fetch_coa', { business, user });
        setAccountsData(refreshResponse || []);
      }else{
        toast.error(response.message || 'Failed to create account');
        setLoading(false);
        return;
      }
    } catch(error) {
      setLoading(false);
      toast.error("Failed to create account");
      console.error("Error creating account:", error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.post("fetch_coa", {
        business,
        user,
        searchQuery,
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
        toast.error(response.message || "Failed to export chart of accounts");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        navigate("/sign_in");
      } else {
        toast.error("Unexpected error while exporting chart of accounts");
      }
    }
  };

  const excpts = !(window.location.pathname.includes('history'));

  return (
    <div className="journal-container">
      <div className="journal-header">
        <h1><FontAwesomeIcon icon={faBook} className="header-icon" /> Chart of Accounts</h1>
        
        {excpts && (
          <div className="journal-controls">
            <button className="share-icon" onClick={() => {
              setExporting(true);
              document.addEventListener('mousedown', handleExportOverlayClick);
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
                    <th style={{width: '25%'}}>Name</th>
                    <th style={{width: '20%'}} className="text-right">Debit</th>
                    <th style={{width: '20%'}} className="text-right">Credit</th>
                    <th className="text-right" style={{width: '20%'}}>Balance</th>
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
                        <td className="text-right"><Link to={`history/${account.code} - ${account.name}`} className="transaction-link">GHS {formatAmount(account.total_debit)}</Link></td>
                        <td className="text-right"><Link to={`history/${account.code} - ${account.name}`} className="transaction-link">GHS {formatAmount(account.total_credit)}</Link></td>
                        <td className="text-right"><Link to={`history/${account.code} - ${account.name}`} className="transaction-link">GHS {formatAmount(account.balance)}</Link></td>
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
                            <td className="text-right"><Link to={`history/${sub.code} - ${sub.name}`} className="transaction-link">GHS {formatAmount(sub.total_debit)}</Link></td>
                            <td className="text-right"><Link to={`history/${sub.code} - ${sub.name}`} className="transaction-link">GHS {formatAmount(sub.total_credit)}</Link></td>
                            <td className="text-right"><Link to={`history/${sub.code} - ${sub.name}`} className="transaction-link">GHS {formatAmount(sub.balance)}</Link></td>
                            <td></td>
                          </tr>
                          
                          {sub.accounts && sub.accounts.map(real => (
                            <tr key={real.code} >
                              <td>
                                <span className="indent-double"></span>
                                {real.code}
                              </td>
                              <td>{real.name}</td>
                              <td className="text-right"><Link to={`history/${real.code} - ${real.name}`} className="transaction-link">GHS {formatAmount(real.debit)}</Link></td>
                              <td className="text-right"><Link to={`history/${real.code} - ${real.name}`} className="transaction-link">GHS {formatAmount(real.credit)}</Link></td>
                              <td className="text-right"><Link to={`history/${real.code} - ${real.name}`} className="transaction-link">GHS {formatAmount(real.balance)}</Link></td>
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

            {exporting && (
              <div className="modal-overlay">
                <div className="modal" ref={exportOverlayRef}>
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
        <Route path="history/:accountCode" element={<AccountHistoryWrapper business={business} user={user} access={access} />} />
        <Route path="*" element={<AccessDenied />} />
      </Routes>

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

const AccountHistoryWrapper = ({ business, user, access }) => {
  const { accountCode } = useParams();
  return <AccountHistory accountCode={accountCode} business={business} user={user} access={access} />;
};

export default AccountMain;