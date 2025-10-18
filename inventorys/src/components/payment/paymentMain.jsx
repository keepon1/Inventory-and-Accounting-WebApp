import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileExport,
  faEye,
  faPaperPlane
} from '@fortawesome/free-solid-svg-icons';
import ViewPayment from './viewPayment';
import { Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import PaymentJournal from './addPayment';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const PaymentMain = ({ business, user, access }) => {
  const [payment, setPayment] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [waitTimeout, setWaitTimeout] = useState(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [parsed, setParsed] = useState('{}');
  const observer = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const expt = !(location.pathname.includes('/add') || location.pathname.includes('/view'));

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
    if (!startDate || !endDate) {
      setParsed('{}');
      return;
    }
    setPage(1);
    const s = format(startDate, "yyyy-MM-dd");
    const e = format(endDate, "yyyy-MM-dd");
    setParsed(JSON.stringify({ start: s, end: e }));
  }, [startDate, endDate]);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await api.post(
          'fetch_payments',
          {business, page, searchQuery, parsed, user},
        );
        if (response.status === 'success') {
          setPayment(prev => page === 1 ? response.data.payment : [...prev, ...response.data.payment]);
          setHasNext(response.data.has_more);
        }else{
          toast.error(response.message || 'Failed to fetch payments');
          return;
        }
      } catch (error) {
        toast.error('An error occurred while fetching payments'); 
        console.error('Fetch error:', error);
        
        if (error.response?.status === 401) {
          localStorage.removeItem('access');
          navigate('/sign_in');
        }
      }
    };

    fetchItems();
  }, [navigate, page, searchQuery, parsed]);

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
    if (payment.length >= 2) {
      const index = payment.length - 2;
      const row = document.getElementById(`row-${index}`);
      if (row) observeSecondLast(row);
    }
  }, [payment, observeSecondLast]);

  return (
    <div className="journal-container">
      <div className="journal-header">
        <h1>
          <FontAwesomeIcon icon={faPaperPlane} className="header-icon" />
          Payments
        </h1>
        {expt && (
        <div className="journal-controls">
          <button className="btn btn-outline">
            <FontAwesomeIcon icon={faFileExport} /> Export
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
                  <Link to="add" className="btn btn-outline">
                    Add Entries
                  </Link>
                )}
              </div>
                          
              <div className="ivi_display_box1">
                <div className="ivi_subboxes1">
                  <div className="ivi_holder_box1" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <DatePicker
                      selected={startDate}
                      onChange={(date) => setStartDate(date)}
                      selectsStart
                      startDate={startDate}
                      endDate={endDate}
                      placeholderText="Start date"
                      dateFormat="dd/MM/yyyy"
                      className="ivi_input"
                      isClearable
                    />
                  </div>
                </div>
                <div className="ivi_subboxes1">
                  <div className="ivi_holder_box1" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <DatePicker
                      selected={endDate}
                      onChange={(date) => setEndDate(date)}
                      selectsEnd
                      startDate={startDate}
                      endDate={endDate}
                      minDate={startDate}
                      placeholderText="End date"
                      dateFormat="dd/MM/yyyy"
                      className="ivi_input"
                      isClearable
                    />
                  </div>

                </div>
            
                <div className="ivi_subboxes1">
                  <div className="ivi_holder_box1">
                    <input 
                      onChange={handleSearch} 
                      className='ivi_input'
                      type="search"
                      value={searchInput}
                      placeholder="Search payments..."
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
                    <th>Date</th>
                    <th>Code</th>
                    <th>Transaction No</th>
                    <th>Description</th>
                    <th>Ref Type</th>
                    <th>Debit</th>
                    <th>Credit</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payment.map((entry, index) => (
                    <tr key={entry.code} id={`row-${index}`} className="table-row">
                      <td className="table-row">
                        <Link to={`view/${entry.code}`} className="action-button">
                          <FontAwesomeIcon icon={faEye} />
                        </Link>
                      </td>
                      <td>{format(new Date(entry.date), 'dd/MM/yyyy')}</td>
                      <td>{entry.code}</td>
                      <td>{entry.transaction_number}</td>
                      <td>{entry.description}</td>
                      <td>{entry.ref_type}</td>
                      <td>{entry.to_account}</td>
                      <td>{entry.from_account}</td>
                      <td>GHS {entry.amount}</td>
                      <td>{entry.is_reversed? 'Reversed' : 'Completed'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        }/>
        <Route path="add" element={<PaymentJournal business={business} user={user} access={access} />} />
        <Route path="view/:paymentNumber" element={<ViewPaymentWrapper business={business} user={user} access={access} />} />
      </Routes>
    </div>
  );
};

const ViewPaymentWrapper = ({business, user, access}) => {
  const { paymentNumber } = useParams();
  return <ViewPayment payments={paymentNumber} business={business} user={user} access={access}/>;
};

export default PaymentMain;
