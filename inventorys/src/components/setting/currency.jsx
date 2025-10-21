import { useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faDollarSign,
  faTimesCircle,
  faEdit,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import {Link, useNavigate} from 'react-router-dom';
import api from '../api';
import { toast } from 'react-toastify';
import { set } from 'date-fns';

const CurrencyMain = ({ business, user }) => {
    const [currencies, setCurrencies] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [detail, setDetail] = useState({name: '', symbol: '', rate:0});
    const [editData, setEditData] = useState({ originalName: '', name: '', symbol: '', rate:0});
    const [errors, setErrors] = useState();
    const [loading, setLoading] = useState(false);
    const overlayRef = useRef(null);
    const editOverlayRef = useRef(null);

    const navigate = useNavigate();

    const handleSearch = (e) => {
        setSearchQuery(e.target.value.toLowerCase());
    };

    const filteredItems = currencies.filter(item =>
        item.name.toLowerCase().includes(searchQuery) ||
        item.symbol.toLowerCase().includes(searchQuery)
    );

    useEffect(() => {
        const fetchItems = async () => {
        try {
            const response = await api.post(
            'fetch_currencies',
            { business, user },
            );

            if (response.status === 'error') {
                toast.error(response.message || 'An error occurred while fetching currencies.');
                return;
            }

            setCurrencies(response.data || []);

        } catch (error) {
            toast.error('An error occurred while fetching currencies.');
            console.error('Error fetching currencies:', error);

            if (error.response?.status === 401) {
            localStorage.removeItem('access');
            navigate('/sign_in');
            }
        }
        };

        fetchItems();
    }, []);

    const handleCreateOverlay = (e) => {
        if (overlayRef.current && !overlayRef.current.contains(e.target)) {
        setShowCreate(false);
        }
    };

    const handleEditOverlay = (e) => {
        if (editOverlayRef.current && !editOverlayRef.current.contains(e.target)) {
        setShowEdit(false);
        }
    };

    const openEdit = async (currency) => {
        try {
            setEditData({
                originalName: currency.name,
                name: currency.name,
                symbol: currency.symbol,
                rate:currency.rate,
            });
            setShowEdit(true);
            document.addEventListener('mousedown', handleEditOverlay);
        } catch (error) {
            if (error.response?.status === 401) {
                navigate('/sign_in');
            }
        }
    };

    const addCurrency = async() => {
        if (loading) {
            toast.info('Please wait...');
            return;
        };

        if (!detail.name || detail.name === ''){
            toast.info('Name can not be empty');
            return;
        };

        if (!detail.symbol || detail.symbol === ''){
            toast.info('Symbol can not be empty');
            return;
        };

        const data = {
            name: detail.name,
            symbol: detail.symbol,
            rate: detail.rate,
        }

        try{
            setLoading(true);
            const response = await api.post('add_currency', {business, detail:data, user});

            if (response.status === 'success'){
                toast.success(response.message || 'Currency added successfully');

                setShowCreate(false);
                document.addEventListener('mousedown', handleCreateOverlay);

                setDetail({ name: '', symbol: '', rate:0});

                const update = await api.post('fetch_currencies',{ business, user});

                if (update.status === 'error') {
                    toast.error(update.message || 'An error occurred while fetching currencies.');
                    return;
                }
                setCurrencies(update.data || []);
                setLoading(false);
            }else{
                toast.error(response.message || 'An error occurred while adding the currency.');
            };
        }catch{

        };
    };

    const editCurrency = async () => {
        if (loading) {
            toast.info('Please wait...');
            return;
        };

        if (!editData.name || editData.name === ''){
            toast.info('Name can not be empty');
            return;
        };

        if (!editData.symbol || editData.symbol === ''){
            toast.info('Symbol can not be empty');
            return;
        };

        const data = {
            original: editData.originalName,
            name: editData.name,
            symbol: editData.symbol,
            rate: editData.rate,
        }

        try{
            setLoading(true);
            const response = await api.post('edit_currency', {business, detail:data, user});

            if (response.status === 'success'){
                toast.success(response.message || 'Currency edited successfully');
                setLoading(false);
                setShowEdit(false);
                document.addEventListener('mousedown', handleEditOverlay);

                setEditData({ originalName: '', name: '', symbol: '', rate:0});

                const update = await api.post('fetch_currencies', { business, user});
                
                if (update.status === 'error') {
                    toast.error(update.message || 'An error occurred while fetching currencies.');
                    return;
                }
                setCurrencies(update.data || []);
            }else{
                toast.error(response.message || 'An error occurred while editing the currency.');
                setLoading(false);
            };
        }catch(error){
            console.error('Error editing currency:', error);
            toast.error('An error occurred while editing the currency.');
            setLoading(false);
            if (error.response?.status === 401) {
                navigate('/sign_in');
            }
        };
    };

    const deleteCurrency = async () => {
        if (loading) {
            toast.info('Please wait... deletion in progress');
            return;
        };

        try{
            setLoading(true);
            const response = await api.post('delete_currency', {currency: editData.originalName});

            if (response.status === 'success'){
                toast.success(response.message || 'Currency deleted successfully');
                setLoading(false);
                setShowEdit(false);
                document.addEventListener('mousedown', handleEditOverlay);

                setEditData({ originalName: '', name: '', symbol: '', rate:0});

                const update = await api.post('fetch_currencies', { business, user});

                if (update.status === 'error') {
                    toast.error(update.message || 'An error occurred while fetching currencies.');
                    return;
                }
                setCurrencies(update.data || []);
            }else{
                toast.error(response.message || 'An error occurred while deleting the currency.');
                setLoading(false);
            };
        }catch(error){
            console.error('Error deleting currency:', error);
            toast.error('An error occurred while deleting the currency.');
            setLoading(false);
            if (error.response?.status === 401) {
                navigate('/sign_in');
            }
        };
    };

    return (
        <div className="journal-container">
            <div className="journal-header">
                <div className='header-back'>
                    <Link to="../" className='back-link'>
                        <FontAwesomeIcon icon={faArrowLeft} className='back-icon'/>
                    </Link>
                    <h1>
                        Currencies
                    </h1>
                </div>
            </div>

            <div className="journal-filters">
                <div className="filter-groups-left">
                    <div>
                        <button className="btn btn-outline" onClick={() => {
                            setShowCreate(true);
                            document.addEventListener('mousedown', handleCreateOverlay);
                        }}>
                            Add Currency
                        </button>
                    </div>
                </div>
                <div className="ivi_display_box1">
                    <div className="ivi_subboxes1">
                        <div className="ivi_holder_box1">
                            <input onChange={handleSearch} className='ivi_input' type="text" placeholder="Search currencies..." />
                        </div>
                    </div>
                </div>
            </div>

            <div className="items-table-box">
                <table className="items-table">
                    <thead className="table-header">
                        <tr>
                            <th>Edit</th>
                            <th>Name</th>
                            <th>Symbol</th>
                            <th>Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.map((currency, index) => (
                            <tr key={currency.name} id={`row-${index}`} className="table-row">
                                <td className="table-row">
                                    <button className="action-button" onClick={() => openEdit(currency)}>
                                        <FontAwesomeIcon icon={faEdit} />
                                    </button>
                                </td>
                                <td>{currency.name}</td>
                                <td>{currency.symbol}</td>
                                <td>{currency.rate}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showCreate && (
                <div className="modal-overlay">
                    <div className="modal" ref={overlayRef}>
                        <div className="modal-header">
                            <h3>Create New Currency</h3>
                            <button 
                              className="modal-close"
                              onClick={() => setShowCreate(false)}
                            >
                              <FontAwesomeIcon icon={faTimesCircle} />
                            </button>
                        </div>
                        {errors && <div className="error-message">{errors}</div>}
                        <div className="form-group">
                          <label className="ivi_label">Name</label>
                          <input
                            type="text"
                            value={detail.name}
                            className="ivi_input"
                            onChange={(e) => [setDetail({...detail, name: e.target.value}), setErrors('')]}
                          />
                        </div>
                        <div className="form-group">
                          <label className="ivi_label">Symbol</label>
                          <input
                            type="text"
                            value={detail.symbol}
                            className="ivi_input"
                            placeholder='GHS ₵'
                            onChange={(e) => [setDetail({...detail, symbol: e.target.value}), setErrors('')]}
                          />
                        </div>
                        <div className="form-group">
                          <label className="ivi_label">Rate</label>
                          <input
                            type="number"
                            value={detail.rate}
                            className="ivi_input"
                            min={0.00}
                            step={0.01}
                            onChange={(e) => setDetail({...detail, rate: e.target.value})}
                          />
                        </div>
                        <div>
                          <button className="btn btn-outline" onClick={addCurrency}>
                            Create Currency
                          </button>
                        </div>
                    </div>
                </div>
            )}
            
            {showEdit && (
                <div className="modal-overlay">
                    <div className="modal" ref={editOverlayRef}>
                        <div className="modal-header">
                            <h3>Edit Currency</h3>
                            <button 
                              className="modal-close"
                              onClick={() => setShowEdit(false)}
                            >
                              <FontAwesomeIcon icon={faTimesCircle} />
                            </button>
                        </div>
                        {errors && <div className="error-message">{errors}</div>}
                        <div className="form-group">
                          <label className="ivi_label">Name</label>
                          <input
                            type="text"
                            value={editData.name}
                            className="ivi_input"
                            onChange={(e) => [setEditData({...editData, name: e.target.value}), setErrors('')]}
                          />
                        </div>
                        <div className="form-group">
                          <label className="ivi_label">Symbol</label>
                          <input
                            type="text"
                            value={editData.symbol}
                            className="ivi_input"
                            onChange={(e) => [setEditData({...editData, symbol: e.target.value}), setErrors('')]}
                          />
                        </div>
                        <div className="form-group">
                          <label className="ivi_label">Rate</label>
                          <input
                            type="text"
                            value={editData.rate}
                            className="ivi_input"
                            min={0.00}
                            step={0.01}
                            onChange={(e) => setEditData({...editData, rate: e.target.value})}
                          />
                        </div>
                        <div style={{display: 'flex', gap: '10px'}}>
                          <button className="btn btn-outline" onClick={editCurrency}>
                            Save Changes
                          </button>

                            <button className='btn btn-outline-red' onClick={deleteCurrency}>
                                Delete Currency
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
};

export default CurrencyMain;