import { Link, Routes, Route  } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserCog, faBuilding, faUsers,
  faShieldAlt, faBell, faPlug
} from '@fortawesome/free-solid-svg-icons';
import './settingsMain.css';
import BusinessInfo from './companyInfo';
import TaxMain from './taxSettings';
import CurrencyMain from './currency';
import MeasurementUnit from './measurementUnits';
import CategoryMain from './category';
import UserAccount from './userAccounts';
import RolePermission from './roleAccess';
import UserActivity from './userActivity';

const SettingsMain = ({ business, user }) => {
  return (
    <div className="settings-container">
      <h1 className="settings-header">
        <FontAwesomeIcon icon={faUserCog} className="header-icon" />
        System Settings
      </h1>

      <Routes>
        <Route path="/" element={
      <div className="settings-grid">

        <section className="settings-card">
          <h2 className="settings-title">
            <FontAwesomeIcon icon={faBuilding} />
            Business Profile
          </h2>
          <div className="settings-links">
            <Link to="/dashboard/settings/business-info" className="settings-link">
              • Business Information
            </Link>
            <Link to="/dashboard/settings/tax" className="settings-link">
              • Tax And Levy
            </Link>
            <Link to="/dashboard/settings/currency" className="settings-link">
              • Currency
            </Link>
            <Link to="/dashboard/settings/unit" className="settings-link">
              • Measurement Units
            </Link>
            <Link to="/dashboard/settings/category" className="settings-link">
              • Inventory Category
            </Link>
          </div>
        </section>

        {/* User Management */}
        <section className="settings-card">
          <h2 className="settings-title">
            <FontAwesomeIcon icon={faUsers} />
            Team
          </h2>
          <div className="settings-links">
            <Link to="/dashboard/settings/users" className="settings-link">
              • User Accounts
            </Link>
            <Link to="/dashboard/settings/roles" className="settings-link">
              • Role Permissions
            </Link>
            <Link to="/dashboard/settings/activity" className="settings-link">
              • User Activity
            </Link>
          </div>
        </section>

        {/* Security */}
        <section className="settings-card">
          <h2 className="settings-title">
            <FontAwesomeIcon icon={faShieldAlt} />
            Security
          </h2>
          <div className="settings-links">
            <Link to="/dashboard/settings/2fa" className="settings-link">
              • Two-Factor Auth
            </Link>
            <Link to="/dashboard/settings/password" className="settings-link">
              • Password Policy
            </Link>
            <Link to="/dashboard/settings/sessions" className="settings-link">
              • Active Sessions
            </Link>
          </div>
        </section>

        <section className="settings-card">
          <h2 className="settings-title">
            <FontAwesomeIcon icon={faBell} />
            Alerts
          </h2>
          <div className="settings-links">
            <Link to="/dashboard/settings/email" className="settings-link">
              • Email Notifications
            </Link>
            <Link to="/dashboard/settings/sms" className="settings-link">
              • SMS Alerts
            </Link>
            <Link to="/dashboard/settings/webhooks" className="settings-link">
              • Webhook Integrations
            </Link>
          </div>
        </section>

      </div>
      }/>
        <Route path="business-info" element={<BusinessInfo business={business} user={user}/>} />
        <Route path="tax" element={<TaxMain business={business} user={user}/>} />
        <Route path="currency" element={<CurrencyMain business={business} user={user}/>} />
        <Route path="unit" element={<MeasurementUnit business={business} user={user}/>} />
        <Route path="category" element={<CategoryMain business={business} user={user}/>} />
        <Route path="users" element={<UserAccount business={business} />} user={user}/>
        <Route path="roles" element={<RolePermission business={business} user={user}/>} />
        <Route path="activity" element={<UserActivity business={business} user={user}/>} />
      </Routes>
    </div>
  );
};

export default SettingsMain;
