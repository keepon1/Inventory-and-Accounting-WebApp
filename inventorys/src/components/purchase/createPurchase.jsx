import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimesCircle, faEdit } from "@fortawesome/free-solid-svg-icons";
import Select from 'react-select';
import AsyncSelect from "react-select/async";
import api from "../api";
import { useNavigate } from "react-router-dom";
import enableKeyboardScrollFix from "../../utils/scroll";
import { itemsLoadOptions, sourceLocationsLoadOptions, supplierLoadOptions, taxLevyLoadOptions } from "../../utils/fetchData";
import { toast } from "react-toastify";
  
const CreatePurchase = ({ business, user, access }) => {
  const [purchase, setPurchase] = useState({
    supplier: '',
    date: new Date().toISOString().split("T")[0],
    dueDate: new Date().toISOString().split("T")[0],
    partPaymentAmount: 0,
    description: '',
    account: null,
    location: null,
    terms: null,
    discount: 0,
    selectedLevi: []
  });
  const [items, setItems] = useState([]);
  const [supplier, setSupplier] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [taxLevy, setTaxLevy] = useState([]);
  const [locations, setLocations] = useState([]);
  const [currentItem, setCurrentItem] = useState({ item: null, qty: 1, price: 0 });
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [errors, setErrors] = useState({});
  const [termOption, setTermOption] = useState({account:false, amount:false, due:false});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, locationsRes, taxRes, supplierRes, accountRes] = await Promise.all([
          api.post('fetch_items_for_select', {business, user, value:'', location: ''}),
          api.post('fetch_source_locations_for_select', { business, user, value:'' }),
          api.post('fetch_tax_levy', { business, value:'' }),
          api.post('fetch_supplier', { business, value:''}),
          api.post('fetch_accounts', { business: business, type:'payment' }),
        ]);

        if (itemsRes.status === 'error' || locationsRes.status === 'error' || taxRes.status === 'error' || supplierRes.status === 'error' || accountRes.status === 'error') {
          toast.error('Failed to fetch initial data');
          return;
        }
        setItems(itemsRes.data);
        setTaxLevy(taxRes);
        setSupplier(supplierRes);
        const allowed = ['Bank', 'Cash', 'Mobile Money']
        const account = accountRes.filter(acc => allowed.includes(acc.account_type__name))
        .map(acc => ({
          value: acc.code,
          label: `${acc.code} - ${acc.name}`,
          type: acc.account_type__name
        }));
        setAccounts(account);
        setLocations(locationsRes.data);

      } catch (error) {
        toast.error("An error occurred while fetching data.");
        handleAuthError(error);
      }
    };
    fetchData();
    const cleanup = enableKeyboardScrollFix();
    return cleanup;
  }, []);

  const calculateTotals = () => {
    const subtotal = purchaseItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const discountAmount = subtotal * (purchase.discount / 100);
    const netTotal = subtotal - discountAmount;
    
    const levyAmount = purchase.selectedLevi.reduce((sum, levy) => {
      return sum + (netTotal * (levy.rate / 100));
    }, 0);

    return {
      subtotal,
      discountAmount,
      netTotal,
      levyAmount,
      grandTotal: netTotal + levyAmount
    };
  };

  const handleAddItem = async () => {
    if (!purchase.location) {
      toast.info('Please select a location');
      return;
    }

    if (!purchase.supplier) {
      toast.info('Please select a supplier');
      return;
    }

    if (!purchase.account && purchase.terms.label !== 'Credit') {
      toast.info('Please select an account');
      return;
    }
    
    if (!currentItem.item || currentItem.qty < 1) {
      toast.info('Please select item');
      return;
    }

    if (currentItem.qty < 1) {
      toast.info('Quantity must be at least 1');
      return;
    }

    if (currentItem.price < 0) {
      toast.info('Price cannot be negative');
      return;
    }

    try {
      setPurchaseItems(prev => [...prev, {
        model: currentItem.item.model,
        unit__suffix: currentItem.item.unit__suffix,
        category__name: currentItem.item.category__name,
        code: currentItem.item.code,
        name: currentItem.item.item_name,
        value: currentItem.item.item_name,
        label: currentItem.item.item_name,
        item_name: currentItem.item.item_name,
        brand: currentItem.item.brand,
        qty: currentItem.qty,
        price: currentItem.price
      }]);
      
      setCurrentItem({ item: null, qty: 1, price: 0 });
    } catch (error) {
      handleAuthError(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!purchaseItems.length) {
      toast.info('Add at least one item to create a purchase invoice');
      return;
    }

    const formData = new FormData();
    formData.append('user', user);
    formData.append('business', business);
    formData.append('description', purchase.description);
    formData.append('supplier', purchase.supplier.value);
    formData.append('date', purchase.date);
    formData.append('dueDate', purchase.dueDate);
    formData.append('location', purchase.location.value);
    formData.append('discount', purchase.discount);
    formData.append('terms', purchase.terms.value);
    formData.append('account', purchase.account?.value || `10101 - ''`);
    formData.append('partpayment', purchase.partPaymentAmount);
    formData.append('totals', JSON.stringify(totals));
    formData.append('levy', JSON.stringify(purchase.selectedLevi))

    purchaseItems.forEach((item) =>{
      formData.append('items', JSON.stringify({name:item.name, qty:item.qty, price:item.price}));
    });
    
    try {
      const response = await api.post(
        'add_purchase',
        formData,
      );
      if (response.status === 'success') {toast.success(response.message); navigate(-1)}
      else{ toast.error(response.message || 'Failed to create purchase invoice'); return;}
    } catch (error) {
      toast.error("An error occurred while creating the purchase invoice.");
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
          <h2 className="ia_description_word">Create Purchase Invoice</h2>
          <FontAwesomeIcon 
            icon={faTimesCircle} 
            className="close-button"
            onClick={() => navigate(-1)}
          />
        </div>

        <div className="ivi_display_box">
          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label className="ivi_label">Supplier</label>
                <AsyncSelect
                  cacheOptions
                  defaultOptions={supplier}
                  className="ivi_select"
                  classNamePrefix="ivi_select"
                  loadOptions={supplierLoadOptions(business, user)}
                  value={purchase.supplier}
                  onChange={selected => [setPurchase({...purchase, supplier: selected}), setErrors('')]}
                />
                {errors.supplier && <div className="error-message">{errors.supplier}</div>}
            </div>
            <div className="ivi_holder_box">
              <label className="ivi_label">Description</label>
              <input
                type="text"
                className="ivi_input"
                value={purchase.description}
                onChange={e => setPurchase({...purchase, description: e.target.value})}
              />
            </div>
            <div className="ivi_holder_box">
              <label className="ivi_label">Payment Terms</label>
              <Select
                options={[
                  { value: 'Full Payment', label: 'Full Payment' },
                  { value: 'Part Payment', label: 'Part Payment' },
                  { value: 'Credit', label: 'Credit' },
                ]}
                className="ivi_select"
                classNamePrefix="ivi_select"
                value={purchase.terms}
                onChange={(selected) => {
                  if (selected.value === 'Full Payment') {
                    setTermOption({ ...termOption, account: true, amount: false, due: false });
                  } else if (selected.value === 'Part Payment') {
                    setTermOption({ ...termOption, account: true, amount: true, due: true });
                  } else if (selected.value === 'Credit') {
                    setTermOption({ ...termOption, account: false, amount: false, due: true });
                  }

                  setPurchase({ ...purchase, terms: selected });
                }}
              />
            </div>
          </div>

          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label className="ivi_label">Date</label>
              <input
                type="date"
                className="ivi_input"
                value={purchase.date}
                onChange={e => setPurchase({...purchase, date: e.target.value})}
              />
            </div>
            <div className="ivi_holder_box">
              <label className="ivi_label">Location*</label>
              <AsyncSelect
                cacheOptions
                defaultOptions={locations}
                className="ivi_select"
                classNamePrefix="ivi_select"
                loadOptions={sourceLocationsLoadOptions(business, user)}
                value={purchase.location}
                onChange={selected => [setPurchase({...purchase, location: selected}), setErrors('')]}
              />
              {errors.location && <div className="error-message">{errors.location}</div>}
            </div>
            {termOption.account &&
            <div className="ivi_holder_box">
              <label className="ivi_label">Payment Method</label>
              <Select
                options={accounts}
                className="ivi_select"
                classNamePrefix="ivi_select"
                value={purchase.account}
                onChange={selected => [setPurchase({...purchase, account: selected}), setErrors('')]}
                required
              />
              {errors.account && <div className="error-message">{errors.account}</div>}
            </div>}

            {termOption.due &&
            <div className="ivi_holder_box">
              <label className="ivi_label">Due Date</label>
              <input
                type="date"
                className="ivi_input"
                min="0"
                step="0.01"
                value={purchase.dueDate}
                onChange={e => setPurchase({...purchase, dueDate: e.target.value})}
              />
            </div>}
          </div>

          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label className="ivi_label">Discount (%)</label>
              <input
                type="number"
                className="ivi_input"
                min="0"
                max="100"
                value={purchase.discount}
                onChange={e => setPurchase({...purchase, discount: e.target.value})}
              />
            </div>
            <div className="ivi_holder_box">
              <label className="ivi_label">Taxes / Levies</label>
              <AsyncSelect
                isMulti
                cacheOptions
                defaultOptions={taxLevy}
                className="ivi_select"
                classNamePrefix="ivi_select"
                loadOptions={taxLevyLoadOptions(business)}
                value={purchase.selectedLevi}
                onChange={selected => setPurchase({...purchase, selectedLevi: selected})}
                />
            </div>
            {termOption.amount &&
            <div className="ivi_holder_box">
              <label className="ivi_label">Part Payment Amount</label>
              <input
                type="number"
                className="ivi_input"
                min="0"
                step="0.01"
                value={purchase.partPaymentAmount}
                onChange={e => setPurchase({...purchase, partPaymentAmount: e.target.value})}
              />
            </div>}
          </div>
        </div>

        <div className="ivi_display_box" style={{ marginTop: '2rem' }}>
          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label className="ivi_label">Select Item*</label>
              <AsyncSelect
                cacheOptions
                defaultOptions={items}
                className="ivi_select"
                classNamePrefix="ivi_select"
                loadOptions={itemsLoadOptions(business, user, '')}
                value={currentItem.item}
                onChange={selected => setCurrentItem({...currentItem, item: selected, price:selected.cost})}
              />
              {errors.items && <div className="error-message">{errors.items}</div>}
            </div>
          </div>
            
          <div className="ivi_subboxes">
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
          </div>

          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label className="ivi_label">Unit Cost*</label>
              <input
                type="number"
                className="ivi_input"
                min="0"
                step="0.01"
                value={currentItem.price}
                onChange={e => setCurrentItem({...currentItem, price: e.target.value})}
                disabled={!access.purchase_price_access && !access.admin}
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-outline"
            onClick={handleAddItem}
          >
            Add Item
          </button>
        </div>

        <div className="ia_table_box">
          <table className="ia_main_table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Code</th>
                <th>Brand</th>
                <th>Model</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Unit Cost</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchaseItems.map((item, index) => (
                <tr key={index}>
                  <td>{item.category__name}</td>
                  <td>{item.code}</td>
                  <td>{item.brand}</td>
                  <td>{item.model}</td>
                  <td>{item.name}</td>
                  <td>{item.qty}</td>
                  <td>{item.unit__suffix}</td>
                  <td>{item.price}</td>
                  <td>{(item.qty * item.price).toFixed(2)}</td>
                  <td>
                    <FontAwesomeIcon
                      icon={faEdit}
                      className="item_action"
                      onClick={() => {
                        setCurrentItem({
                          item: purchaseItems.find(i => i.code === item.code),
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

        <div className="ivi_display_box totals-section">
            <div className="total-row">
                <span>Subtotal:</span>
                <span>{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="total-row">
                <span>Discount ({purchase.discount}%):</span>
                <span>-{totals.discountAmount.toFixed(2)}</span>
            </div>
            {purchase.selectedLevi.map(levy => (
            <div className="total-row" key={levy.value}>
                <span>{levy.label}:</span>
                <span>+{(totals.netTotal * (levy.rate/100)).toFixed(2)}</span>
            </div>
            ))}
          <div className="total-row grand-total">
            <span>Grand Total:</span>
            <span>&#8373; {totals.grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="ia_add_item_mbox">
          <button className="btn btn-outline" onClick={handleSubmit}>
            Create Purchase Invoice
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePurchase;