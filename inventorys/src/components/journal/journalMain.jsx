import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBookOpen, faBox, faShoppingCart,
  faFileExport, faUndo,
  faEye
} from '@fortawesome/free-solid-svg-icons';
import ViewJournal from './viewJournal';
import './journalMain.css';
import { Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import GeneralJournal from './addJournal';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { handleDateSearch, isCompleteInput } from '../../utils/dateformat';

const JournalMain = ({ business, user, access }) => {
  const [journal, setJournal] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [waitTimeout, setWaitTimeout] = useState(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [searchDateInput, setSearchDateInput] = useState('');
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
    const trimmed = searchDateInput.trim();
        
    if (!trimmed) {
      setParsed('{}');
      return;
    }
        
    if (isCompleteInput(trimmed)) {
      try {
        setPage(1);
        const result = handleDateSearch(trimmed);
        setParsed(JSON.stringify(result));
      } catch (err) {
        setParsed('{}');
      }
    }
  }, [searchDateInput]);

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
                  <div className="ivi_holder_box1">
                    <input 
                      type="search"
                      className="ivi_input"
                      placeholder="date e.g.p1 or p1...p3 or 01/01/2025"
                      value={searchDateInput}
                      onChange={e => setSearchDateInput(e.target.value)}
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
                      <td>{format(entry.date, 'dd/MM/yyy')}</td>
                      <td>{entry.code}</td>
                      <td>
                        <span className={`entry-type ${entry.entry_type.toLowerCase()}`}>
                          <FontAwesomeIcon icon={
                            entry.entry_type === 'Sale' ? faShoppingCart :
                            entry.entry_type === 'Reversal' ? faUndo :
                            faBox
                          } />
                          {entry.entry_type}
                        </span>
                      </td>
                      <td>{entry.transaction_number}</td>
                      <td>{entry.description}</td>
                      <td>{entry.created_by__user_name}</td>
                      <td>{entry.amount}</td>
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
