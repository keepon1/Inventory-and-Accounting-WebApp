import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimesCircle, faEdit, faTachometer } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const ViewSales = ( {business, user, access, sales} ) => {
  const [sale, setSale] = useState({
    customer: '',
    customer_info: '',
    number: '',
    issueDate: '',
    dueDate: '',
    contact: '',
    address: '',
    discount: '',
    tax_levy: '',
    rate:[],
    description: '',
    location: '',
    total: 0,
    type:'',
    status: '',
  });
  
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSale = async () => {
      try {
        const response = await api.post(
          'view_sale',
          { business, number: sales },
        );

        if (response.status === 'error'){
          toast.error(response.message);
          return;
        }
        
        const { customer, items } = response.data;
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
          rate: JSON.parse(customer.tax_levy[0]).map(item => ({value: `${item.label}`, rate: `${item.rate}`})),
          type: customer.type,
          discount: customer.discount,
          status: customer.status
        });
        setItems(items);
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

  const reverse = async() => {
    try {
        const response = await api.post(
          'edit_sale',
          { business, number: sale.number, user },
        );
        
        if (response.status === 'success'){
          toast.success(response.message || `Sales Invoice ${sale.number} reversed successfully`);
          navigate(-1);
        }
        else{
          toast.error(response.message || 'Failed to reverse sales invoice');
        }
      }
    catch(error){
      toast.error("An error occurred while reversing the sales invoice.");
    }
  }

  const total2 = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const discount = sale.discount;
    const total = subtotal - discount;
    const levies = sale.rate.reduce((sum, levy) => {
      return sum + (total * (levy.rate / 100));
    }, 0);

    const grandTotal = sale.total;
    return{
      subtotal, discount, total, levies, grandTotal
    };
  };

  const total1 = total2();

  return (
    <div className="ivi_display_mainbox">
      <div className="ia_submain_box">
        <div className="ia_description_box">
          <h2 className="ia_description_word">Sales Invoice Details : {sale.number}</h2>
          <FontAwesomeIcon 
            icon={faTimesCircle} 
            className="close-button"
            onClick={() => navigate(-1)}
          />
        </div>

        <div className="ivi_display_box">
          {sale.type === 'regular' ? (
            <>
              <div className="ivi_subboxes">
                <div className="ivi_holder_box">
                  <label className="ivi_label">Sales Type</label>
                  <div className="ivi_input">Regular Sales</div>
                </div>
                <div className="ivi_holder_box">
                  <label className="ivi_label">Customer Name</label>
                  <div className="ivi_input">{sale.customer}</div>
                </div>
              </div>

              <div className="ivi_subboxes">
                <div className="ivi_holder_box">
                  <label className="ivi_label">Issue Date</label>
                  <div className="ivi_input">{sale.issueDate}</div>
                </div>
                <div className="ivi_holder_box">
                  <label className="ivi_label">Location</label>
                  <div className="ivi_input">{sale.location}</div>
                </div>
              </div>

              <div className="ivi_subboxes">
                <div className="ivi_holder_box">
                  <label className="ivi_label">Discount</label>
                  <div className="ivi_input">{sale.discount}</div>
                </div>
                <div className="ivi_holder_box">
                  <label className="ivi_label">Tax & Levy</label>
                  <div className="ivi_input">{sale.tax_levy}</div>
                </div>
              </div>
            </>
          ):(
            <>
              <div className="ivi_subboxes">
                <div className="ivi_holder_box">
                  <label className="ivi_label">Sales Type</label>
                  <div className="ivi_input">To Registered Customer</div>
                </div>
                <div className="ivi_holder_box">
                  <label className="ivi_label">Customer Name</label>
                  <div className="ivi_input">{sale.customer_info}</div>
                </div>
                <div className="ivi_holder_box">
                  <label className="ivi_label">Status</label>
                  <div className="ivi_input">{sale.status}</div>
                </div>
              </div>

              <div className="ivi_subboxes">
                <div className="ivi_holder_box">
                  <label className="ivi_label">Issue Date</label>
                  <div className="ivi_input">{sale.issueDate}</div>
                </div>
                <div className="ivi_holder_box">
                  <label className="ivi_label">Due Date</label>
                  <div className="ivi_input">{sale.dueDate}</div>
                </div>
                <div className="ivi_holder_box">
                  <label className="ivi_label">Description</label>
                  <div className="ivi_input">{sale.description}</div>
                </div>
              </div>

              <div className="ivi_subboxes">
                <div className="ivi_holder_box">
                  <label className="ivi_label">Location</label>
                  <div className="ivi_input">{sale.location}</div>
                </div>
                <div className="ivi_holder_box">
                  <label className="ivi_label">Discount</label>
                  <div className="ivi_input">{sale.discount}</div>
                </div>
                <div className="ivi_holder_box">
                  <label className="ivi_label">Tax & Levy</label>
                  <div className="ivi_input">{sale.tax_levy}</div>
                </div>
              </div>
            </>
          )}
          
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
                  <td>{item.price}</td>
                  <td>{(item.qty * item.price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ivi_display_box totals-section">
          <div className="total-row">
            <span>Subtotal:</span>
            <span>&#8373; {total1.subtotal}</span>
          </div>
          <div className="total-row">
            <span>Discount ({sale.discount}%):</span>
            <span>-&#8373; {(total1.subtotal * (sale.discount / 100)).toFixed(2)}</span>
          </div>
          {sale.rate.map(levy => (
            <div className="total-row" key={levy.value}>
                <span>{levy.value}:</span>
                <span>+{(total1.total * (levy.rate/100)).toFixed(2)}</span>
            </div>
          ))}
          <div className="total-row grand-total">
            <span>Grand Total:</span>
            <span>&#8373; {total1.grandTotal}</span>
          </div>
        </div>

        {sale.status === 'Reversed' ? (
          <></>
        ):(
          <>
          {(access.admin || (access.sales_access && access.per_location_access.includes(sale.location) && access.reverse_access)) && (
            <div className="ia_add_item_mbox">
              <button 
                className="btn btn-outline-red"
                onClick={() => reverse()}
              >
                <FontAwesomeIcon icon={faTachometer} /> reverse sales
              </button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
};

export default ViewSales;