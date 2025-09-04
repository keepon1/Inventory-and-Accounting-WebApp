import { useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faRuler,
  faTimesCircle,
  faEdit
} from '@fortawesome/free-solid-svg-icons';
import {useNavigate} from 'react-router-dom';
import api from '../api';
import enableKeyboardScrollFix from '../../utils/scroll';

const MeasurementUnit = ({ business, user }) => {
    const [units, setUnits] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [detail, setDetail] = useState({name: '', suffix: '', description:'' });
    const [editData, setEditData] = useState({ originalName: '', name: '', suffix: '', description:'' });
    const [errors, setErrors] = useState();
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
            { business: business},
            );
            setUnits(response);

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

    const openEdit = async (unit) => {
        try {
            const response = await api.post(
                'get_measurement_unit',
                { business, unit: unit},
            );
            setEditData({
                originalName: unit,
                name: response.name,
                suffix: response.suffix,
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

    const addUnit = async() => {
        if (!detail.name || detail.name === ''){
            setErrors('Name can not be empty');
            return;
        };

        if (!detail.suffix || detail.suffix === ''){
            setErrors('Suffix can not be empty');
            return;
        };

        const data = {
            name: detail.name,
            suffix: detail.suffix,
            description: detail.description,
        }

        try{
            const response = await api.post('add_measurement_unit', {business, detail:data});
            if (response === 'done'){
                setShowCreate(false);
                document.addEventListener('mousedown', handleCreateOverlay);

                const response = await api.post('fetch_measurement_units',{ business: business});
                setUnits(response);
                };
        }catch{

        };
    };

    const editUnit = async () => {
        if (!editData.name || editData.name === ''){
            setErrors('Name can not be empty');
            return;
        };

        if (!editData.suffix || editData.suffix === ''){
            setErrors('Suffix can not be empty');
            return;
        };

        const data = {
            original: editData.originalName,
            name: editData.name,
            suffix: editData.suffix,
            description: editData.description,
        }

        try{
            const response = await api.post('edit_measurement_unit', {business, detail:data});
            if (response === 'done'){
                setShowEdit(false);
                document.addEventListener('mousedown', handleEditOverlay);

                const response = await api.post('fetch_measurement_units',{ business: business});
                setUnits(response);
                };
        }catch{

        };
    };

    return (
        <div className="journal-container">
            <div className="journal-header">
                <h1>
                    <FontAwesomeIcon icon={faRuler} className="header-icon" />
                    Measurement Units
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
                            Add Unit
                        </button>
                    </div>
                </div>
                <div className="filter-groups-right">
                    <div className="filter-group1">
                        <FontAwesomeIcon icon={faSearch} />
                        <input onChange={handleSearch} type="text" placeholder="Search units..." />
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
                                <button className="action-button" onClick={() => openEdit(unit.name)}>
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
                          <button className="btn btn-primary" onClick={addUnit}>
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
                        <div>
                          <button className="btn btn-primary" onClick={editUnit}>
                            Save Changes
                          </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
};

export default MeasurementUnit;