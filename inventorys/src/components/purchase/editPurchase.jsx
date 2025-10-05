import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimesCircle, faEdit } from "@fortawesome/free-solid-svg-icons";
import Select from 'react-select';
import api from "../api";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns"

const EditPurchase = ({ purchase, business, user }) => {
  const [purchaseData, setPurchaseData] = useState({
    supplier: '',
    address: '',
    contact: '',
    issueDate: null,
    dueDate: null,
    description: '',
    location: null,
    discount: 0,
    levies: []
  });

  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [currentItem, setCurrentItem] = useState({ item: null, qty: 1, price: 0 });
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [errors, setErrors] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [purchaseRes, itemsRes, locationsRes] = await Promise.all([
          api.post(
            'view_purchase',
            { business, number: purchase }
          ),
          api.post(
            'fetch_items',
            { business, page:0}
          ),
          api.post(
            'fetch_locations',
            { business }
          )
        ]);

        const purchaseD = purchaseRes;
        setPurchaseData({
          ...purchaseD.customer,
          location: {value: purchaseD.customer.loc, label: purchaseD.customer.loc},
          levies: purchaseD.levies
        });
        setPurchaseItems(purchaseD.items);

        setItems(itemsRes.map(item => ({
          value: item.name,
          label: `${item.code} - ${item.brand} ${item.name}`,
          ...item
        })));
        setLocations(locationsRes);

      } catch (error) {
        handleAuthError(error);
      }
    };
    fetchData();
  }, []);

  const calculateTotals = () => {
    const subtotal = purchaseItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const discountAmount = subtotal * (purchaseData.discount / 100);
    const netTotal = subtotal - discountAmount;
    
    const levyTotal = purchaseData.levies.reduce((sum, levy) => {
      return sum + (netTotal * (levy.percentage / 100));
    }, 0);

    return {
      subtotal: subtotal.toFixed(2),
      discount: discountAmount.toFixed(2),
      netTotal: netTotal.toFixed(2),
      levyTotal: levyTotal.toFixed(2),
      grandTotal: (netTotal + levyTotal).toFixed(2)
    };
  };

  const handleAddItem = () => {
    if (!purchaseData.location) {
      setErrors({ location: 'Please select location' });
      return;
    }
    
    if (!currentItem.item || currentItem.qty < 1) {
      setErrors({ items: 'Please select item and quantity' });
      return;
    }

    setPurchaseItems(prev => [...prev, {
      code: currentItem.item.code,
      name: currentItem.item.name,
      brand: currentItem.item.brand,
      qty: currentItem.qty,
      price: currentItem.price
    }]);
    
    setCurrentItem({ item: null, qty: 1, price: 0 });
    setErrors({});
  };

  const handleUpdate = async () => {
    if (!purchaseItems.length) {
      setErrors({ items: 'Add at least one item' });
      return;
    }

    const totals = calculateTotals();
    
    try {
      await api.post(
        'edit_purchase',
        {
          business,
          user,
          purchase,
          ...purchaseData,
          items: purchaseItems,
          totals,
          location: purchaseData.location.value
        },
      );
      navigate(-1);
    } catch (error) {
      handleAuthError(error);
    }
  };

  const deletePurchase = async () => {
    try {
      await api.post(
        'delete_purchase',
        { business, user, purchase },
      );
      navigate(-1);
    } catch (error) {
      handleAuthError(error);
    }
  };

  const handleAuthError = (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access');
      navigate('/sign_in');
    }
  };

  const totals = calculateTotals();

  return (
    <div className="ivi_display_mainbox">
      <div className="ia_submain_box">
        <div className="ia_description_box">
          <h2 className="ia_description_word">Edit Purchase Invoice #{purchase}</h2>
          <FontAwesomeIcon 
            icon={faTimesCircle} 
            className="close-button"
            onClick={() => navigate(-1)}
          />
        </div>

        {/* Supplier Details Section */}
        <div className="ivi_display_box">
          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label className="ivi_label">Supplier Name</label>
              <input
                type="text"
                className="ivi_input"
                value={purchaseData.supplier}
                onChange={e => setPurchaseData({...purchaseData, supplier: e.target.value})}
              />
            </div>
            
            <div className="ivi_holder_box">
              <label className="ivi_label">Contact</label>
              <input
                type="text"
                className="ivi_input"
                value={purchaseData.contact}
                onChange={e => setPurchaseData({...purchaseData, contact: e.target.value})}
              />
            </div>
          </div>

          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label className="ivi_label">Address</label>
              <input
                type="text"
                className="ivi_input"
                value={purchaseData.address}
                onChange={e => setPurchaseData({...purchaseData, address: e.target.value})}
              />
            </div>
            
            <div className="ivi_holder_box">
              <label className="ivi_label">Location*</label>
              <Select
                options={locations}
                className="ivi_select"
                classNamePrefix="ivi_select"
                value={purchaseData.location}
                onChange={selected => setPurchaseData({...purchaseData, location: selected})}
              />
              {errors.location && <div className="error-message">{errors.location}</div>}
            </div>
          </div>

          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label className="ivi_label">Discount (%)</label>
              <input
                type="number"
                className="ivi_input"
                min="0"
                max="100"
                value={purchaseData.discount}
                onChange={e => setPurchaseData({...purchaseData, discount: e.target.value})}
              />
            </div>
            
            <div className="ivi_holder_box">
              <label className="ivi_label">Taxes / Levies</label>
              <Select
                isMulti
                options={Option}
                className="ivi_select"
                classNamePrefix="ivi_select"
                value={purchaseData.levies}
                onChange={selected => setPurchaseData(prev => ({...prev, levies: selected}))}
              />
            </div>
          </div>
        </div>

        <div className="ivi_display_box" style={{ marginTop: '2rem' }}>
          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label className="ivi_label">Select Item*</label>
              <Select
                options={items}
                className="ivi_select"
                classNamePrefix="ivi_select"
                value={currentItem.item}
                onChange={selected => setCurrentItem({...currentItem, item: selected})}
              />
              {errors.items && <div className="error-message">{errors.items}</div>}
            </div>
            
            <div className="ivi_holder_box">
              <label className="ivi_label">Quantity*</label>
              <input
                type="number"
                className="ivi_input"
                min="1"
                value={currentItem.qty}
                onChange={e => setCurrentItem({...currentItem, qty: e.target.value})}
              />
            </div>

            <div className="ivi_holder_box">
              <label className="ivi_label">Unit Cost*</label>
              <input
                type="number"
                className="ivi_input"
                min="0"
                step="0.01"
                value={currentItem.price}
                onChange={e => setCurrentItem({...currentItem, price: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="ia_preview"
            onClick={handleAddItem}
          >
            Add Item
          </button>
        </div>

        {/* Items Table */}
        <div className="ia_table_box">
          <table className="ia_main_table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Brand</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit Cost</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchaseItems.map((item, index) => (
                <tr key={index}>
                  <td>{item.code}</td>
                  <td>{item.brand}</td>
                  <td>{item.name}</td>
                  <td>{item.qty}</td>
                  <td>{item.price}</td>
                  <td>{(item.qty * item.price).toFixed(2)}</td>
                  <td>
                    <FontAwesomeIcon
                      icon={faEdit}
                      className="item_action"
                      onClick={() => {
                        setCurrentItem({
                          item: items.find(i => i.code === item.code),
                          qty: item.qty,
                          price: item.price
                        });
                        setPurchaseItems(prev => prev.filter((_, i) => i !== index));
                      }}
                    />
                    <FontAwesomeIcon
                      icon={faTimesCircle}
                      className="item_action"
                      onClick={() => setPurchaseItems(prev => prev.filter((_, i) => i !== index))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="ivi_display_box totals-section">
        <div className="total-row">
            <span>Subtotal:</span>
            <span>₵{calculateTotals().subtotal}</span>
          </div>
          <div className="total-row">
            <span>Discount ({purchaseData.discount}%):</span>
            <span>-₵{calculateTotals().discount}</span>
          </div>
          {purchaseData.levies.map(levy => (
            <div className="total-row" key={levy.value}>
              <span>{levy.label}:</span>
              <span>+₵{(calculateTotals().netTotal * (levy.percentage/100)).toFixed(2)}</span>
            </div>
          ))}
          <div className="total-row grand-total">
            <span>Grand Total:</span>
            <span>&#8373; {totals.grandTotal}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="form-actions">
          <button className="btn_primary" onClick={() => setShowConfirm(true)}>
            Save Changes
          </button>
          <button 
            className="btn_danger"
            onClick={deletePurchase}
          >
            Delete Invoice
          </button>
        </div>

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="confirm_overlay">
            <div className="confirm_card">
              <h3>Confirm Changes</h3>
              <p>Are you sure you want to update this invoice?</p>
              <div className="confirm_actions">
                <button className="btn_confirm" onClick={handleUpdate}>
                  Confirm
                </button>
                <button className="btn_cancel" onClick={() => setShowConfirm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditPurchase;