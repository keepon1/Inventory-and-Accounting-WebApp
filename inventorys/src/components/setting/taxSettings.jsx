import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimesCircle,
  faEdit,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import {Link, useNavigate} from 'react-router-dom';
import Select from 'react-select';
import api from '../api';
import enableKeyboardScrollFix from '../../utils/scroll';
import { toast } from 'react-toastify';

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
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleSearch = (e) => {
        setSearchQuery(e.target.value.toLowerCase());
    };

    const filteredItems = taxes.filter(item =>
        item.name.toLowerCase().includes(searchQuery) ||
        item.type.toLowerCase().includes(searchQuery) ||
        item.rate.toString().toLowerCase().includes(searchQuery) ||
        item.description.toLowerCase().includes(searchQuery)
    );

    useEffect(() => {
        const fetchItems = async () => {
        try {
            const response = await api.post(
            'fetch_taxes',
            { business, user},
            );

            if (response.status === 'error'){
                toast.error(response.message || 'Error occurred while fetching data');
                return;
            }
            setTaxes(response.data || []);

        } catch (error) {
            toast.error('Error occurred while fetching data');
            console.error('Error fetching items:', error);
            if (error.response?.status === 401) {
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

    const openEdit = async (tax) => {
        try {
            setEditData({
                originalName: tax.name,
                name: tax.name,
                rate: tax.rate,
                type: {'value': tax.type, 'label': tax.type},
                description: tax.description,
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
            toast.info('Name can not be empty');
            return;
        };

        if (taxes.some(tax => tax.name.toLowerCase() === detail.name.toLowerCase())){
            toast.info('A tax/levy with this name already exists');
            return;
        };

        if (!detail.type){
            toast.info('A type has to be selected');
            return;
        };

        if (detail.rate < 0.01){
            toast.info('Rate can not be less 0.01');
            return;
        };

        if (loading){
            toast.info('Please wait... adding tax in progress');
            return;
        }

        const data = {
            name: detail.name,
            rate: detail.rate,
            type: detail.type.value || '',
            description: detail.description,
        }

        try{
            setLoading(true);
            const response = await api.post('add_tax', {business, detail:data, user});

            if (response.status === 'success'){
                toast.success(response.message || `${data.name} added successfully`);
                setShowCreate(false);
                document.addEventListener('mousedown', handleCreateOverlay);

                setDetail({ name: '', rate: 0, type: null, description:''});

                const response1 = await api.post('fetch_taxes',{ business, user});
                
                if (response1.status === 'error'){
                    toast.error(response1.message || 'Error occurred while fetching data');
                    return;
                }
                setTaxes(response1.data || []);
            }else{
                toast.error(response.message || 'Error occurred while adding tax');
                setLoading(false);
                return;
            }

        }catch(error){
            toast.error('Error occurred while adding tax');
            setLoading(false);
            console.error('Error adding tax:', error);
            if (error.response?.status === 401) {
                navigate('/sign_in');
            }
        };
    };

    const editTax = async () => {
        if (!editData.name || editData.name === ''){
            toast.info('Name can not be empty');
            return;
        };

        if (!editData.type){
            toast.info('A type has to be selected');
            return;
        };

        if (editData.rate < 0.01){
            toast.info('Rate can not be less 0.01');
            return;
        };

        if (loading){
            toast.info('Please wait... update in progress');
            return;
        }

        const data = {
            original: editData.originalName,
            name: editData.name,
            rate: editData.rate,
            type: editData.type.value || '',
            description: editData.description,
        }

        try{
            setLoading(true);
            const response = await api.post('edit_tax', {business, detail:data, user});
            if (response.status === 'success'){
                toast.success(response.message || `${data.name} updated successfully`);
                setShowEdit(false);
                document.addEventListener('mousedown', handleEditOverlay);

                setEditData({ originalName: '', name: '', rate: 0, type: null, description:'' });

                const response1 = await api.post('fetch_taxes',{ business, user });

                if (response1.status === 'error'){
                    toast.error(response1.message || 'Error occurred while fetching data');
                    return;
                }
                setTaxes(response1.data || []);
            }else{
                toast.error(response.message || 'Error occurred while editing tax');
                setLoading(false);
                return;
            }

        }catch(error){
            toast.error('Error occurred while editing tax');
            setLoading(false);
            console.error('Error editing tax:', error);
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
                        <FontAwesomeIcon icon={faArrowLeft} className='back-icon' />
                    </Link>
                    <h2>
                        Taxes & Levies
                    </h2>
                </div>
            </div>

            <div className="journal-filters">
                <div className="filter-groups-left">
                    <div>
                        <button className="btn btn-outline" onClick={() => {
                            setShowCreate(true);
                            document.addEventListener('mousedown', handleCreateOverlay);
                        }}>
                            Add Tax/Levy
                        </button>
                    </div>
                </div>
                <div className="ivi_display_box1">
                    <div className="ivi_subboxes1">
                        <div className="ivi_holder_box1">
                            <input onChange={handleSearch} type="text" className='ivi_input' placeholder="Search taxes..." />
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
                            <th>Rate (%)</th>
                            <th>Type</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.map((tax, index) => (
                            <tr key={tax.name} id={`row-${index}`} className="table-row">
                            <td className="table-row">
                                <button className="action-button" onClick={() => openEdit(tax)}>
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