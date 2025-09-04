import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faUser,
  faTimesCircle,
  faEdit,
  faUserShield,
  faUserCheck
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import enableKeyboardScrollFix from '../../utils/scroll';
import { set } from 'date-fns';

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
                setUsers(usersResponse);

            } catch (error) {
                if (error.response?.status === 401) {
                    localStorage.removeItem('access');
                    navigate('/sign_in');
                }
            }
        };
        fetchData();
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

    const openEdit = async (username) => {
        try {
            const response = await api.post('get_user_detail', { business, username });
            setEditData({
                originalName: username,
                user_name: response.user_name,
                admin: response.admin,
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
            setErrors('Username cannot be empty');
            return;
        };

        if (!emailRegex.test(detail.email)){
            setErrors1('Invalid Email');
            return;
        }

        try {
            const response = await api.post('add_user', { business, detail, user });
            if (response === 'done') {
                setShowCreate(false);
                document.removeEventListener('mousedown', handleCreateOverlay);

                const usersResponse = await api.post('fetch_users', { business });
                setUsers(usersResponse);
            } else if (response === 'exist'){
                setErrors('User Exist');
            }else if (response === 'email_exist'){
                setErrors1('Email Exist');
            }else if (response === 'email_error'){
                setErrors1('Invalid Email');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const editUser = async () => {
        if (!editData.user_name || editData.user_name === '') {
            setErrors('Username cannot be empty');
            return;
        };

        const data = {
            original: editData.originalName,
            user_name: editData.user_name,
            admin: editData.admin,
        };

        try {
            const response = await api.post('edit_user', { business, detail: data });
            if (response === 'done') {
                setShowEdit(false);
                document.removeEventListener('mousedown', handleEditOverlay);

                const usersResponse = await api.post('fetch_users', { business });
                setUsers(usersResponse);
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="journal-container">
            <div className="journal-header">
                <h1>
                    <FontAwesomeIcon icon={faUser} className="header-icon" />
                    User Accounts
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
                            Add User
                        </button>
                    </div>
                </div>
                <div className="filter-groups-right">
                    <div className="filter-group1">
                        <FontAwesomeIcon icon={faSearch} />
                        <input onChange={handleSearch} type="text" placeholder="Search users..." />
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
                        {filteredItems.map((user, index) => (
                            <tr key={user.user_name} id={`row-${index}`} className="table-row">
                                <td className="table-row">
                                    <button className="action-button" onClick={() => openEdit(user.user_name)}>
                                        <FontAwesomeIcon icon={faEdit} />
                                    </button>
                                </td>
                                <td>{user.user_name}</td>
                                <td>
                                    {user.admin ? (
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