import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimesCircle, faTachometer, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const ViewPurchase = ({ purchase, business, access, user }) => {
  const [purchaseData, setPurchaseData] = useState({
    supplier: '',
    number: '',
    issueDate: '',
    dueDate: '',
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

  const navigate = useNavigate();

  useEffect(() => {
    const fetchPurchase = async () => {
      try {
        const response = await api.post(
          'view_purchase',
          { business, number: purchase },
        );

        if (response.status === 'error') {
          toast.error(response.message || 'Failed to fetch purchase details');
          return;
        }
        const { customer, items } = response.data;
        setPurchaseData({
          ...customer,
          items,
          total: customer.total,
          location: customer.loc,
          tax_levy: JSON.parse(customer.tax_levy[0]).map(item => `${item.label} `),
          rate: JSON.parse(customer.tax_levy[0]).map(item => ({ value: `${item.label}`, rate: `${item.rate}` }))
        });

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

  const reverse = async () => {
    try {
      const response = await api.post(
        'edit_purchase',
        { business, number: purchaseData.number, user },
      );

      if (response.status === 'success') {
        toast.success(response.message || 'Purchase reversed successfully')
        navigate(-1);
      } else {
        toast.error(response.message || 'Failed to reverse purchase');
      }
    }
    catch (error) {
      toast.error("An error occurred while reversing the purchase.");
    }
  }

  const total2 = () => {
    const subtotal = purchaseData.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const discount = purchaseData.discount;
    const total = subtotal - discount;
    const levies = purchaseData.rate.reduce((sum, levy) => {
      return sum + (total * (levy.rate / 100));
    }, 0);

    const grandTotal = purchaseData.total;
    return {
      subtotal, discount, total, levies, grandTotal
    };
  };

  const total1 = total2();

  return (
    <div className="ivi_display_mainbox">
      <div className="ia_submain_box">
        <div className="ia_description_box">
          <div className="header-back">
            <Link to="../" className="back-link">
                <FontAwesomeIcon icon={faArrowLeft} className="back-icon" />
            </Link>
            <h2>{purchaseData.number}</h2>
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
              <input className="ivi_input" value={purchaseData.issueDate} readOnly title={purchaseData.issueDate} />
            </div>
            <div className="ivi_holder_box">
              <label>Due Date</label>
              <input className="ivi_input" value={purchaseData.dueDate} readOnly title={purchaseData.dueDate} />
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
            <span>Discount ({purchaseData.discount}%):</span>
            <span>-&#8373; {(total1.subtotal * (purchaseData.discount / 100)).toFixed(2)}</span>
          </div>
          {purchaseData.rate.map(levy => (
            <div className="total-row" key={levy.value}>
              <span>{levy.value}:</span>
              <span>+{(total1.total * (levy.rate / 100)).toFixed(2)}</span>
            </div>
          ))}
          <div className="total-row grand-total">
            <span>Grand Total:</span>
            <span>&#8373; {total1.grandTotal}</span>
          </div>
        </div>

        {purchaseData.status === 'Reversed' ? (
          <></>
        ) : (
          <>
            {(access.admin || (access.purchase_access && access.per_location_access.includes(purchaseData.location) && access.reverse_access)) && (
              <div className="ia_add_item_mbox">
                <button
                  className="btn btn-outline-red"
                  onClick={() => reverse()}
                >
                  <FontAwesomeIcon icon={faTachometer} /> reverse purchase
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ViewPurchase;