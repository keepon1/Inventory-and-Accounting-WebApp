import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTachometer, faArrowLeft, faPrint } from "@fortawesome/free-solid-svg-icons";
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
  });

  const [company, setCompany] = useState({
    business: '',
    contact: '',
    email: '',
    address: ''
  });

  const [loading, setLoading] = useState(false);
  const [printData, setPrintData] = useState(null);

  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSale = async () => {
      try {
        const response = await api.post(
          'view_sale',
          { business, number: sales },
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
          status: customer.status
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
    const total = subtotal - discount;
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
      date: sale.issueDate,
      dueDate: sale.dueDate,
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
      rate: sale.rate
    });
  };

  const total1 = total2();

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
                <h2 className="ia_description_word">{sale.number}</h2>
              </div>  
            </div>

            <div className="ivi_display_box">
              <div className="ivi_subboxes">
                <div className="ivi_holder_box">
                  <label className="ivi_label">Sales Type</label>
                  <input className="ivi_input" value={sale.type === 'regular' ? 'Regular Sales' : 'To Registered Customer'} readOnly title={sale.type === 'regular' ? 'Regular Sales' : 'To Registered Customer'} />
                </div>
                <div className="ivi_holder_box">
                  <label className="ivi_label">Customer Name</label>
                  <input className="ivi_input" value={sale.customer || sale.customer_info} readOnly title={sale.customer || sale.customer_info} />
                </div>
                <div className="ivi_holder_box">
                  <label className="ivi_label">Status</label>
                  <input className="ivi_input" value={sale.status} readOnly title={sale.status} />
                </div>
              </div>

              <div className="ivi_subboxes">
                <div className="ivi_holder_box">
                  <label className="ivi_label">Issue Date</label>
                  <input className="ivi_input" value={format(sale.issueDate, 'dd/MM/yyyy')} readOnly title={sale.issueDate} />
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
        </div>
      )}

      {printData && (
        <div className="print-container">
          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <h2 style={{ margin: 0 }}>{printData.business}</h2>
            <h3 style={{ margin: "0.5rem 0" }}>SALES INVOICE</h3>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div style={{ textAlign: "left" }}>
              <h4>Company Info</h4>
              {printData.company.address && <p><b>Address:</b> {printData.company.address}</p>}
              {printData.company.contact && <p><b>Phone:</b> {printData.company.contact}</p>}
              {printData.company.email && <p><b>Email:</b> {printData.company.email}</p>}
              {printData.location && <p><b>Location:</b> {printData.location}</p>}
            </div>
            <div style={{ textAlign: "right" }}>
              <h3>Invoice To</h3>
              <p><b>Invoice #:</b> {printData.id}</p>
              <p><b>Customer:</b> {printData.customer}</p>
              <p><b>Date:</b> {format(printData.date, 'dd/MM/yyyy')}</p>
              <p><b>Due Date:</b> {format(printData.dueDate, 'dd/MM/yyyy')}</p>
              <p><b>Payment Terms:</b> {printData.terms}</p>
              {printData.description && <p><b>Description:</b> {printData.description}</p>}
              {printData.contact && <p><b>Contact:</b> {printData.contact}</p>}
              {printData.address && <p><b>Address:</b> {printData.address}</p>}
            </div>
          </div>

          <table className="ia_main_table" style={{ marginTop: "1rem", width: "100%" }}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {printData.items.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.item}</td>
                  <td>{item.qty} {item.unit}</td>
                  <td>GHS {item.price}</td>
                  <td>GHS {(item.qty * item.price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "1rem", textAlign: "right" }}>
            <div style={{ display: "inline-block", textAlign: "left" }}>
              <p><b>Subtotal:</b> GHS {printData.totals.subtotal.toFixed(2)}</p>
              <p><b>Discount ({printData.discount}%):</b> - GHS {(printData.totals.subtotal * (printData.discount / 100)).toFixed(2)}</p>
              {printData.rate.map(levy => (
                <p key={levy.value}>
                  <b>{levy.value}:</b> + GHS {(printData.totals.total * (levy.rate/100)).toFixed(2)}
                </p>
              ))}
              <p style={{ fontSize: "1.1em", fontWeight: "bold" }}>
                <b>Grand Total:</b> GHS {printData.totals.grandTotal.toFixed(2)}
              </p>
            </div>
          </div>

          <div style={{ marginTop: "3rem", display: "flex", justifyContent: "space-between" }}>
            <div>
            </div>
            <div>
              <p>{printData.customer}</p>
              <p>____________________</p>
              <p>Customer Signature</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            font-size: 14px;
          }
        }
      `}</style>
    </>
  );
};

export default ViewSales;