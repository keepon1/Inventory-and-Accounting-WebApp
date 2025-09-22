import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faUserShield,
  faUserCheck,
  faEdit,
  faTimesCircle,
  faFileInvoice,
  faBoxes,
  faExchangeAlt,
  faShoppingCart,
  faTruck,
  faMapMarkerAlt,
  faUsers,
  faHandHoldingUsd,
  faCreditCard,
  faChartBar,
  faCog,
  faTachometerAlt,
  faDollarSign,
  faInfoCircle,
  faUserPlus,
  faKey,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import api from '../api';
import enableKeyboardScrollFix from '../../utils/scroll';
import { toast } from 'react-toastify';

const RolePermission = ({ business, user }) => {
    const [users, setUsers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [showEdit, setShowEdit] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editData, setEditData] = useState({ 
        user_name: '', 
        admin: false,
        per_location_access: [],
        create_access: false,
        reverse_access: false,
        journal_access: false,
        coa_access: false,
        item_access: false,
        transfer_access: false,
        sales_access: false,
        purchase_access: false,
        location_access: false,
        customer_access: false,
        supplier_access: false,
        cash_access: false,
        payment_access: false,
        report_access: false,
        settings_access: false,
        edit_access: false,
        purchase_price_access: false,
        dashboard_access: false,
        add_user_access: false,
        give_access: false,
        info_access: false
    });
    const [errors, setErrors] = useState();
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
                const [users, locations] = await Promise.all([
                    api.post('fetch_users', { business, user }),
                    api.post('fetch_locations', { business, user }),
                ]);

                if (users.status === 'error' || locations.status === 'error') {
                    toast.error(users.message || locations.message || 'Failed to fetch data');
                    return;
                }
                setUsers(users.data || []);
                setLocations(locations.data || []);
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
        try {
            const respons = await api.post('get_user_access', { business, username, user });

            const response = respons.data;

            if (respons.status === 'error') {
                toast.error(respons.message || 'Failed to fetch user details');
                return;
            }

            setEditData({
                user_name: response.user_name,
                admin: response.admin,
                per_location_access: response.admin 
                    ? locations 
                    : response.per_location_access.map(loc => ({
                        value: loc,
                        label: loc
                    })),
                create_access: response.admin || response.create_access || false,
                reverse_access: response.admin || response.reverse_access || false,
                journal_access: response.admin || response.journal_access || false,
                coa_access: response.admin || response.coa_access || false,
                item_access: response.admin || response.item_access || false,
                transfer_access: response.admin || response.transfer_access || false,
                sales_access: response.admin || response.sales_access || false,
                purchase_access: response.admin || response.purchase_access || false,
                location_access: response.admin || response.location_access || false,
                customer_access: response.admin || response.customer_access || false,
                supplier_access: response.admin || response.supplier_access || false,
                cash_access: response.admin || response.cash_access || false,
                payment_access: response.admin || response.payment_access || false,
                report_access: response.admin || response.report_access || false,
                settings_access: response.admin || response.settings_access || false,
                edit_access: response.admin || response.edit_access || false,
                purchase_price_access: response.admin || response.purchase_price_access || false,
                dashboard_access: response.admin || response.dashboard_access || false,
                add_user_access: response.admin || response.add_user_access || false,
                give_access: response.admin || response.give_access || false,
                info_access: response.admin || response.info_access || false
            });
            setShowEdit(true);
            document.addEventListener('mousedown', handleEditOverlay);
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while fetching user details');
            if (error.response?.status === 401) {
                navigate('/sign_in');
            }
        }
    };

    const handleAdminToggle = (e) => {
        const isAdmin = e.target.checked;
        setEditData(prev => ({
            ...prev,
            admin: isAdmin,
            per_location_access: isAdmin ? locations : [],
            create_access: isAdmin,
            reverse_access: isAdmin,
            journal_access: isAdmin,
            coa_access: isAdmin,
            item_access: isAdmin,
            transfer_access: isAdmin,
            sales_access: isAdmin,
            purchase_access: isAdmin,
            location_access: isAdmin,
            customer_access: isAdmin,
            supplier_access: isAdmin,
            cash_access: isAdmin,
            payment_access: isAdmin,
            report_access: isAdmin,
            settings_access: isAdmin,
            edit_access: isAdmin,
            purchase_price_access: isAdmin,
            dashboard_access: isAdmin,
            add_user_access: isAdmin,
            give_access: isAdmin,
            info_access: isAdmin
        }));
    };

    const editUser = async () => {
        const data = {
            user_name: editData.user_name,
            admin: editData.admin,
            per_location_access: editData.admin 
                ? locations.map(loc => loc.value) 
                : editData.per_location_access.map(loc => loc.value),
            create_access: editData.admin || editData.create_access,
            reverse_access: editData.admin || editData.reverse_access,
            journal_access: editData.admin || editData.journal_access,
            coa_access: editData.admin || editData.coa_access,
            item_access: editData.admin || editData.item_access,
            transfer_access: editData.admin || editData.transfer_access,
            sales_access: editData.admin || editData.sales_access,
            purchase_access: editData.admin || editData.purchase_access,
            location_access: editData.admin || editData.location_access,
            customer_access: editData.admin || editData.customer_access,
            supplier_access: editData.admin || editData.supplier_access,
            cash_access: editData.admin || editData.cash_access,
            payment_access: editData.admin || editData.payment_access,
            report_access: editData.admin || editData.report_access,
           settings_access : editData.admin || editData.settings_access,
            edit_access: editData.admin || editData.edit_access,
            purchase_price_access: editData.admin || editData.purchase_price_access,
            dashboard_access: editData.admin || editData.dashboard_access,
            add_user_access: editData.admin || editData.add_user_access,
            give_access: editData.admin || editData.give_access,
            info_access: editData.admin || editData.info_access
        };

        try {
            const response = await api.post('edit_user_permissions', { business, detail: data, user });

            if (response.status === 'success') {
                toast.success(response.message || `${data.user_name} permissions updated successfully`);
                setShowEdit(false);
                document.removeEventListener('mousedown', handleEditOverlay);

                const usersResponse = await api.post('fetch_users', { business, user });

                if (usersResponse.status === 'error'){
                    toast.error(usersResponse.message || 'Failed to fetch updated users');
                    return;
                }
                setUsers(usersResponse.data || []);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while updating permissions');
            if (error.response?.status === 401) {
                localStorage.removeItem('access');
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
                        Role Permissions
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
                            <th>Location Access</th>
                            <th>Permissions</th>
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
                                    {user.admin 
                                        ? 'All Locations' 
                                        : (user.per_location_access && user.per_location_access.length > 0 
                                            ? user.per_location_access.map(loc => loc).join(', ')
                                            : 'No access')}
                                </td>
                                <td>
                                    <div className="permission-tags">
                                        {user.admin ? (
                                            <span className="all-permissions" title="All Permissions">ALL</span>
                                        ) : (
                                            <>
                                                {user.dashboard_access && <span title="Dashboard Access"><FontAwesomeIcon icon={faTachometerAlt} /></span>}
                                                {user.journal_access && <span title="Journal Access"><FontAwesomeIcon icon={faFileInvoice} /></span>}
                                                {user.item_access && (<span title="Item Access"><FontAwesomeIcon icon={faBoxes} /></span>)}
                                                {user.transfer_access && <span title="Transfer Access"><FontAwesomeIcon icon={faExchangeAlt} /></span>}
                                                {user.sales_access && <span title="Sales Access"><FontAwesomeIcon icon={faShoppingCart} /></span>}
                                                {user.purchase_access && <span title="Purchase Access"><FontAwesomeIcon icon={faTruck} /></span>}
                                                {user.location_access && <span title="Location Access"><FontAwesomeIcon icon={faMapMarkerAlt} /></span>}
                                                {user.customer_access && <span title="Customer Access"><FontAwesomeIcon icon={faUsers} /></span>}
                                                {user.supplier_access && <span title="Supplier Access"><FontAwesomeIcon icon={faUsers} /></span>}
                                                {user.cash_access && <span title="Cash Management"><FontAwesomeIcon icon={faHandHoldingUsd} /></span>}
                                                {user.payment_access && <span title="Payments"><FontAwesomeIcon icon={faCreditCard} /></span>}
                                                {user.report_access && <span title="Reports"><FontAwesomeIcon icon={faChartBar} /></span>}
                                                {user.settings_access && <span title="Settings"><FontAwesomeIcon icon={faCog} /></span>}
                                                {user.edit_access && <span title="Edit Access"><FontAwesomeIcon icon={faEdit} /></span>}
                                                {user.purchase_price_access && <span title="Purchase Price Access"><FontAwesomeIcon icon={faDollarSign} /></span>}
                                                {user.add_user_access && <span title="Add User Access"><FontAwesomeIcon icon={faUserPlus} /></span>}
                                                {user.give_access && <span title="Give Access"><FontAwesomeIcon icon={faKey} /></span>}
                                                {user.info_access && <span title="Info Access"><FontAwesomeIcon icon={faInfoCircle} /></span>}
                                            </>
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
                            <h3>Edit Role Permissions</h3>
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
                                        checked={editData.admin}
                                        onChange={handleAdminToggle}
                                    />
                                    Admin Privileges (Grants all permissions and locations)
                                </label>
                            </div>
                        </div>

                        <div className="form-section">
                            <h4>Location Access</h4>
                            <div className="ivi_holder_box">
                                <Select
                                    isMulti
                                    options={locations}
                                    className="ivi_select"
                                    classNamePrefix="ivi_select"
                                    value={editData.per_location_access}
                                    onChange={selected => setEditData({ ...editData, per_location_access: selected })}
                                    isDisabled={editData.admin}
                                />
                                {editData.admin && (
                                    <div className="admin-note">
                                        Admin users automatically have access to all locations
                                    </div>
                                )}
                            </div>
                        </div>

                        {!editData.admin && (
                            <div className="form-section">
                                <h4>Module Permissions</h4>
                                <div className="permission-grid">
                                    <div className="permission-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={editData.create_access}
                                                onChange={(e) => setEditData({ ...editData, create_access: e.target.checked })}
                                                disabled={editData.admin}
                                            />
                                            <span> Create Access</span>
                                        </label>
                                    </div>
                                    <div className="permission-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={editData.reverse_access}
                                                onChange={(e) => setEditData({ ...editData, reverse_access: e.target.checked })}
                                                disabled={editData.admin}
                                            />
                                            <span> Reverse Access</span>
                                        </label>
                                    </div>
                                    <div className="permission-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={editData.journal_access}
                                                onChange={(e) => setEditData({ ...editData, journal_access: e.target.checked })}
                                                disabled={editData.admin}
                                            />
                                            <span> Journal Access</span>
                                        </label>
                                    </div>
                                    <div className="permission-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={editData.coa_access}
                                                onChange={(e) => setEditData({ ...editData, coa_access: e.target.checked })}
                                                disabled={editData.admin}
                                            />
                                            <span> Chart of Accounts</span>
                                        </label>
                                    </div>
                                    <div className="permission-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={editData.item_access}
                                                onChange={(e) => setEditData({ ...editData, item_access: e.target.checked })}
                                                disabled={editData.admin}
                                            />
                                            <span> Items</span>
                                        </label>
                                    </div>
                                    <div className="permission-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={editData.transfer_access}
                                                onChange={(e) => setEditData({ ...editData, transfer_access: e.target.checked })}
                                                disabled={editData.admin}
                                            />
                                            <span> Transfers</span>
                                        </label>
                                    </div>
                                    <div className="permission-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={editData.sales_access}
                                                onChange={(e) => setEditData({ ...editData, sales_access: e.target.checked })}
                                                disabled={editData.admin}
                                            />
                                            <span> Sales</span>
                                        </label>
                                    </div>
                                    <div className="permission-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={editData.purchase_access}
                                                onChange={(e) => setEditData({ ...editData, purchase_access: e.target.checked })}
                                                disabled={editData.admin}
                                            />
                                            <span> Purchases</span>
                                        </label>
                                    </div>
                                    <div className="permission-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={editData.location_access}
                                                onChange={(e) => setEditData({ ...editData, location_access: e.target.checked })}
                                                disabled={editData.admin}
                                            />
                                            <span> Locations</span>
                                        </label>
                                    </div>
                                    <div className="permission-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={editData.customer_access}
                                                onChange={(e) => setEditData({ ...editData, customer_access: e.target.checked })}
                                                disabled={editData.admin}
                                            />
                                            <span> Customers</span>
                                        </label>
                                    </div>
                                    <div className="permission-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={editData.supplier_access}
                                                onChange={(e) => setEditData({ ...editData, supplier_access: e.target.checked })}
                                                disabled={editData.admin}
                                            />
                                            <span> Suppliers</span>
                                        </label>
                                    </div>
                                    <div className="permission-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={editData.cash_access}
                                                onChange={(e) => setEditData({ ...editData, cash_access: e.target.checked })}
                                                disabled={editData.admin}
                                            />
                                            <span> Cash Management</span>
                                        </label>
                                    </div>
                                    <div className="permission-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={editData.payment_access}
                                                onChange={(e) => setEditData({ ...editData, payment_access: e.target.checked })}
                                                disabled={editData.admin}
                                            />
                                            <span> Payments</span>
                                        </label>
                                    </div>
                                    <div className="permission-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={editData.report_access}
                                                onChange={(e) => setEditData({ ...editData, report_access: e.target.checked })}
                                                disabled={editData.admin}
                                            />
                                            <span> Reports</span>
                                        </label>
                                    </div>
                                    <div className="permission-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={editData.settings_access}
                                                onChange={(e) => setEditData({ ...editData, settings_access: e.target.checked })}
                                                disabled={editData.admin}
                                            />
                                            <span> Settings</span>
                                        </label>
                                    </div>
                                    <div className="permission-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={editData.edit_access}
                                                onChange={(e) => setEditData({ ...editData, edit_access: e.target.checked })}
                                                disabled={editData.admin}
                                            />
                                            <span> Edit Access</span>
                                        </label>
                                    </div>
                                    <div className="permission-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={editData.purchase_price_access}
                                                onChange={(e) => setEditData({ ...editData, purchase_price_access: e.target.checked })}
                                                disabled={editData.admin}
                                            />
                                            <span> Purchase Price</span>
                                        </label>
                                    </div>
                                    <div className="permission-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={editData.dashboard_access}
                                                onChange={(e) => setEditData({ ...editData, dashboard_access: e.target.checked })}
                                                disabled={editData.admin}
                                            />
                                            <span> Dashboard</span>
                                        </label>
                                    </div>
                                    <div className="permission-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={editData.add_user_access}
                                                onChange={(e) => setEditData({ ...editData, add_user_access: e.target.checked })}
                                                disabled={editData.admin}
                                            />
                                            <span> Add User</span>
                                        </label>
                                    </div>
                                    <div className="permission-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={editData.give_access}
                                                onChange={(e) => setEditData({ ...editData, give_access: e.target.checked })}
                                                disabled={editData.admin}
                                            />
                                            <span> Give Access</span>
                                        </label>
                                    </div>
                                    <div className="permission-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={editData.info_access}
                                                onChange={(e) => setEditData({ ...editData, info_access: e.target.checked })}
                                                disabled={editData.admin}
                                            />
                                            <span> Information</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {editData.admin && (
                            <div className="admin-permissions-note">
                                <FontAwesomeIcon icon={faUserShield} />
                                <span>Admin users have full access to all modules and locations.</span>
                            </div>
                        )}

                        <div className="form-actions">
                            <button className="btn btn-primary" onClick={editUser}>
                                Save Permission Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
};

export default RolePermission;