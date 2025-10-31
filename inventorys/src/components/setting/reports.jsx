import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserShield,
  faUserCheck,
  faEdit,
  faTimesCircle,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { toast } from 'react-toastify';

const ReportPermissions = ({ business, user }) => {
    const [users, setUsers] = useState([]);
    const [showEdit, setShowEdit] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editData, setEditData] = useState({ 
        user_name: '',
        item_summary: false,
        stock_movement: false,
        stock_ageing: false,
        inventory_valuation: false,
        sales_records: false,
        sales_profit: false,
        purchase_records: false,
        cash_flow: false,
        sales_performance: false,
        customer_insights: false,
        supplier_insights: false,
        profit_and_loss: false,
        trial_balance: false,
        purchase_metrics: false,
        aged_payables: false,
        aged_receivables: false
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
            const respons = await api.post('get_user_report_permissions', { username });

            if (respons.status === 'error') {
                toast.error(respons.message || 'Failed to fetch user report permissions');
                return;
            };

            const response = respons.data;

            if (!response) {
                // Initialize with default values if no permissions exist
                setEditData({
                    user_name: username,
                    item_summary: false,
                    stock_movement: false,
                    stock_ageing: false,
                    inventory_valuation: false,
                    sales_records: false,
                    sales_profit: false,
                    purchase_records: false,
                    cash_flow: false,
                    sales_performance: false,
                    customer_insights: false,
                    supplier_insights: false,
                    profit_and_loss: false,
                    trial_balance: false,
                    purchase_metrics: false,
                    aged_payables: false,
                    aged_receivables: false
                });
            } else {
                setEditData({
                    user_name: response.user_name || username,
                    item_summary: response.item_summary || false,
                    stock_movement: response.stock_movement || false,
                    stock_ageing: response.stock_ageing || false,
                    inventory_valuation: response.inventory_valuation || false,
                    sales_records: response.sales_records || false,
                    sales_profit: response.sales_profit || false,
                    purchase_records: response.purchase_records || false,
                    cash_flow: response.cash_flow || false,
                    sales_performance: response.sales_performance || false,
                    customer_insights: response.customer_insights || false,
                    supplier_insights: response.supplier_insights || false,
                    profit_and_loss: response.profit_and_loss || false,
                    trial_balance: response.trial_balance || false,
                    purchase_metrics: response.purchase_metrics || false,
                    aged_payables: response.aged_payables || false,
                    aged_receivables: response.aged_receivables || false
                });
            }
            
            setShowEdit(true);
            document.addEventListener('mousedown', handleEditOverlay);
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while fetching user report permissions');
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
            item_summary: selectAll,
            stock_movement: selectAll,
            stock_ageing: selectAll,
            inventory_valuation: selectAll,
            sales_records: selectAll,
            sales_profit: selectAll,
            purchase_records: selectAll,
            cash_flow: selectAll,
            sales_performance: selectAll,
            customer_insights: selectAll,
            supplier_insights: selectAll,
            profit_and_loss: selectAll,
            trial_balance: selectAll,
            purchase_metrics: selectAll,
            aged_payables: selectAll,
            aged_receivables: selectAll
        }));
    };

    const areAllSelected = () => {
        return editData.item_summary &&
               editData.stock_movement &&
               editData.stock_ageing &&
               editData.inventory_valuation &&
               editData.sales_records &&
               editData.sales_profit &&
               editData.purchase_records &&
               editData.cash_flow &&
               editData.sales_performance &&
               editData.customer_insights &&
               editData.supplier_insights &&
               editData.profit_and_loss &&
               editData.trial_balance &&
               editData.purchase_metrics &&
               editData.aged_payables &&
               editData.aged_receivables;
    };

    const saveReportPermissions = async () => {
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
            item_summary: editData.item_summary,
            stock_movement: editData.stock_movement,
            stock_ageing: editData.stock_ageing,
            inventory_valuation: editData.inventory_valuation,
            sales_records: editData.sales_records,
            sales_profit: editData.sales_profit,
            purchase_records: editData.purchase_records,
            cash_flow: editData.cash_flow,
            sales_performance: editData.sales_performance,
            customer_insights: editData.customer_insights,
            supplier_insights: editData.supplier_insights,
            profit_and_loss: editData.profit_and_loss,
            trial_balance: editData.trial_balance,
            purchase_metrics: editData.purchase_metrics,
            aged_payables: editData.aged_payables,
            aged_receivables: editData.aged_receivables
        };

        try {
            setLoading(true);
            const response = await api.post('update_report_permissions', { detail: data});

            if (response.status === 'success') {
                toast.success(response.message || `${data.user_name} report permissions updated successfully`);
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
                toast.error(response.message || 'Error updating report permissions');
                setLoading(false);
                return;
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while updating report permissions');
            setLoading(false);
            if (error.response?.status === 401) {
                navigate('/sign_in');
            }
        }
    };

    const getActiveReportCount = (user) => {
        if (!user.report_permissions) return 0;
        return Object.values(user.report_permissions).filter(Boolean).length;
    };

    return (
        <div className="journal-container">
            <div className="journal-header">
                <div className='header-back'>
                    <Link to="../" className='back-link'>
                        <FontAwesomeIcon icon={faArrowLeft} className='back-icon' />
                    </Link>
                    <h2>
                        Report Permissions
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
                            <th>Active Reports</th>
                            <th>Report Permissions</th>
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
                                    {user.admin ? 'All Reports' : `${getActiveReportCount(user)}/17`}
                                </td>
                                <td>
                                    <div className="permission-tags">
                                        {user.admin ? (
                                            <span className="all-permissions" title="All Report Permissions">ALL REPORTS</span>
                                        ) : user.report_permissions ? (
                                            <span>Some Report Access</span>
                                        ) : (
                                            <span className="no-permissions">No Report Access</span>
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
                            <h3>Edit Report Permissions</h3>
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
                                    Select All Reports
                                </label>
                            </div>
                        </div>

                        <div className="form-section">
                            <h4>Report Permissions</h4>
                            <div className="permission-grid">
                                <div className="permission-item">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={editData.item_summary}
                                            onChange={(e) => setEditData({ ...editData, item_summary: e.target.checked })}
                                        />
                                        <span> Item Summary</span>
                                    </label>
                                </div>
                                <div className="permission-item">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={editData.stock_movement}
                                            onChange={(e) => setEditData({ ...editData, stock_movement: e.target.checked })}
                                        />
                                        <span> Stock Movement</span>
                                    </label>
                                </div>
                                
                                <div className="permission-item">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={editData.inventory_valuation}
                                            onChange={(e) => setEditData({ ...editData, inventory_valuation: e.target.checked })}
                                        />
                                        <span> Inventory Valuation</span>
                                    </label>
                                </div>
                                <div className="permission-item">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={editData.sales_records}
                                            onChange={(e) => setEditData({ ...editData, sales_records: e.target.checked })}
                                        />
                                        <span> Sales Records</span>
                                    </label>
                                </div>
                                <div className="permission-item">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={editData.sales_profit}
                                            onChange={(e) => setEditData({ ...editData, sales_profit: e.target.checked })}
                                        />
                                        <span> Sales Profit</span>
                                    </label>
                                </div>
                    
                                <div className="permission-item">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={editData.cash_flow}
                                            onChange={(e) => setEditData({ ...editData, cash_flow: e.target.checked })}
                                        />
                                        <span> Cash Flow</span>
                                    </label>
                                </div>
                                <div className="permission-item">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={editData.sales_performance}
                                            onChange={(e) => setEditData({ ...editData, sales_performance: e.target.checked })}
                                        />
                                        <span> Sales Performance</span>
                                    </label>
                                </div>
                                
                                <div className="permission-item">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={editData.profit_and_loss}
                                            onChange={(e) => setEditData({ ...editData, profit_and_loss: e.target.checked })}
                                        />
                                        <span> Profit & Loss</span>
                                    </label>
                                </div>
                                <div className="permission-item">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={editData.trial_balance}
                                            onChange={(e) => setEditData({ ...editData, trial_balance: e.target.checked })}
                                        />
                                        <span> Trial Balance</span>
                                    </label>
                                </div>
                                <div className="permission-item">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={editData.purchase_metrics}
                                            onChange={(e) => setEditData({ ...editData, purchase_metrics: e.target.checked })}
                                        />
                                        <span> Purchase Metrics</span>
                                    </label>
                                </div>
                                <div className="permission-item">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={editData.aged_payables}
                                            onChange={(e) => setEditData({ ...editData, aged_payables: e.target.checked })}
                                        />
                                        <span> Aged Payables</span>
                                    </label>
                                </div>
                                <div className="permission-item">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={editData.aged_receivables}
                                            onChange={(e) => setEditData({ ...editData, aged_receivables: e.target.checked })}
                                        />
                                        <span> Aged Receivables</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button className="btn btn-outline" onClick={saveReportPermissions}>
                                Save Report Permissions
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
};

export default ReportPermissions;