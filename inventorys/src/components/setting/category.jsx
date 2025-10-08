import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimesCircle,
  faEdit,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { toast } from 'react-toastify';
import { set } from 'date-fns';

const CategoryMain = ({ business, user }) => {
    const [categories, setCategories] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [detail, setDetail] = useState({ name: '', description: '' });
    const [editData, setEditData] = useState({ originalName: '', name: '', description: '' });
    const [errors, setErrors] = useState();
    const overlayRef = useRef(null);
    const editOverlayRef = useRef(null);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleSearch = (e) => {
        setSearchQuery(e.target.value.toLowerCase());
    };

    const filteredItems = categories.filter(item =>
        item.name.toLowerCase().includes(searchQuery) ||
        item.description.toLowerCase().includes(searchQuery)
    );

    useEffect(() => {
        const fetchItems = async () => {
            try {
                const response = await api.post(
                    'fetch_categories',
                    { business, user },
                );

                if (response.status === 'error'){
                    toast.error(response.message || 'Error fetching categories');
                    return;
                }
                setCategories(response.data || []);
            } catch (error) {
                toast.error('An error occurred while fetching categories');
                console.error(error);
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

    const openEdit = async (category) => {
        try {

            setEditData({
                originalName: category.name,
                name: category.name,
                description: category.description,
            });
            setShowEdit(true);
            document.addEventListener('mousedown', handleEditOverlay);
        } catch (error) {
            if (error.response?.status === 401) {
                navigate('/sign_in');
            }
        }
    };

    const addCategory = async () => {
        if (!detail.name || detail.name === '') {
            toast.info('Name cannot be empty');
            return;
        };

        if (categories.some(cat => cat.name.toLowerCase() === detail.name.toLowerCase())) {
            toast.error('Category name must be unique');
            return;
        }

        if (loading){
            toast.info('Please wait... creation in progress');
            return;
        }

        const data = {
            name: detail.name,
            description: detail.description,
        };

        try {
            setLoading(true);
            const response = await api.post('add_category', { business, detail: data, user });

            if (response.status === 'success') {
                toast.success(response.message || 'Category added successfully');
                setShowCreate(false);
                document.addEventListener('mousedown', handleCreateOverlay);

                setDetail({ name: '', description: '' });

                const update = await api.post('fetch_categories', { business, user });

                if (update.status === 'error'){
                    toast.error(update.message || 'Error fetching categories');
                    return;
                }
                setCategories(update.data || []);
                setLoading(false);
            }else{
                toast.error(response.message || 'Error adding category');
                setLoading(false);
            }
        } catch (error) {
            toast.error('An error occurred while adding the category');
            setLoading(false);
            console.error(error);
            if (error.response?.status === 401) {
                navigate('/sign_in');
            }
        };
    };

    const editCategory = async () => {
        if (!editData.name || editData.name === '') {
            toast.info('Name cannot be empty');
            return;
        };

        if (loading){
            toast.info('Please wait... update in progress');
            return;
        }

        const data = {
            original: editData.originalName,
            name: editData.name,
            description: editData.description,
        };

        try {
            setLoading(true);
            const response = await api.post('edit_category', { business, detail: data, user });

            if (response.status === 'success') {
                toast.success(response.message || 'Category updated successfully');
                setLoading(false);
                setShowEdit(false);
                document.addEventListener('mousedown', handleEditOverlay);

                setEditData({ originalName: '', name: '', description: '' });

                const update = await api.post('fetch_categories', { business, user });

                if (update.status === 'error'){
                    toast.error(update.message || 'Error fetching categories');
                    return;
                }

                setCategories(update.data || []);
            }else{
                toast.error(response.message || 'Error updating category');
                setLoading(false);
                return
            }
        } catch (error) {
            toast.error('An error occurred while updating the category');
            setLoading(false);
            console.error(error);
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
                        Categories
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
                            Add Category
                        </button>
                    </div>
                </div>
                <div className="ivi_display_box1">
                    <div className="ivi_subboxes1">
                        <div className="ivi_holder_box1">
                            <input onChange={handleSearch} className='ivi_input' type="text" placeholder="Search categories..." />
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
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.map((category, index) => (
                            <tr key={category.name} id={`row-${index}`} className="table-row">
                                <td className="table-row">
                                    <button className="action-button" onClick={() => openEdit(category)}>
                                        <FontAwesomeIcon icon={faEdit} />
                                    </button>
                                </td>
                                <td>{category.name}</td>
                                <td>{category.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showCreate && (
                <div className="modal-overlay">
                    <div className="modal" ref={overlayRef}>
                        <div className="modal-header">
                            <h3>Create New Category</h3>
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
                                onChange={(e) => [setDetail({ ...detail, name: e.target.value }), setErrors('')]}
                            />
                        </div>
                        <div className="form-group">
                            <label className="ivi_label">Description</label>
                            <input
                                type="text"
                                value={detail.description}
                                className="ivi_input"
                                onChange={(e) => setDetail({ ...detail, description: e.target.value })}
                            />
                        </div>
                        <div>
                            <button className="btn btn-primary" onClick={addCategory}>
                                Create Category
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showEdit && (
                <div className="modal-overlay">
                    <div className="modal" ref={editOverlayRef}>
                        <div className="modal-header">
                            <h3>Edit Category</h3>
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
                                onChange={(e) => [setEditData({ ...editData, name: e.target.value }), setErrors('')]}
                            />
                        </div>
                        <div className="form-group">
                            <label className="ivi_label">Description</label>
                            <input
                                type="text"
                                value={editData.description}
                                className="ivi_input"
                                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            />
                        </div>
                        <div>
                            <button className="btn btn-primary" onClick={editCategory}>
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
};

export default CategoryMain;