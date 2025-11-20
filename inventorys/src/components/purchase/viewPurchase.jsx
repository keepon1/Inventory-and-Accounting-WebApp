import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTachometer, faArrowLeft, faPrint, faShareFromSquare, faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { format } from "date-fns";

const ViewPurchase = ({ purchase, business, access, user }) => {
  const [purchaseData, setPurchaseData] = useState({
    supplier: '',
    number: '',
    issueDate: null,
    dueDate: null,
    contact: '',
    address: '',
    discount: '',
    tax_levy: '',
    rate: [],
    description: '',
    location: '',
    total: 0,
    items: [],
    status: '',
  });

  const [company, setCompany] = useState({
    business: '',
    contact: '',
    email: '',
    address: ''
  });

  const [loading, setLoading] = useState(false);
  const [printData, setPrintData] = useState(null);

  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');

  const overlayRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchPurchase = async () => {
      try {
        const response = await api.post(
          'view_purchase',
          { business, number: purchase, format: '' },
        );

        if (response.status === 'error') {
          toast.error(response.message || 'Failed to fetch purchase details');
          return;
        }
        const { customer, items, company } = response.data;
        setPurchaseData({
          ...customer,
          items,
          total: customer.total,
          location: customer.loc,
          tax_levy: JSON.parse(customer.tax_levy[0]).map(item => `${item.label} `),
          rate: JSON.parse(customer.tax_levy[0]).map(item => ({ value: `${item.label}`, rate: `${item.rate}` }))
        });
        setCompany(company);

      } catch (error) {
        toast.error("An error occurred while fetching purchase details.");
        if (error.response?.status === 401) {
          localStorage.removeItem('access');
          navigate('/sign_in');
        }
      }
    };
    fetchPurchase();
  }, []);

  useEffect(() => {
    if (printData) {
      setTimeout(() => {
        window.print();
        setPrintData(null);
      }, 300);
    }
  }, [printData]);

  const handleCreateOverlayClick = (e) => {
    if (overlayRef.current && !overlayRef.current.contains(e.target)) {
      setExporting(false);
    }
  };

  const reverse = async () => {
    if (loading) {
      toast.info('Please wait... reversing in progress');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(
        'edit_purchase',
        { business, number: purchaseData.number, user },
      );

      if (response.status === 'success') {
        toast.success(response.message || 'Purchase reversed successfully')
        navigate(-1);
      } else {
        toast.error(response.message || 'Failed to reverse purchase');
        setLoading(false);
        return;
      }
    }
    catch (error) {
      toast.error("An error occurred while reversing the purchase.");
      setLoading(false);
      console.error('Fetch error:', error);
    }
  }

  const total2 = () => {
    const subtotal = purchaseData.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const discount = purchaseData.discount;
    const total = (subtotal - (subtotal * discount / 100)).toFixed(2);
    const levies = purchaseData.rate.reduce((sum, levy) => {
      return sum + (total * (levy.rate / 100));
    }, 0);

    const grandTotal = purchaseData.total;
    return {
      subtotal, discount, total, levies, grandTotal
    };
  };

  const handlePrint = () => {
    setPrintData({
      id: purchaseData.number,
      business: company.business,
      supplier: purchaseData.supplier,
      date: new Date(purchaseData.issueDate),
      dueDate: new Date(purchaseData.dueDate),
      location: purchaseData.location,
      description: purchaseData.description,
      discount: purchaseData.discount,
      contact: purchaseData.contact,
      address: purchaseData.address,
      company: company,
      items: purchaseData.items,
      totals: total2(),
      tax_levy: purchaseData.tax_levy,
      rate: purchaseData.rate
    });
  };

  const total1 = total2();

  const handleExport = async () => {
    try {
      const response = await api.post("view_purchase", {
        business,
        number: purchaseData.number,
        format: exportFormat,
      });
      if (response.status === "success") {
        const link = document.createElement("a");
        link.href = `data:application/octet-stream;base64,${response.data.file}`;
        link.download = response.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setExporting(false);
      } else {
        toast.error(response.message || "Failed to export purchase");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        navigate("/sign_in");
      } else {
        toast.error("Unexpected error while exporting purchase");
      }
    }
  };

  return (
    <>
      {!printData && (
        <div className="ivi_display_mainbox">
          <div className="ia_submain_box">
            <div className="ia_description_box">
              <div className="header-back">
                <Link to="../" className="back-link">
                    <FontAwesomeIcon icon={faArrowLeft} className="back-icon" />
                </Link>
                <h2>{purchaseData.number}</h2>
              </div>

              <div className="journal-controls">
                <button className="share-icon" onClick={() => { 
                  setExporting(true); 
                  document.addEventListener('mousedown', handleCreateOverlayClick);
                }}>
                    <FontAwesomeIcon icon={faShareFromSquare}/>
                </button>
              </div>
            </div>

            <div className="ivi_display_box">
              <div className="ivi_subboxes">
                <div className="ivi_holder_box">
                  <label>Supplier</label>
                  <input className="ivi_input" value={purchaseData.supplier} readOnly title={purchaseData.supplier} />
                </div>
                <div className="ivi_holder_box">
                  <label>Contact</label>
                  <input className="ivi_input" value={purchaseData.contact} readOnly title={purchaseData.contact} />
                </div>
                <div className="ivi_holder_box">
                  <label>Address</label>
                  <input className="ivi_input" value={purchaseData.address} readOnly title={purchaseData.address} />
                </div>
              </div>

              <div className="ivi_subboxes">
                <div className="ivi_holder_box">
                  <label>Issue Date</label>
                  <input className="ivi_input" value={format(purchaseData.issueDate, 'dd/MM/yyyy')} readOnly title={purchaseData.issueDate} />
                </div>
                <div className="ivi_holder_box">
                  <label>Due Date</label>
                  <input className="ivi_input" value={format(purchaseData.dueDate, 'dd/MM/yyyy')} readOnly title={purchaseData.dueDate} />
                </div>
                <div className="ivi_holder_box">
                  <label>Description</label>
                  <input className="ivi_input" value={purchaseData.description} readOnly title={purchaseData.description} />
                </div>
              </div>

              <div className="ivi_subboxes">
                <div className="ivi_holder_box">
                  <label>Location</label>
                  <input className="ivi_input" value={purchaseData.location} readOnly title={purchaseData.location} />
                </div>
                <div className="ivi_holder_box">
                  <label>Discount</label>
                  <input className="ivi_input" value={`${purchaseData.discount}%`} readOnly title={`${purchaseData.discount}%`} />
                </div>
                <div className="ivi_holder_box">
                  <label>Tax & Levy</label>
                  <input className="ivi_input" value={purchaseData.tax_levy} readOnly title={purchaseData.tax_levy} />
                </div>
              </div>
            </div>

            <div className="ia_table_box">
              <table className="ia_main_table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Brand</th>
                    <th>Code</th>
                    <th>Model</th>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Unit Cost</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseData.items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.category}</td>
                      <td>{item.brand}</td>
                      <td>{item.code}</td>
                      <td>{item.model}</td>
                      <td>{item.item}</td>
                      <td>{item.qty}</td>
                      <td>{item.unit}</td>
                      <td>GHS {item.price}</td>
                      <td>GHS {(item.qty * item.price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ivi_display_box totals-section">
              <div className="total-row">
                <span>Subtotal:</span>
                <span>GHS {total1.subtotal}</span>
              </div>
              <div className="total-row">
                <span>Discount ({purchaseData.discount}%):</span>
                <span>- GHS {(total1.subtotal * (purchaseData.discount / 100)).toFixed(2)}</span>
              </div>
              {purchaseData.rate.map(levy => (
                <div className="total-row" key={levy.value}>
                  <span>{levy.value}:</span>
                  <span>+ GHS {(total1.total * (levy.rate / 100)).toFixed(2)}</span>
                </div>
              ))}
              <div className="total-row grand-total">
                <span>Grand Total:</span>
                <span>GHS {total1.grandTotal}</span>
              </div>
            </div>

            <div className="ia_add_item_mbox">
              {purchaseData.status !== 'Reversed' && (
                <>
                  {(access.admin || (access.purchase_access && access.per_location_access.includes(purchaseData.location) && access.reverse_access)) && (
                    <button
                      className="btn btn-outline-red"
                      onClick={() => reverse()}
                    >
                      <FontAwesomeIcon icon={faTachometer} /> Reverse Purchase
                    </button>
                  )}
                </>
              )}
              <button className="btn btn-outline" onClick={handlePrint}>
                <FontAwesomeIcon icon={faPrint} /> Print
              </button>
            </div>
          </div>

          {exporting && (
            <div className="modal-overlay">
              <div className="modal" ref={overlayRef}>
                <div className="modal-header">
                  <h3>Select Format</h3>
                  <button className="modal-close" onClick={() => setExporting(false)}>
                    <FontAwesomeIcon icon={faTimesCircle} />
                  </button>
                </div>
                <div className="modal-content">
                  <div className="export-options">
                    <input
                      type="radio"
                      name="exportFormat"
                      id="csv"
                      value="csv"
                      checked={exportFormat === 'csv'}
                      onChange={() => setExportFormat('csv')}
                    />
                    <label htmlFor="csv">CSV</label>
                  </div>
                  <div className="export-options">
                    <input
                      type="radio"
                      name="exportFormat"
                      id="xlsx"
                      value="xlsx"
                      checked={exportFormat === 'xlsx'}
                      onChange={() => setExportFormat('xlsx')}
                    />
                    <label htmlFor="xlsx">Excel</label>
                  </div>
                  <div className="export-options">
                    <input
                      type="radio"
                      name="exportFormat"
                      id="pdf"
                      value="pdf"
                      checked={exportFormat === 'pdf'}
                      onChange={() => setExportFormat('pdf')}
                    />
                    <label htmlFor="pdf">PDF</label>
                  </div>
                  <div className="modal-actions">
                    <button className="btn btn-outline" onClick={handleExport}>
                      Export
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {printData && (
        <div className="print-container pos80">
          <div style={{ textAlign: "center", marginBottom: "4px" }}>
            <h2 style={{ margin: 0 }}>{printData.business}</h2>
            <h3 style={{ margin: "2px 0", fontSize: "12px" }}>PURCHASE</h3>
          </div>

          <div className="info-row" style={{ marginBottom: "4px" }}>
            <div style={{ textAlign: "left", width: "60%" }}>
              {printData.company.address && <div><strong>Addr: {printData.company.address}</strong></div>}
              {printData.company.contact && <div><strong>Tel: {printData.company.contact}</strong></div>}
            </div>
            <div style={{ textAlign: "right", width: "38%" }}>
              <div><strong>Supplier: {printData.supplier}</strong></div>
              <div><strong>Inv#: {printData.id}</strong></div>
              <div><strong>Date: {format(printData.date, 'dd/MM/yyyy')}</strong></div>
            </div>
          </div>

          <div style={{ borderTop: "1px dashed #000", marginTop: "4px" }} />

          <table className="ia_main_table" style={{ marginTop: "4px", width: "100%", fontSize: "11px" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", width: "48%" }}>Item</th>
                <th style={{ textAlign: "center", width: "12%" }}>Qty</th>
                <th style={{ textAlign: "right", width: "20%" }}>Price</th>
                <th style={{ textAlign: "right", width: "20%" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {printData.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><strong>{item.item}</strong></td>
                  <td style={{ textAlign: "center" }}><strong>{item.qty}{item.unit ? ` ${item.unit}` : ''}</strong></td>
                  <td style={{ textAlign: "right" }}><strong>GHS {parseFloat(item.price).toFixed(2)}</strong></td>
                  <td style={{ textAlign: "right" }}><strong>GHS {(item.qty * item.price).toFixed(2)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "6px", textAlign: "right", fontSize: "11px" }}>
            <div><strong>Subtotal:</strong> GHS {printData.totals.subtotal.toFixed(2)}</div>
            <div><strong>Discount ({printData.discount}%):</strong> - GHS {(printData.totals.subtotal * (printData.discount / 100)).toFixed(2)}</div>
            {printData.rate.map(levy => (
              <div key={levy.value}><strong>{levy.value}:</strong> + GHS {(printData.totals.total * (levy.rate/100)).toFixed(2)}</div>
            ))}
            <div style={{ marginTop: "4px", fontWeight: "700" }}><strong>Grand Total:</strong> GHS {printData.totals.grandTotal.toFixed(2)}</div>
          </div>

          <div style={{ marginTop: "8px", textAlign: "center", fontSize: "11px" }}>
            <div><strong>Purchase Invoice</strong></div>
          </div>
        </div>
      )}

      <style>{`
        @page { size: 80mm auto; margin: 0; }
        @media print {
          body * { visibility: hidden; }
          .pos80, .pos80 * { visibility: visible; }
          .pos80 {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            max-width: 80mm;
            padding: 4mm;
            font-family: "Courier New", monospace;
            font-size: 12px;
            color: #000;
            background: #fff;
          }
          .pos80 h2, .pos80 h3 { margin: 0; padding: 0; }
          .pos80 .info-row { display: flex; justify-content: space-between; font-size: 11px; }
          .pos80 table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .pos80 thead th { border-bottom: 1px dashed #000; padding-bottom: 2px; }
          .pos80 th, .pos80 td { padding: 2px 0; }
          .pos80 .right { text-align: right; }
        }
      `}</style>
    </>
  );
};

export default ViewPurchase;