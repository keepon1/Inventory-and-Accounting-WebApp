import { useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faDollarSign,
  faTimesCircle,
  faEdit
} from '@fortawesome/free-solid-svg-icons';
import {useNavigate} from 'react-router-dom';
import api from '../api';
import enableKeyboardScrollFix from '../../utils/scroll';

const CurrencyMain = ({ business, user }) => {
    const [currencies, setCurrencies] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [detail, setDetail] = useState({name: '', symbol: '', rate:0});
    const [editData, setEditData] = useState({ originalName: '', name: '', symbol: '', rate:0});
    const [errors, setErrors] = useState();
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
            { business: business},
            );
            setCurrencies(response);

        } catch (error) {
            if (error.response?.status === 401) {
            localStorage.removeItem('access');
            navigate('/sign_in');
            }
        }
        };

        fetchItems();
        const cleanup = enableKeyboardScrollFix();
        return cleanup;
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
            const response = await api.post(
                'get_currency',
                { business, currency: currency},
            );
            setEditData({
                originalName: currency,
                name: response.name,
                symbol: response.symbol,
                rate:response.rate,
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
        if (!detail.name || detail.name === ''){
            setErrors('Name can not be empty');
            return;
        };

        if (!detail.symbol || detail.symbol === ''){
            setErrors('Symbol can not be empty');
            return;
        };

        const data = {
            name: detail.name,
            symbol: detail.symbol,
            rate: detail.rate,
        }

        try{
            const response = await api.post('add_currency', {business, detail:data});
            if (response === 'done'){
                setShowCreate(false);
                document.addEventListener('mousedown', handleCreateOverlay);

                const response = await api.post('fetch_currencies',{ business: business});
                setCurrencies(response);
                };
        }catch{

        };
    };

    const editCurrency = async () => {
        if (!editData.name || editData.name === ''){
            setErrors('Name can not be empty');
            return;
        };

        if (!editData.symbol || editData.symbol === ''){
            setErrors('Symbol can not be empty');
            return;
        };

        const data = {
            original: editData.originalName,
            name: editData.name,
            symbol: editData.symbol,
            rate: editData.rate,
        }

        try{
            const response = await api.post('edit_currency', {business, detail:data});
            if (response === 'done'){
                setShowEdit(false);
                document.addEventListener('mousedown', handleEditOverlay);

                const response = await api.post('fetch_currencies',{ business: business});
                setCurrencies(response);
                };
        }catch{

        };
    };

    return (
        <div className="journal-container">
            <div className="journal-header">
                <h1>
                    <FontAwesomeIcon icon={faDollarSign} className="header-icon" />
                    Currencies
                </h1>
                <div className="journal-controls">
                    <FontAwesomeIcon 
                        icon={faTimesCircle} 
                        className="close-button"
                        onClick={() => navigate(-1)}
                    />
                </div>
            </div>

            <div className="journal-filters">
                <div className="filter-groups-left">
                    <div>
                        <button className="add-item-button" onClick={() => {
                            setShowCreate(true);
                            document.addEventListener('mousedown', handleCreateOverlay);
                        }}>
                            Add Currency
                        </button>
                    </div>
                </div>
                <div className="filter-groups-right">
                    <div className="filter-group1">
                        <FontAwesomeIcon icon={faSearch} />
                        <input onChange={handleSearch} type="text" placeholder="Search currencies..." />
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
                                    <button className="action-button" onClick={() => openEdit(currency.name)}>
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
                          <button className="btn btn-primary" onClick={addCurrency}>
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
                        <div>
                          <button className="btn btn-primary" onClick={editCurrency}>
                            Save Changes
                          </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
};

export default CurrencyMain;