import { Link, Routes, Route } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBoxes, faChartLine,
  faPeopleCarry, faFileInvoiceDollar,
  faBalanceScale
} from '@fortawesome/free-solid-svg-icons';
import './reportMain.css';
import StockSummary from './itemSummary';
import StockAgeing from './stockAgeing';
import StockMovement from './stockMovement';
import LocationSummary from './locationSummary';
import TransferHistory from './transferHistory';
import TransferRecommendations from './transferRecommendation';
import SalesPerformance from './salesPerformance';
import CustomerInsights from './customerInsights';
import SupplierPerformance from './supplierPerformance';
import PurchaseMetric from './purchaseHistory';
import AgedPayables from './agedPayables';
import InventoryValuation from './inventoryValuation';
import ChartOfAccounts from './chartOfAccount';
import CustomerAgingReport from './customerAging';
import CashFlow from './cashflow';
import ProfitAndLoss from './profitLoss';
import TrialBalance from './trialBalance';
import SalesRecords from './salesRecords';

const ReportMain = ({ business, user, access }) => {
  return (
    <div className="dashboard-main">
      <div className="journal-header">
        <h1> 
          <FontAwesomeIcon icon={faChartLine} className="header-icon"/>
          Analytics & Reports
        </h1>
      </div>

      <Routes>
        <Route path="/" element={
          <div className="report-grid">
            {/* Stock Reports */}
            <section className="report-card">
              <h2 className="report-title">
                <FontAwesomeIcon icon={faBoxes} /> Stock Reports
              </h2>
              <div className="report-links">
                <Link to="stock-summary" className="report-link">• Item Stock Summary</Link>
                <Link to="stock-movement" className="report-link">• Stock Movement Log</Link>
                <Link to="stock-ageing" className="report-link">• Stock Ageing Report</Link>
              </div>
            </section>

            {/* Sales & Customer Reports */}
            <section className="report-card">
              <h2 className="report-title">
                <FontAwesomeIcon icon={faPeopleCarry} /> Sales & Customers
              </h2>
              <div className="report-links">
                <Link to="sales-performance" className="report-link">• Sales Performance</Link>
                <Link to="sales-records" className="report-link">• Sales Records</Link>
                <Link to="customer-insights" className="report-link">• Customer Insights</Link>
                <Link to="customer-aging" className="report-link">• Customer Aging Report</Link>
              </div>
            </section>

            {/* Supplier Reports */}
            <section className="report-card">
              <h2 className="report-title">
                <FontAwesomeIcon icon={faBalanceScale} /> Supplier Reports
              </h2>
              <div className="report-links">
                <Link to="purchase-metric" className="report-link">• Purchase Metrics</Link>
                <Link to="supplier-insights" className="report-link">• Supplier Insights</Link>
                <Link to="aged-payables" className="report-link">• Aged Payables</Link>
              </div>
            </section>

            {/* Financial Reports */}
            <section className="report-card">
              <h2 className="report-title">
                <FontAwesomeIcon icon={faFileInvoiceDollar} /> Financial Reports
              </h2>
              <div className="report-links">
                <Link to="profit-loss" className="report-link">• Profit & Loss</Link>
                <Link to="inventory-valuation" className="report-link">• Inventory Valuation</Link>
                <Link to="trial-balance" className="report-link">• Trial Balance</Link>
                <Link to="cash-flow" className="report-link">• Cash Flow</Link>
              </div>
            </section>
          </div>
        } />

        <Route path="stock-summary" element={<StockSummary business={business} user={user} access={access} />} />
        <Route path="stock-ageing" element={<StockAgeing business={business} user={user} access={access}/>} />
        <Route path="stock-movement" element={<StockMovement business={business} user={user} access={access}/>} />

        <Route path="location-summary" element={<LocationSummary business={business} user={user} access={access}/>} />
        <Route path="transfer-history" element={<TransferHistory business={business} user={user} access={access}/>} />
        <Route path="transfer-suggestions" element={<TransferRecommendations business={business} user={user} access={access}/>} />

        <Route path="sales-performance" element={<SalesPerformance business={business} user={user} access={access}/>} />
        <Route path="customer-insights" element={<CustomerInsights business={business} user={user} access={access}/>} />
        <Route path="sales-records" element={<SalesRecords business={business} user={user} access={access}/>} />
        <Route path="customer-aging" element={<CustomerAgingReport business={business} user={user} access={access}/>} />

        <Route path="purchase-metric" element={<PurchaseMetric business={business} user={user} access={access}/>} />
        <Route path="supplier-insights" element={<SupplierPerformance business={business} user={user} access={access}/>} />
        <Route path="aged-payables" element={<AgedPayables business={business} user={user} access={access}/>} />

        <Route path="profit-loss" element={<ProfitAndLoss business={business} user={user} access={access}/>} />
        <Route path="inventory-valuation" element={<InventoryValuation business={business} user={user} access={access}/>} />
        <Route path="chart-of-account" element={<ChartOfAccounts business={business} user={user} access={access}/>} />
        <Route path="trial-balance" element={<TrialBalance business={business} user={user} access={access}/>} />
        <Route path="cash-flow" element={<CashFlow business={business} user={user} access={access}/>} />
      </Routes>
    </div>
  );
};

export default ReportMain;