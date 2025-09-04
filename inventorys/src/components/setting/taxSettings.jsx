import { useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {faSearch,
  faFileExport,
  faEye,
  faPercent,
  faTimesCircle,
  faEdit
} from '@fortawesome/free-solid-svg-icons';
import {useNavigate} from 'react-router-dom';
import Select from 'react-select';
import api from '../api';
import enableKeyboardScrollFix from '../../utils/scroll';

const TaxMain = ({ business, user }) => {
    const [taxes, setTaxes] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [detail, setDetail] = useState({name: '', rate: 0, type: null, description:'' });
    const [editData, setEditData] = useState({ originalName: '', name: '', rate: 0, type: null, description:'' });
    const [errors, setErrors] = useState();
    const overlayRef = useRef(null);
    const editOverlayRef = useRef(null);

    const navigate = useNavigate();

    const handleSearch = (e) => {
        setSearchQuery(e.target.value.toLowerCase());
    };

    const filteredItems = taxes.filter(item =>
        item.name.toLowerCase().includes(searchQuery) ||
        item.value.toLowerCase().includes(searchQuery) ||
        item.description.toLowerCase().includes(searchQuery)
    );

    useEffect(() => {
        const fetchItems = async () => {
        try {
            const response = await api.post(
            'fetch_taxes',
            { business: business},
            );
            setTaxes(response);

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

    const openEdit = async (tax) => {
        try {
            const response = await api.post(
                'get_tax',
                { business, tax: tax},
            );
            setEditData({
                originalName: tax,
                name: response.name,
                rate: response.rate,
                type: response.type,
                description: response.description,
            });
            setShowEdit(true);
            document.addEventListener('mousedown', handleEditOverlay);
        } catch (error) {
            if (error.response?.status === 401) {
                navigate('/sign_in');
            }
        }
    };

    const addTax = async() => {
        if (!detail.name || detail.name === ''){
            setErrors('Name can not be empty');
            return;
        };

        if (!detail.type){
            setErrors('A type has to be selected');
            return;
        };

        if (detail.rate < 0.01){
            setErrors('Rate can not be less 0.01');
            return;
        };

        const data = {
            name: detail.name,
            rate: detail.rate,
            type: detail.type.value || '',
            description: detail.description,
        }

        try{
            const response = await api.post('add_tax', {business, detail:data});
            if (response === 'done'){
                setShowCreate(false);
                document.addEventListener('mousedown', handleCreateOverlay);

                const response = await api.post('fetch_taxes',{ business: business});
                setTaxes(response);
                };
        }catch{

        };
    };

    const editTax = async () => {
        if (!editData.name || editData.name === ''){
            setErrors('Name can not be empty');
            return;
        };

        if (!editData.type){
            setErrors('A type has to be selected');
            return;
        };

        if (editData.rate < 0.01){
            setErrors('Rate can not be less 0.01');
            return;
        };

        const data = {
            original: editData.originalName,
            name: editData.name,
            rate: editData.rate,
            type: editData.type.value || '',
            description: editData.description,
        }

        try{
            const response = await api.post('edit_tax', {business, detail:data});
            if (response === 'done'){
                setShowEdit(false);
                document.addEventListener('mousedown', handleEditOverlay);

                const response = await api.post('fetch_taxes',{ business: business});
                setTaxes(response);
                };
        }catch{

        };
    };

    return (
        <div className="journal-container">
            <div className="journal-header">
                <h1>
                    <FontAwesomeIcon icon={faPercent} className="header-icon" />
                    Taxes & Levies
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
                            Add Tax/Levy
                        </button>
                    </div>
                </div>
                <div className="filter-groups-right">
                    <div className="filter-group1">
                        <FontAwesomeIcon icon={faSearch} />
                        <input onChange={handleSearch} type="text" placeholder="Search taxes..." />
                    </div>
                </div>
                </div>

                <div className="items-table-box">
                <table className="items-table">
                    <thead className="table-header">
                        <tr>
                            <th>Edit</th>
                            <th>Name</th>
                            <th>Rate (%)</th>
                            <th>Type</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.map((tax, index) => (
                            <tr key={tax.name} id={`row-${index}`} className="table-row">
                            <td className="table-row">
                                <button className="action-button" onClick={() => openEdit(tax.name)}>
                                    <FontAwesomeIcon icon={faEdit} />
                                </button>
                            </td>
                            <td>{tax.name}</td>
                            <td>{tax.rate}</td>
                            <td>{tax.type}</td>
                            <td>{tax.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showCreate && (
                <div className="modal-overlay">
                    <div className="modal" ref={overlayRef}>
                        <div className="modal-header">
                            <h3>Create New Tax / Levy</h3>
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
                            id="loc-exist"
                            type="text"
                            value={detail.name}
                            className="ivi_input"
                            onChange={(e) => [setDetail({...detail, name: e.target.value}), setErrors('')]}
                          />
                          
                        </div>
                        <div className="form-group">
                          <label className="ivi_label">Rate</label>
                          <input
                            type="number"
                            value={detail.rate}
                            className="ivi_input"
                            min={0.01}
                            step={0.01}
                            onChange={(e) => [setDetail({...detail, rate: e.target.value}), setErrors('')]}
                          />
                          
                        </div>
                        <div className="month-selectors">
                            <label className="ivi_label">Type</label>
                            <Select
                                options={[{value:'Tax', label:'Tax'}, {value:'Levy', label:'Levy'}]}
                                className="month-select"
                                classNamePrefix="month-select"
                                value={detail.type}
                                onChange={selected => [setDetail({...detail, type: selected}), setErrors('')]}
                            /> 
                        </div>
                        <div className="form-group">
                          <label className="ivi_label">Description</label>
                          <input
                            type="email"
                            value={detail.description}
                            className="ivi_input"
                            onChange={(e) => setDetail({...detail, description: e.target.value})}
                          />
                          
                        </div>
                        <div>
                          <button className="btn btn-primary" onClick={addTax}>
                            Create Tax / Levy
                          </button>
                        </div>
            
                    </div>
                      
                </div>
            )}
            
            
            {showEdit && (
                <div className="modal-overlay">
                    <div className="modal" ref={editOverlayRef}>
                        <div className="modal-header">
                            <h3>Edit Tax / Levy</h3>
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
                          <label className="ivi_label">Rate</label>
                          <input
                            type="number"
                            value={editData.rate}
                            className="ivi_input"
                            min="0"
                            step="0.01"
                            onChange={(e) => [setEditData({...editData, rate: e.target.value}), setErrors('')]}
                          />
                        </div>
                        <div className="month-selectors">
                            <label className="ivi_label">Type</label>
                            <Select
                                options={[{value:'Tax', label:'Tax'}, {value:'Levy', label:'Levy'}]}
                                className="month-select"
                                classNamePrefix="month-select"
                                value={editData.type}
                                onChange={selected => [setEditData({...editData, type: selected}), setErrors('')]}
                            /> 
                        </div>
                        <div className="form-group">
                          <label className="ivi_label">Description</label>
                          <input
                            type="text"
                            value={editData.description}
                            className="ivi_input"
                            onChange={(e) => setEditData({...editData, description: e.target.value})}
                          />
                        </div>
                        <div>
                          <button className="btn btn-primary" onClick={editTax}>
                            Save Changes
                          </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
};

export default TaxMain;