import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBookOpen, faBox, faShoppingCart,
  faFileExport, faUndo,
  faEye,
  faReceipt,
  faPaperPlane,
  faDiamond
} from '@fortawesome/free-solid-svg-icons';
import ViewJournal from './viewJournal';
import './journalMain.css';
import { Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import GeneralJournal from './addJournal';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const JournalMain = ({ business, user, access }) => {
  const [journal, setJournal] = useState([]);
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
          'fetch_journals',
          {business, page, searchQuery, parsed, user},
        );

        if (response.status == 'success') {
          setJournal(prev => page === 1 ? response.data.journals : [...prev, ...response.data.journals]);
          setHasNext(response.data.has_more);
        }else{
          toast.error(response.message || 'Failed to fetch journals');
          return;
        }
      } catch (error) {
        console.error('Error fetching journals:', error);
        toast.error('An error occurred while fetching journals');
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
    if (journal.length >= 2) {
      const index = journal.length - 2;
      const row = document.getElementById(`row-${index}`);
      if (row) observeSecondLast(row);
    }
  }, [journal, observeSecondLast]);

  return (
    <div className="journal-container">
      <div className="journal-header">
        <h1>
          <FontAwesomeIcon icon={faBookOpen} className="header-icon"/>Journal
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
                      placeholder="Search journals..."
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
                    <th>Entry Type</th>
                    <th>Transaction No</th>
                    <th>Description</th>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {journal.map((entry, index) => (
                    <tr key={entry.code} id={`row-${index}`} className="table-row">
                      <td className="table-row">
                        <Link to={`view/${entry.code}`} className="action-button">
                          <FontAwesomeIcon icon={faEye} />
                        </Link>
                      </td>
                      <td>{format(new Date(entry.date), 'dd/MM/yyyy')}</td>
                      <td>{entry.code}</td>
                      <td>
                        <span className={`entry-type ${entry.entry_type.toLowerCase()}`}>
                          <FontAwesomeIcon icon={
                            entry.entry_type === 'Sale' ? faShoppingCart :
                            entry.entry_type === 'Purchase' ? faBox :
                            entry.entry_type === 'Payment' ? faPaperPlane :
                            entry.entry_type === 'Cash Receipt' ? faReceipt :
                            entry.entry_type === 'Manuel Entry' ? faDiamond :
                            faBox
                          } />
                          {entry.entry_type}
                        </span>
                      </td>
                      <td>{entry.transaction_number}</td>
                      <td>{entry.description}</td>
                      <td>{entry.created_by__user_name}</td>
                      <td>GHS {entry.amount}</td>
                      <td>{entry.reversed? 'Reversed' : 'Completed'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        }/>
        <Route path="add" element={<GeneralJournal business={business} user={user} access={access} />} />
        <Route path="view/:journalNumber" element={<ViewJournalWrapper business={business} user={user} access={access}/>} />
      </Routes>
    </div>
  );
};

const ViewJournalWrapper = ({business, user, access}) => {
  const { journalNumber } = useParams();
  return <ViewJournal journals={journalNumber} business={business} user={user} access={access} />;
};

export default JournalMain;
