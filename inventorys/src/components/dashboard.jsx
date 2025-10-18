import React, { useState, useEffect } from "react";
import { Link, useNavigate, Routes, Route, useLocation } from "react-router-dom";
import api from "./api";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTachometerAlt, faBoxes, faShoppingCart,
  faTruck, faMapMarkerAlt, faBook,
  faChartBar, faCog, faSignOutAlt,
  faChevronLeft, faUserCircle,
  faTimes, faBars, faPaperPlane,
  faReceipt, faUsers, faUser,
  faBookOpen,
  faUserGroup
} from "@fortawesome/free-solid-svg-icons";

import DashMain from "./dashboards/dashMain";
import ItemMain from "./inventory_item/itemMain";
import TransferMain from "./transfer/transferMain";
import SalesMain from "./sales/salesMain";
import PurchaseMain from "./purchase/purchaseMain";
import LocationMain from "./location/locationMain";
import SupplierMain from "./supplier/supplierMain";
import CustomerMain from "./customer/customerMain";
import CashMain from "./cash/cashMain";
import PaymentMain from "./payment/paymentMain";
import JournalMain from "./journal/journalMain";
import AccountMain from "./COAs/coaMain";
import ReportMain from "./report/reportMain";
import SettingsMain from "./setting/settingsMain";
import Footer from './Footer';
import "./dashboard.css";
import AccessDenied from "./access";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Dashboard = () => {
  const business = localStorage.getItem('business');
  const user = localStorage.getItem('user');
  const [activeModule, setActiveModule] = useState('dashboard');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [accessData, setAccessData] = useState({});

  const navigate = useNavigate();
  const location = useLocation();
  const accesses = JSON.parse(localStorage.getItem('accesses'));


  const isAdmin = accessData.admin;
  const hasAccess = (key) => isAdmin || accessData[key] === true;

  useEffect(() => {
    const pathSegments = location.pathname.split('/');
    const module = pathSegments[pathSegments.length - 1] || 'dashboard';
    setActiveModule(module);
  }, [location]);

  useEffect(() => {
    const verifyAuth = async () => {
      setAccessData(accesses);
      try {
        const response = await api.post('main_dashboard', {user, business});
        setAccessData(response);
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem('access');
          navigate('/sign_in');
        }
      }
    };

    verifyAuth();

    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getComponentWithAccess = (accessKey, Component) => {
    return hasAccess(accessKey) ? <Component business={business} user={user} access={accessData} /> : <AccessDenied />;
  };

  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  const handleNavClick = () => {
    if (window.innerWidth <= 768) {
      setSidebarExpanded(false);
    }
  };

  const SignOut = async () => {
    try {
      await api.post('sign_out1', 'companyInfo');
      localStorage.removeItem('access');
      navigate('/sign_in');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    if (
      Object.keys(accessData).length > 0 &&
      !hasAccess('dashboard_access') &&
      location.pathname === '/dashboard'
    ) {
      const fallbackPaths = [
        { key: 'item_access', path: '/dashboard/inventory' },
        { key: 'transfer_access', path: '/dashboard/transfer' },
        { key: 'sales_access', path: '/dashboard/sales' },
        { key: 'purchase_access', path: '/dashboard/purchase' },
        { key: 'location_access', path: '/dashboard/location' },
        { key: 'supplier_access', path: '/dashboard/supplier' },
        { key: 'customer_access', path: '/dashboard/customer' },
        { key: 'cash_access', path: '/dashboard/cash' },
        { key: 'payment_access', path: '/dashboard/payment' },
        { key: 'journal_access', path: '/dashboard/journal' },
        { key: 'coa_access', path: '/dashboard/accounts' },
        { key: 'report_access', path: '/dashboard/report' },
        { key: 'settings_access', path: '/dashboard/settings' },
      ];

      const next = fallbackPaths.find(fb => hasAccess(fb.key));
      if (next) navigate(next.path, { replace: true });
    }
  }, [accessData, location.pathname, navigate]);

  return (
    <div className="dashboard-container">
      <ToastContainer position="top-right" autoClose={3000}/>
      <header className={`dashboard-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <div className="header-left">
            <button className="sidebar-toggle" onClick={toggleSidebar} aria-label="Toggle sidebar">
              <FontAwesomeIcon icon={faChevronLeft} className={sidebarExpanded ? 'expanded' : ''} />
            </button>
          </div>

          <div className="header-center">
            <span className="business-name">{business}</span>
          </div>

          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <FontAwesomeIcon icon={menuOpen ? faTimes : faBars} />
          </button>

          <nav className={`nav-menu ${menuOpen ? 'open' : ''}`}>
            <button className="btns btn-outline" onClick={SignOut}>
              <FontAwesomeIcon icon={faSignOutAlt} />Sign Out
            </button>
          </nav>
        </div>
      </header>

      <section className="main-section">
        <aside className={`dashboard-sidebar ${sidebarExpanded ? 'expanded' : 'collapsed'}`}>
          <div className="user-profile">
            <div className="user-avatar"><FontAwesomeIcon icon={faUserCircle} /></div>
            {sidebarExpanded && (
              <div className="user-info">
                <span className="user-name">{user}</span>
                <span className="user-role">{isAdmin ? "Administrator" : "User"}</span>
              </div>
            )}
          </div>

          <nav className="sidebar-nav">
            <ul>
              {hasAccess('dashboard_access') && (
                <li>
                  <Link 
                    to="/dashboard" 
                    className={`nav-item ${activeModule === 'dashboard' ? 'active' : ''}`}
                    onClick={handleNavClick}
                  >
                    <FontAwesomeIcon icon={faTachometerAlt} />
                    {sidebarExpanded && <span>Dashboard</span>}
                  </Link>
                </li>
              )}
              {hasAccess('item_access') && (
                <li>
                  <Link 
                    to="/dashboard/inventory" 
                    className={`nav-item ${activeModule === 'inventory' ? 'active' : ''}`}
                    onClick={handleNavClick}
                  >
                    <FontAwesomeIcon icon={faBoxes} />
                    {sidebarExpanded && <span>Inventory Items</span>}
                  </Link>
                </li>
              )}
              {hasAccess('transfer_access') && (
                <li>
                  <Link 
                    to="/dashboard/transfer" 
                    className={`nav-item ${activeModule === 'transfer' ? 'active' : ''}`}
                    onClick={handleNavClick}
                  >
                    <FontAwesomeIcon icon={faTruck} />
                    {sidebarExpanded && <span>Inventory Transfer</span>}
                  </Link>
                </li>
              )}
              {hasAccess('sales_access') && (
                <li>
                  <Link 
                    to="/dashboard/sales" 
                    className={`nav-item ${activeModule === 'sales' ? 'active' : ''}`}
                    onClick={handleNavClick}
                  >
                    <FontAwesomeIcon icon={faShoppingCart} />
                    {sidebarExpanded && <span>Sales Invoices</span>}
                  </Link>
                </li>
              )}
              {hasAccess('purchase_access') && (
                <li>
                  <Link 
                    to="/dashboard/purchase" 
                    className={`nav-item ${activeModule === 'purchase' ? 'active' : ''}`}
                    onClick={handleNavClick}
                  >
                    <FontAwesomeIcon icon={faTruck} />
                    {sidebarExpanded && <span>Purchase Invoices</span>}
                  </Link>
                </li>
              )}
              {hasAccess('location_access') && (
                <li>
                  <Link 
                    to="/dashboard/location" 
                    className={`nav-item ${activeModule === 'location' ? 'active' : ''}`}
                    onClick={handleNavClick}
                  >
                    <FontAwesomeIcon icon={faMapMarkerAlt} />
                    {sidebarExpanded && <span>Stores / Locations</span>}
                  </Link>
                </li>
              )}
              {hasAccess('supplier_access') && (
                <li>
                  <Link 
                    to="/dashboard/supplier" 
                    className={`nav-item ${activeModule === 'supplier' ? 'active' : ''}`}
                    onClick={handleNavClick}
                  >
                    <FontAwesomeIcon icon={faUserGroup} />
                    {sidebarExpanded && <span>Suppliers</span>}
                  </Link>
                </li>
              )}
              {hasAccess('customer_access') && (
                <li>
                  <Link 
                    to="/dashboard/customer" 
                    className={`nav-item ${activeModule === 'customer' ? 'active' : ''}`}
                    onClick={handleNavClick}
                  >
                    <FontAwesomeIcon icon={faUsers} />
                    {sidebarExpanded && <span>Customers</span>}
                  </Link>
                </li>
              )}
              {hasAccess('cash_access') && (
                <li>
                  <Link 
                    to="/dashboard/cash" 
                    className={`nav-item ${activeModule === 'cash' ? 'active' : ''}`}
                    onClick={handleNavClick}
                  >
                    <FontAwesomeIcon icon={faReceipt} />
                    {sidebarExpanded && <span>Cash Receipts Journals</span>}
                  </Link>
                </li>
              )}
              {hasAccess('payment_access') && (
                <li>
                  <Link 
                    to="/dashboard/payment" 
                    className={`nav-item ${activeModule === 'payment' ? 'active' : ''}`}
                    onClick={handleNavClick}
                  >
                    <FontAwesomeIcon icon={faPaperPlane} />
                    {sidebarExpanded && <span>Payment Journals</span>}
                  </Link>
                </li>
              )}
              {hasAccess('journal_access') && (
                <li>
                  <Link 
                    to="/dashboard/journal" 
                    className={`nav-item ${activeModule === 'journal' ? 'active' : ''}`}
                    onClick={handleNavClick}
                  >
                    <FontAwesomeIcon icon={faBookOpen} />
                    {sidebarExpanded && <span>General Journal</span>}
                  </Link>
                </li>
              )}
              {hasAccess('coa_access') && (
                <li>
                  <Link 
                    to="/dashboard/accounts" 
                    className={`nav-item ${activeModule === 'accounts' ? 'active' : ''}`}
                    onClick={handleNavClick}
                  >
                    <FontAwesomeIcon icon={faBook} />
                    {sidebarExpanded && <span>Chart Of Accounts</span>}
                  </Link>
                </li>
              )}
              {hasAccess('report_access') && (
                <li>
                  <Link 
                    to="/dashboard/report" 
                    className={`nav-item ${activeModule === 'report' ? 'active' : ''}`}
                    onClick={handleNavClick}
                  >
                    <FontAwesomeIcon icon={faChartBar} />
                    {sidebarExpanded && <span>Reports</span>}
                  </Link>
                </li>
              )}
              {hasAccess('settings_access') && (
                <li>
                  <Link 
                    to="/dashboard/settings" 
                    className={`nav-item ${activeModule === 'settings' ? 'active' : ''}`}
                    onClick={handleNavClick}
                  >
                    <FontAwesomeIcon icon={faCog} />
                    {sidebarExpanded && <span>Settings</span>}
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        </aside>

        <main className={`dashboard-main ${sidebarExpanded ? 'expanded' : 'collapsed'}`}>
          <Routes>
            <Route index element={getComponentWithAccess('dashboard_access', DashMain)} />
            <Route path="inventory/*" element={getComponentWithAccess('item_access', ItemMain)} />
            <Route path="transfer/*" element={getComponentWithAccess('transfer_access', TransferMain)} />
            <Route path="sales/*" element={getComponentWithAccess('sales_access', SalesMain)} />
            <Route path="purchase/*" element={getComponentWithAccess('purchase_access', PurchaseMain)} />
            <Route path="location/*" element={getComponentWithAccess('location_access', LocationMain)} />
            <Route path="supplier/*" element={getComponentWithAccess('supplier_access', SupplierMain)} />
            <Route path="customer/*" element={getComponentWithAccess('customer_access', CustomerMain)} />
            <Route path="cash/*" element={getComponentWithAccess('cash_access', CashMain)} />
            <Route path="payment/*" element={getComponentWithAccess('payment_access', PaymentMain)} />
            <Route path="journal/*" element={getComponentWithAccess('journal_access', JournalMain)} />
            <Route path="accounts/*" element={getComponentWithAccess('coa_access', AccountMain)} />
            <Route path="report/*" element={getComponentWithAccess('report_access', ReportMain)} />
            <Route path="settings/*" element={getComponentWithAccess('settings_access', SettingsMain)} />
          </Routes>
        </main>
      </section>
      <Footer />
    </div>
  );
};

export default Dashboard;