import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimesCircle,
  faEdit,
  faUserShield,
  faUserCheck,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { toast } from 'react-toastify';

const UserAccount = ({ business, user }) => {
    const [users, setUsers] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [detail, setDetail] = useState({ 
        user_name: '',
        email:'',
        admin: false,  
    });
    const [editData, setEditData] = useState({ 
        originalName: '', 
        user_name: '', 
        admin: false,  
    });
    const [errors, setErrors] = useState();
    const [errors1, setErrors1] = useState();
    const overlayRef = useRef(null);
    const editOverlayRef = useRef(null);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleSearch = (e) => {
        setSearchQuery(e.target.value.toLowerCase());
    };

    const filteredItems = users.filter(item =>
        item.user_name.toLowerCase().includes(searchQuery)
    );

    useEffect(() => {
        const fetchData = async () => {
            try {
                const usersResponse = await api.post('fetch_users', { business, user });

                if (usersResponse.status === 'error'){
                    toast.error(usersResponse.message || 'Error fetching users');
                    return;
                }
                setUsers(usersResponse.data || []);

            } catch (error) {
                console.error(error);
                toast.error('An error occurred while fetching users');
                if (error.response?.status === 401) {
                    localStorage.removeItem('access');
                    navigate('/sign_in');
                }
            }
        };
        fetchData();

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

    const openEdit = async (username) => {
        try {
            setEditData({
                originalName: username.user_name,
                user_name: username.user_name,
                admin: username.admin,
            });
            setShowEdit(true);
            document.addEventListener('mousedown', handleEditOverlay);
        } catch (error) {
            if (error.response?.status === 401) {
                navigate('/sign_in');
            }
        }
    };

    const addUser = async () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!detail.user_name || detail.user_name === '') {
            toast.info('Username cannot be empty');
            return;
        };

        if (!emailRegex.test(detail.email)){
            toast.info('Invalid Email');
            return;
        }

        if (loading){
            toast.info('Please wait... creating user in progress');
            return;
        }

        try {
            setLoading(true);
            const response = await api.post('add_user', { business, detail, user });

            if (response.status === 'success') {
                toast.success(response.message || 'User created successfully');
                setLoading(false);
                setShowCreate(false);
                document.removeEventListener('mousedown', handleCreateOverlay);

                setDetail({ 
                    user_name: '',
                    email:'',
                    admin: false,  
                });

                const usersResponse = await api.post('fetch_users', { business, user });
                
                if (usersResponse.status === 'error'){
                    toast.error(usersResponse.message || 'Error fetching users');
                    return;
                }
                setUsers(usersResponse.data || []);
            } else{
                toast.error(response.message || 'Error creating user');
                setLoading(false);
                return;
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while creating user');
            setLoading(false);
            if (error.response?.status === 401) {
                navigate('/sign_in');
            }
        }
    };

    const editUser = async () => {
        if (!editData.originalName) {
            toast.error('Original username is missing.');
            return;
        };

        if (!editData.user_name || editData.user_name === '') {
            toast.info('Username cannot be empty');
            return;
        };

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (editData.email && !emailRegex.test(editData.email)){
            toast.info('Invalid Email');
            return;
        }

        if (loading){
            toast.info('Please wait... update in progress');
            return;
        }

        const data = {
            original: editData.originalName,
            user_name: editData.user_name,
            admin: editData.admin,
        };

        try {
            setLoading(true);
            const response = await api.post('edit_user', { business, detail: data, user });

            if (response.status === 'success') {
                toast.success(response.message || 'User updated successfully');
                setLoading(false);
                setShowEdit(false);
                document.removeEventListener('mousedown', handleEditOverlay);

                setEditData({ 
                    originalName: '', 
                    user_name: '', 
                    admin: false,  
                });

                const usersResponse = await api.post('fetch_users', { business, user });

                if (usersResponse.status === 'error'){
                    toast.error(usersResponse.message || 'Error fetching users');
                    return;
                }
                setUsers(usersResponse.data || []);
            }else{
                toast.error(response.message || 'Error updating user');
                setLoading(false);
                return;
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while updating user');
            setLoading(false);
            if (error.response?.status === 401) {
                navigate('/sign_in');
            }
        }
    };

    return (
        <div className="journal-container">
            <div className="journal-header">
                <div className='header-back'>
                    <Link to="../" className='back-link'>
                        <FontAwesomeIcon icon={faArrowLeft} className='back-icon' />
                    </Link>
                    <h2>
                        User Accounts
                    </h2>
                </div>
            </div>

            <div className="journal-filters">
                <div className="create_access">
                    <div >
                        <button className="btn btn-outline" onClick={() => {
                            setShowCreate(true);
                            document.addEventListener('mousedown', handleCreateOverlay);
                        }}>
                            Add User
                        </button>
                    </div>
                </div>
                <div className="ivi_display_box1">
                    <div className="ivi_subboxes1">
                        <div className="ivi_holder_box1">
                            <input onChange={handleSearch} className='ivi_input' type="text" placeholder="Search users..." />
                        </div>
                    </div>
                </div>
            </div>

            <div className="items-table-box">
                <table className="items-table">
                    <thead className="table-header">
                        <tr>
                            <th>Edit</th>
                            <th>Username</th>
                            <th>Admin</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.map((users, index) => (
                            <tr key={users.user_name} id={`row-${index}`} className="table-row">
                                <td className="table-row">
                                    <button className="action-button" onClick={() => openEdit(users)}>
                                        <FontAwesomeIcon icon={faEdit} />
                                    </button>
                                </td>
                                <td>{users.user_name}</td>
                                <td>
                                    {users.admin ? (
                                        <>
                                            <FontAwesomeIcon icon={faUserShield} className="admin-icon" />
                                            <span> Admin</span>
                                        </>
                                    ) : (
                                        <>
                                            <FontAwesomeIcon icon={faUserCheck} className="user-icon" />
                                            <span> User</span>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showCreate && (
                <div className="modal-overlay">
                    <div className="modal" ref={overlayRef}>
                        <div className="modal-header">
                            <h3>Create New User</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowCreate(false)}
                            >
                                <FontAwesomeIcon icon={faTimesCircle} />
                            </button>
                        </div>
                        {errors && <div className="error-message">{errors}</div>}
                        <div className="form-group">
                            <label className="ivi_label">Username</label>
                            <input
                                type="text"
                                value={detail.user_name}
                                className="ivi_input"
                                onChange={(e) => [setDetail({ ...detail, user_name: e.target.value }), setErrors('')]}
                            />
                        </div>
                        {errors1 && <div className="error-message">{errors1}</div>}
                        <div className="form-group">
                            <label className="ivi_label">Email</label>
                            <input
                                type="text"
                                value={detail.email}
                                className="ivi_input"
                                onChange={(e) => [setDetail({ ...detail, email: e.target.value }), setErrors1('')]}
                            />
                        </div>
                        <div className="form-group">
                            <label className="ivi_label">
                                <input
                                    type="checkbox"
                                    checked={detail.admin}
                                    onChange={(e) => setDetail({ ...detail, admin: e.target.checked })}
                                />
                                Admin Privileges
                            </label>
                        </div>
                        <div>
                            <button className="btn btn-primary" onClick={addUser}>
                                Create User
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showEdit && (
                <div className="modal-overlay">
                    <div className="modal" ref={editOverlayRef}>
                        <div className="modal-header">
                            <h3>Edit User</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowEdit(false)}
                            >
                                <FontAwesomeIcon icon={faTimesCircle} />
                            </button>
                        </div>
                        {errors && <div className="error-message">{errors}</div>}
                        <div className="form-group">
                            <label className="ivi_label">Username</label>
                            <input
                                type="text"
                                value={editData.user_name}
                                className="ivi_input"
                                onChange={(e) => [setEditData({ ...editData, user_name: e.target.value }), setErrors('')]}
                            />
                        </div>
                        <div className="form-group">
                            <label className="ivi_label">
                                <input
                                    type="checkbox"
                                    checked={editData.admin}
                                    onChange={(e) => setEditData({ ...editData, admin: e.target.checked })}
                                />
                                Admin Privileges
                            </label>
                        </div>
                        <div>
                            <button className="btn btn-primary" onClick={editUser}>
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
};

export default UserAccount;