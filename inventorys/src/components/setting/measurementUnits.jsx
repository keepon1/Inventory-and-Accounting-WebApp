import { useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faRuler,
  faTimesCircle,
  faEdit,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import {Link, useNavigate} from 'react-router-dom';
import api from '../api';
import enableKeyboardScrollFix from '../../utils/scroll';
import { toast } from 'react-toastify';
import { set } from 'date-fns';

const MeasurementUnit = ({ business, user }) => {
    const [units, setUnits] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [detail, setDetail] = useState({name: '', suffix: '', description:'' });
    const [editData, setEditData] = useState({ originalName: '', name: '', suffix: '', description:'' });
    const [errors, setErrors] = useState();
    const [loading, setLoading] = useState(false);
    const overlayRef = useRef(null);
    const editOverlayRef = useRef(null);

    const navigate = useNavigate();

    const handleSearch = (e) => {
        setSearchQuery(e.target.value.toLowerCase());
    };

    const filteredItems = units.filter(item =>
        item.name.toLowerCase().includes(searchQuery) ||
        item.suffix.toLowerCase().includes(searchQuery) ||
        item.description.toLowerCase().includes(searchQuery)
    );

    useEffect(() => {
        const fetchItems = async () => {
        try {
            const response = await api.post(
            'fetch_measurement_units',
            { business, user },
            );

            if (response.status === 'error') {
                toast.error(response.message || 'An error occurred while fetching measurement units.');
                return;
            }
            setUnits(response.data || []);

        } catch (error) {
            toast.error('An error occurred while fetching measurement units.');
            console.error('Error fetching measurement units:', error);
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

    const openEdit = async (unit) => {
        try {

            setEditData({
                originalName: unit.name,
                name: unit.name,
                suffix: unit.suffix,
                description: unit.description,
            });
            setShowEdit(true);
            document.addEventListener('mousedown', handleEditOverlay);
        } catch (error) {
            if (error.response?.status === 401) {
                navigate('/sign_in');
            }
        }
    };

    const addUnit = async() => {
        if (loading) {
            toast.info('Please wait...');
            return;
        };

        if (!detail.name || detail.name === ''){
            toast.info('Name can not be empty');
            return;
        };

        if (!detail.suffix || detail.suffix === ''){
            toast.info('Suffix can not be empty');
            return;
        };

        const data = {
            name: detail.name,
            suffix: detail.suffix,
            description: detail.description,
        }

        try{
            setLoading(true);
            const response = await api.post('add_measurement_unit', {business, detail:data, user});
            if (response.status === 'success'){
                toast.success(response.message || 'Measurement unit added successfully');
                setShowCreate(false);
                document.addEventListener('mousedown', handleCreateOverlay);

                setDetail({name: '', suffix: '', description:'' });

                const update = await api.post('fetch_measurement_units',{ business, user});

                if (update.status === 'error') {
                    toast.error(update.message || 'An error occurred while fetching measurement units.');
                    return;
                }
                setUnits(update.data || []);
                setLoading(false);
                
            }else{
                toast.error(response.message || 'An error occurred while adding the measurement unit.');
                setLoading(false);
            }
        }catch(error){
            toast.error('An error occurred while adding the measurement unit.');
            console.error('Error adding measurement unit:', error);
            if (error.response?.status === 401) {
                navigate('/sign_in');
            }
        };
    };

    const editUnit = async () => {
        if (loading) {
            toast.info('Please wait...');
            return;
        };

        if (!editData.name || editData.name === ''){
            toast.info('Name can not be empty');
            return;
        };

        if (!editData.suffix || editData.suffix === ''){
            toast.info('Suffix can not be empty');
            return;
        };

        const data = {
            original: editData.originalName,
            name: editData.name,
            suffix: editData.suffix,
            description: editData.description,
        }

        try{
            setLoading(true);
            const response = await api.post('edit_measurement_unit', {business, detail:data, user});

            if (response.status === 'success'){
                toast.success(response.message || 'Measurement unit updated successfully');
                setLoading(false);
                setShowEdit(false);
                document.addEventListener('mousedown', handleEditOverlay);

                setEditData({ originalName: '', name: '', suffix: '', description:'' });

                const update = await api.post('fetch_measurement_units',{ business, user });

                if (update.status === 'error') {
                    toast.error(update.message || 'An error occurred while fetching measurement units.');
                    return;
                }
                setUnits(update.data || []);
            }else{
                toast.error(response.message || 'An error occurred while updating the measurement unit.');
                setLoading(false);
            }
        }catch(error){
            toast.error('An error occurred while updating the measurement unit.');
            console.error('Error updating measurement unit:', error);
            setLoading(false);
            if (error.response?.status === 401) {
                navigate('/sign_in');
            }
        };
    };

    const deleteUnit = async () => {
        if (loading) {
            toast.info('Please wait...');
            return;
        };

        try{
            setLoading(true);
            const response = await api.post('delete_measurement_unit', {unit: editData.originalName});

            if (response.status === 'success'){
                toast.success(response.message || 'Measurement unit deleted successfully');
                setLoading(false);
                setShowEdit(false);
                document.addEventListener('mousedown', handleEditOverlay);
                setEditData({ originalName: '', name: '', suffix: '', description:'' });

                const update = await api.post('fetch_measurement_units',{ business, user });
                if (update.status === 'error') {
                    toast.error(update.message || 'An error occurred while fetching measurement units.');
                    return;
                }

                setUnits(update.data || []);
            }else{
                toast.error(response.message || 'An error occurred while deleting the measurement unit.');
                setLoading(false);
            }

        }catch(error){
            toast.error('An error occurred while deleting the measurement unit.');
            console.error('Error deleting measurement unit:', error);
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
                        <FontAwesomeIcon icon={faArrowLeft} className='back-icon' />
                    </Link>
                    <h2>
                        Measurement Units
                    </h2>
                </div>
            </div>

            <div className="journal-filters">

                <button className="btn btn-outline" onClick={() => {
                            setShowCreate(true);
                            document.addEventListener('mousedown', handleCreateOverlay);
                        }}>
                            Add Unit
                </button>

                <div className="ivi_display_box1">
                    <div className="ivi_subboxes1">
                        <div className="ivi_holder_box1">
                            <input onChange={handleSearch} className='ivi_input' type="text" placeholder="Search units..." />
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
                            <th>Suffix</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.map((unit, index) => (
                            <tr key={unit.name} id={`row-${index}`} className="table-row">
                            <td className="table-row">
                                <button className="action-button" onClick={() => openEdit(unit)}>
                                    <FontAwesomeIcon icon={faEdit} />
                                </button>
                            </td>
                            <td>{unit.name}</td>
                            <td>{unit.suffix}</td>
                            <td>{unit.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showCreate && (
                <div className="modal-overlay">
                    <div className="modal" ref={overlayRef}>
                        <div className="modal-header">
                            <h3>Create New Measurement Unit</h3>
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
                          <label className="ivi_label">Suffix</label>
                          <input
                            type="text"
                            value={detail.suffix}
                            className="ivi_input"
                            onChange={(e) => [setDetail({...detail, suffix: e.target.value}), setErrors('')]}
                          />
                        </div>
                        <div className="form-group">
                          <label className="ivi_label">Description</label>
                          <input
                            type="text"
                            value={detail.description}
                            className="ivi_input"
                            onChange={(e) => setDetail({...detail, description: e.target.value})}
                          />
                        </div>
                        <div>
                          <button className="btn btn-outline" onClick={addUnit}>
                            Create Unit
                          </button>
                        </div>
                    </div>
                </div>
            )}
            
            {showEdit && (
                <div className="modal-overlay">
                    <div className="modal" ref={editOverlayRef}>
                        <div className="modal-header">
                            <h3>Edit Measurement Unit</h3>
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
                          <label className="ivi_label">Suffix</label>
                          <input
                            type="text"
                            value={editData.suffix}
                            className="ivi_input"
                            onChange={(e) => [setEditData({...editData, suffix: e.target.value}), setErrors('')]}
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
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn btn-outline" onClick={editUnit}>
                                Save Changes
                            </button>

                            <button className='btn btn-outline-red' onClick={deleteUnit}>
                                Delete Unit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
};

export default MeasurementUnit;