import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faTimesCircle,
  faEye,
  faUserShield,
  faUserCheck,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { toast } from 'react-toastify';
import { set } from 'date-fns';

const UserActivity = ({ business, user }) => {
    const [users, setUsers] = useState([{user_name: 'All Users', admin: false}]);
    const [activities, setActivities] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const navigate = useNavigate();

    const handleSearch = (e) => {
        setSearchQuery(e.target.value.toLowerCase());
    };

    const filteredUsers = users.filter(user =>
        user.user_name.toLowerCase().includes(searchQuery)
    );

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await api.post('fetch_users', { business, user });

                if (response.status === 'error') {
                    console.error(response.message || 'Failed to fetch users');
                    return;
                }
                setUsers(prev => [...prev, ...response.data]);
            } catch (error) {
                toast.error("An error occurred while fetching users");
                console.error(error);
                if (error.response?.status === 401) {
                    localStorage.removeItem('access');
                    navigate('/sign_in');
                }
            }
        };
        fetchUsers();
    }, []);

    const fetchUserActivities = async (username) => {
        setLoadingActivities(true);
        try {
            const response = await api.post('fetch_user_activities', { 
                business, 
                username,
                user
            });

            if (response.status === 'error'){
                toast.error(response.message || "fetching history failed");
                return;
            }
            setActivities(response.data);
            setLoadingActivities(false);
        } catch (error) {
            toast.error()
            console.error('Error fetching activities:', error);
            setLoadingActivities(false);
        }
    };

    const openDetails = async (user) => {
        setSelectedUser(user);
        await fetchUserActivities(user.user_name);
        setShowDetails(true);
    };

    const formatDate = (dateString) => {
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    return (
        <div className="journal-container">
            <div className="journal-header">
                <div className='header-back'>
                    <Link to="../" className='back-link'>
                        <FontAwesomeIcon icon={faArrowLeft} className='back-icon' />
                    </Link>
                    <h2>
                        User Activity Monitoring
                    </h2>
                </div>
            </div>

            <div className="journal-filters">
                <div></div>
                <div className="ivi_display_box1">
                    <div className="ivi_subboxes1">
                        <div className="ivi_holder_box1">
                            <input 
                                onChange={handleSearch} 
                                type="text" 
                                placeholder="Search users..." 
                                className='ivi_input'
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="items-table-box">
                <table className="items-table">
                    <thead className="table-header">
                        <tr>
                            <th>View</th>
                            <th>Username</th>
                            <th>Role</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user, index) => {
                            const lastActivity = activities.find(a => a.user === user.user_name);
                            return (
                                <tr key={user.user_name} className="table-row">
                                    <td className="table-row">
                                        <button 
                                            className="action-button" 
                                            onClick={() => openDetails(user)}
                                        >
                                            <FontAwesomeIcon icon={faEye} />
                                        </button>
                                    </td>
                                    <td>{user.user_name}</td>
                                    <td>
                                        {user.admin ? (
                                            <span className="role-badge admin-badge">
                                                <FontAwesomeIcon icon={faUserShield} /> Admin
                                            </span>
                                        ) : user.user_name !== 'All Users' ? (
                                            <span className="role-badge user-badge">
                                                <FontAwesomeIcon icon={faUserCheck} /> User
                                            </span>
                                        ) : 'N/A'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {showDetails && selectedUser && (
                <div className="modal-overlay">
                    <div className="modal wide-modal">
                        <div className="modal-header">
                            <h3>
                                Activity History for {selectedUser.user_name}
                            </h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowDetails(false)}
                            >
                                <FontAwesomeIcon icon={faTimesCircle} />
                            </button>
                        </div>

                        {loadingActivities ? (
                            <div className="loading-spinner">Loading activities...</div>
                        ) : (
                            <div className="activity-content">
                                {activities.length > 0 ? (
                                    <>
                                        <div className="activity-summary">
                                            <div className="summary-item">
                                                <span className="summary-label">Total Activities:</span>
                                                <span className="summary-value">{activities.length}</span>
                                            </div>
                                            <div className="summary-item">
                                                <span className="summary-label">Last Activity:</span>
                                                <span className="summary-value">
                                                    {formatDate(activities[0].date)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="activity-table-container">
                                            <table className="activity-table">
                                                <thead>
                                                    <tr>
                                                        <th>Area</th>
                                                        <th>Action</th>
                                                        <th>Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {activities.map((activity, index) => (
                                                        <tr key={`${activity.date}-${index}`}>
                                                            <td>{activity.area}</td>
                                                            <td>{activity.head}</td>
                                                            <td>{formatDate(activity.date)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                ) : (
                                    <div className="no-activities">
                                        No activities found for this user.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserActivity;