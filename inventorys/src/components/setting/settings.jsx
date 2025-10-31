import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserShield,
  faUserCheck,
  faEdit,
  faTimesCircle,
  faCog,
  faLayerGroup,
  faBalanceScale,
  faTag,
  faCoins,
  faUsers,
  faUserCog,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { toast } from 'react-toastify';

const SettingsPermissions = ({ business, user }) => {
    const [users, setUsers] = useState([]);
    const [showEdit, setShowEdit] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editData, setEditData] = useState({ 
        user_name: '',
        general_settings: false,
        category_settings: false,
        unit_settings: false,
        brand_settings: false,
        tax_levy_settings: false,
        currency_settings: false,
        user_management_settings: false,
        user_permissions_settings: false
    });
    const [errors, setErrors] = useState();
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

                if (usersResponse.status === 'error') {
                    toast.error(usersResponse.message || 'Failed to fetch users');
                    return;
                }
                setUsers(usersResponse.data || []);
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while fetching data');

                if (error.response?.status === 401) {
                    localStorage.removeItem('access');
                    navigate('/sign_in');
                }
            }
        };
        fetchData();
    }, []);

    const handleEditOverlay = (e) => {
        if (editOverlayRef.current && !editOverlayRef.current.contains(e.target)) {
            setShowEdit(false);
        }
    };

    const openEdit = async (username) => {
        if (loading){
            toast.info('Please wait... operation in progress');
            return;
        };

        try {
            const respons = await api.post('get_user_setting_permissions', { username });

            if (respons.status === 'error') {
                toast.error(respons.message || 'Failed to fetch user settings permissions');
                return;
            };

            const response = respons.data;

            if (!response) {
                setEditData({
                    user_name: username,
                    general_settings: false,
                    category_settings: false,
                    unit_settings: false,
                    brand_settings: false,
                    tax_levy_settings: false,
                    currency_settings: false,
                    user_management_settings: false,
                    user_permissions_settings: false
                });
            } else {
                setEditData({
                    user_name: response.user_name || username,
                    general_settings: response.general_settings || false,
                    category_settings: response.category_settings || false,
                    unit_settings: response.unit_settings || false,
                    brand_settings: response.brand_settings || false,
                    tax_levy_settings: response.tax_levy_settings || false,
                    currency_settings: response.currency_settings || false,
                    user_management_settings: response.user_management_settings || false,
                    user_permissions_settings: response.user_permissions_settings || false
                });
            }
            
            setShowEdit(true);
            document.addEventListener('mousedown', handleEditOverlay);
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while fetching user settings permissions');
            setLoading(false);
            if (error.response?.status === 401) {
                navigate('/sign_in');
            }
        }
    };

    const handleSelectAll = (e) => {
        const selectAll = e.target.checked;
        setEditData(prev => ({
            ...prev,
            general_settings: selectAll,
            category_settings: selectAll,
            unit_settings: selectAll,
            brand_settings: selectAll,
            tax_levy_settings: selectAll,
            currency_settings: selectAll,
            user_management_settings: selectAll,
            user_permissions_settings: selectAll
        }));
    };

    const areAllSelected = () => {
        return editData.general_settings &&
               editData.category_settings &&
               editData.unit_settings &&
               editData.brand_settings &&
               editData.tax_levy_settings &&
               editData.currency_settings &&
               editData.user_management_settings &&
               editData.user_permissions_settings;
    };

    const saveSettingsPermissions = async () => {
        if (!editData.user_name) {
            setErrors('Username is required');
            return;
        }

        if (loading){
            toast.info('Please wait... update in progress');
            return;
        }

        const data = {
            user_name: editData.user_name,
            general_settings: editData.general_settings,
            category_settings: editData.category_settings,
            unit_settings: editData.unit_settings,
            brand_settings: editData.brand_settings,
            tax_levy_settings: editData.tax_levy_settings,
            currency_settings: editData.currency_settings,
            user_management_settings: editData.user_management_settings,
            user_permissions_settings: editData.user_permissions_settings
        };

        try {
            setLoading(true);
            const response = await api.post('update_setting_permissions', { business, detail: data, user });

            if (response.status === 'success') {
                toast.success(response.message || `${data.user_name} settings permissions updated successfully`);
                setLoading(false);
                setShowEdit(false);
                document.removeEventListener('mousedown', handleEditOverlay);

                const usersResponse = await api.post('fetch_users', { business, user });
                if (usersResponse.status === 'error'){
                    toast.error(usersResponse.message || 'Failed to fetch updated users');
                    return;
                }
                setUsers(usersResponse.data || []);
            } else {
                toast.error(response.message || 'Error updating settings permissions');
                setLoading(false);
                return;
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while updating settings permissions');
            setLoading(false);
            if (error.response?.status === 401) {
                navigate('/sign_in');
            }
        }
    };

    const getActiveSettingsCount = (user) => {
        if (!user.settings_permissions) return 0;
        return Object.values(user.settings_permissions).filter(Boolean).length;
    };

    return (
        <div className="journal-container">
            <div className="journal-header">
                <div className='header-back'>
                    <Link to="../" className='back-link'>
                        <FontAwesomeIcon icon={faArrowLeft} className='back-icon' />
                    </Link>
                    <h2>
                        Settings Permissions
                    </h2>
                </div>
            </div>

            <div className="journal-filters">
                <div></div>
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
                            <th>Active Settings</th>
                            <th>Settings Permissions</th>
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
                                            <FontAwesomeIcon icon={faUserShield} className="admin-icon" title="Admin (All Access)" />
                                            <span> Admin</span>
                                        </>
                                    ) : (
                                        <>
                                            <FontAwesomeIcon icon={faUserCheck} className="user-icon" title="Regular User" />
                                            <span> User</span>
                                        </>
                                    )}
                                </td>
                                <td>
                                    {user.admin ? 'All Settings' : `${getActiveSettingsCount(user)}/8`}
                                </td>
                                <td>
                                    <div className="permission-tags">
                                        {user.admin ? (
                                            <span className="all-permissions" title="All Settings Permissions">ALL SETTINGS</span>
                                        ) : user.settings_permissions ? (
                                            <span>Some Settings Access</span>
                                        ) : (
                                            <span className="no-permissions">No Settings Access</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showEdit && (
                <div className="modal-overlay">
                    <div className="modal wide-modal" ref={editOverlayRef}>
                        <div className="modal-header">
                            <h3>Edit Settings Permissions</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowEdit(false)}
                            >
                                <FontAwesomeIcon icon={faTimesCircle} />
                            </button>
                        </div>
                        {errors && <div className="error-message">{errors}</div>}
                        
                        <div className="form-section">
                            <div className="form-group">
                                <label className="ivi_label">Username</label>
                                <input
                                    type="text"
                                    value={editData.user_name}
                                    className="ivi_input"
                                    disabled
                                />
                            </div>
                            <div className="form-group">
                                <label className="ivi_label">
                                    <input
                                        type="checkbox"
                                        checked={areAllSelected()}
                                        onChange={handleSelectAll}
                                    />
                                    Select All Settings
                                </label>
                            </div>
                        </div>

                        <div className="form-section">
                            <h4>Settings Permissions</h4>
                            <div className="permission-grid">
                                <div className="permission-item">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={editData.general_settings}
                                            onChange={(e) => setEditData({ ...editData, general_settings: e.target.checked })}
                                        />
                                        <span> General Settings</span>
                                    </label>
                                </div>
                                <div className="permission-item">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={editData.category_settings}
                                            onChange={(e) => setEditData({ ...editData, category_settings: e.target.checked })}
                                        />
                                        <span> Category Settings</span>
                                    </label>
                                </div>
                                <div className="permission-item">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={editData.unit_settings}
                                            onChange={(e) => setEditData({ ...editData, unit_settings: e.target.checked })}
                                        />
                                        <span> Unit Settings</span>
                                    </label>
                                </div>
                                <div className="permission-item">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={editData.brand_settings}
                                            onChange={(e) => setEditData({ ...editData, brand_settings: e.target.checked })}
                                        />
                                        <span> Brand Settings</span>
                                    </label>
                                </div>
                                <div className="permission-item">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={editData.tax_levy_settings}
                                            onChange={(e) => setEditData({ ...editData, tax_levy_settings: e.target.checked })}
                                        />
                                        <span> Tax & Levy Settings</span>
                                    </label>
                                </div>
                                <div className="permission-item">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={editData.currency_settings}
                                            onChange={(e) => setEditData({ ...editData, currency_settings: e.target.checked })}
                                        />
                                        <span> Currency Settings</span>
                                    </label>
                                </div>
                                <div className="permission-item">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={editData.user_management_settings}
                                            onChange={(e) => setEditData({ ...editData, user_management_settings: e.target.checked })}
                                        />
                                        <span> User Management</span>
                                    </label>
                                </div>
                                <div className="permission-item">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={editData.user_permissions_settings}
                                            onChange={(e) => setEditData({ ...editData, user_permissions_settings: e.target.checked })}
                                        />
                                        <span> User Permissions</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button className="btn btn-outline" onClick={saveSettingsPermissions}>
                                Save Settings Permissions
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
};

export default SettingsPermissions;