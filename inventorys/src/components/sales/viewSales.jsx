import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTachometer, faArrowLeft, faPrint, faShareFromSquare, faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { format } from "date-fns";

const ViewSales = ({ business, user, access, sales }) => {
  const [sale, setSale] = useState({
    customer: '',
    customer_info: '',
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
    type: '',
    status: '',
    time: null,
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

  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSale = async () => {
      try {
        const response = await api.post(
          'view_sale',
          { business, number: sales, format: '' },
        );

        if (response.status === 'error') {
          toast.error(response.message);
          return;
        }

        const { customer, items, company } = response.data;
        setSale({
          number: customer.number,
          customer: customer.customer,
          customer_info: customer.customer_info,
          contact: customer.contact,
          address: customer.address,
          issueDate: customer.issueDate,
          dueDate: customer.dueDate,
          description: customer.description,
          location: customer.loc,
          total: customer.total,
          createdBy: customer.by,
          tax_levy: JSON.parse(customer.tax_levy[0]).map(item => `${item.label} `),
          rate: JSON.parse(customer.tax_levy[0]).map(item => ({ value: `${item.label}`, rate: `${item.rate}` })),
          type: customer.type,
          discount: customer.discount,
          status: customer.status,
          time: customer.time,
        });
        setItems(items);
        setCompany(company);
      } catch (error) {
        toast.error("An error occurred while fetching the sales invoice.");
        if (error.response?.status === 401) {
          localStorage.removeItem('access');
          navigate('/sign_in');
        }
      }
    };
    fetchSale();
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
        'edit_sale',
        { business, number: sale.number, user },
      );

      if (response.status === 'success') {
        toast.success(response.message || `Sales Invoice ${sale.number} reversed successfully`);
        navigate(-1);
      } else {
        toast.error(response.message || 'Failed to reverse sales invoice');
        setLoading(false);
        return;
      }
    } catch (error) {
      toast.error("An error occurred while reversing the sales invoice.");
      setLoading(false);
      console.error('Error reversing sales invoice:', error);
    }
  };

  const total2 = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const discount = sale.discount;
    const total = (subtotal - (subtotal * discount / 100)).toFixed(2);
    const levies = sale.rate.reduce((sum, levy) => {
      return sum + (total * (levy.rate / 100));
    }, 0);

    const grandTotal = sale.total;

    return {
      subtotal, discount, total, levies, grandTotal
    };
  };

  const handlePrint = () => {
    setPrintData({
      id: sale.number,
      business: company.business,
      user: sale.createdBy,
      customer: sale.customer || sale.customer_info,
      date: new Date(sale.issueDate),
      dueDate: new Date(sale.dueDate),
      location: sale.location,
      description: sale.description,
      discount: sale.discount,
      terms: sale.type === 'regular' ? 'Regular Sales' : 'To Registered Customer',
      contact: sale.contact,
      address: sale.address,
      company: company,
      items: items,
      totals: total2(),
      tax_levy: sale.tax_levy,
      rate: sale.rate,
      time: sale.time
    });
  };

  const total1 = total2();

  const handleExport = async () => {
    try {
      const response = await api.post("view_sale", {
        business,
        number: sale.number,
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
        toast.error(response.message || "Failed to export transfers");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        navigate("/sign_in");
      } else {
        toast.error("Unexpected error while exporting transfers");
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
                <h2 className="ia_description_word">{sale.type === 'regular' ? 'Regular Sales' : 'To Registered Customer'} - {sale.number}</h2>
              </div> 

              <div className="journal-controls">
                <button className="share-icon" onClick={() => { setExporting(true); 
                document.addEventListener('mousedown', handleCreateOverlayClick);
                }}>
                    <FontAwesomeIcon icon={faShareFromSquare}/>
                </button>
              </div> 
            </div>

            <div className="ivi_display_box">
              <div className="ivi_subboxes">
                <div className="ivi_holder_box">
                  <label className="ivi_label">Customer Name</label>
                  <input className="ivi_input" value={sale.customer || sale.customer_info} readOnly title={sale.customer || sale.customer_info} />
                </div>
                <div className="ivi_holder_box">
                  <label className="ivi_label">Phone Number</label>
                  <input className="ivi_input" value={sale.contact} readOnly title={sale.type === 'regular' ? 'Regular Sales' : 'To Registered Customer'} />
                </div>
                <div className="ivi_holder_box">
                  <label className="ivi_label">Status</label>
                  <input className="ivi_input" value={sale.status} readOnly title={sale.status} />
                </div>
              </div>

              <div className="ivi_subboxes">
                <div className="ivi_holder_box">
                  <label className="ivi_label">Date</label>
                  <input className="ivi_input" value={`${format(sale.issueDate, 'dd/MM/yyyy')} - ${sale.time}`} readOnly title={sale.issueDate} />
                </div>
                <div className="ivi_holder_box">
                  <label className="ivi_label">Due Date</label>
                  <input className="ivi_input" value={format(sale.dueDate, 'dd/MM/yyyy')} readOnly title={sale.dueDate} />
                </div>
                <div className="ivi_holder_box">
                  <label className="ivi_label">Description</label>
                  <input className="ivi_input" value={sale.description} readOnly title={sale.description} />
                </div>
              </div>

              <div className="ivi_subboxes">
                <div className="ivi_holder_box">
                  <label className="ivi_label">Location</label>
                  <input className="ivi_input" value={sale.location} readOnly title={sale.location} />
                </div>
                <div className="ivi_holder_box">
                  <label className="ivi_label">Discount</label>
                  <input className="ivi_input" value={`${sale.discount}%`} readOnly title={sale.discount} />
                </div>
                <div className="ivi_holder_box">
                  <label className="ivi_label">Tax & Levy</label>
                  <input className="ivi_input" value={sale.tax_levy} readOnly title={sale.tax_levy} />
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
                    <th>Unit Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
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
                <span>Discount ({sale.discount}%):</span>
                <span>- GHS {(total1.subtotal * (sale.discount / 100)).toFixed(2)}</span>
              </div>
              {sale.rate.map(levy => (
                <div className="total-row" key={levy.value}>
                    <span>{levy.value}:</span>
                    <span>+ GHS {(total1.total * (levy.rate/100)).toFixed(2)}</span>
                </div>
              ))}
              <div className="total-row grand-total">
                <span>Grand Total:</span>
                <span>GHS {total1.grandTotal}</span>
              </div>
            </div>

            <div style={{ marginTop: 8, fontSize: 12, fontStyle: 'italic', textAlign: 'center' }}>
              NB: Goods sold are not returnable EXCEPT on WARRANTY(Manufacturer Defect).
            </div>
          
            <div className="ia_add_item_mbox">
              {sale.status !== 'Reversed' && (
                <>
                  {(access.admin || (access.sales_access && access.per_location_access.includes(sale.location) && access.reverse_access)) && (
                    <button 
                      className="btn btn-outline-red"
                      onClick={() => reverse()}
                    >
                      <FontAwesomeIcon icon={faTachometer} /> Reverse Sales
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
            <h3 style={{ margin: "2px 0", fontSize: "12px" }}>SALES</h3>
          </div>

          <div className="info-row" style={{ marginBottom: "4px" }}>
            <div style={{ textAlign: "left", width: "55%" }}>
              {printData.company.address && <div><strong>Addr: {printData.company.address}</strong></div>}
              {printData.company.contact && <div><strong>Tel: {printData.company.contact}</strong></div>}
            </div>
            <div style={{ textAlign: "right", width: "44%" }}>
              <div><strong>Customer: {printData.customer}</strong></div>
              <div><strong>No: {printData.id}</strong></div>
              <div><strong>Date: {format(printData.date, 'dd/MM/yyyy')}</strong></div>
              <div><strong>Time: {printData.time}</strong></div>
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
            <div><strong>Thank you for buying from us.</strong></div>
          </div>
         <div style={{ marginTop: "6px", textAlign: "center", fontSize: "11px", fontStyle: "italic" }}>
           <strong>NB: Goods sold are not returnable EXCEPT on WARRANTY (Manufacturer Defect).</strong>
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

export default ViewSales;