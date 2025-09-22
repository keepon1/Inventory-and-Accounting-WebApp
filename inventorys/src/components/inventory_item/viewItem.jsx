import React, { useEffect, useState } from "react";
import api from "../api";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBarcode, faWeightHanging, faDollarSign, faWarehouse, faCalendarAlt, faUser, faTimesCircle, faMoneyBill, faTimeline, faNewspaper, faCartPlus, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import './viewItem.css';
import { useNavigate, Link } from "react-router-dom";
import { faBraveReverse } from "@fortawesome/free-brands-svg-icons";
import { toast } from "react-toastify";

const ViewItem = (props) => {
  const [itemInfo, setItemInfo] = useState({'code':'', 'brand':'', 'name':'', 'unit':{value:''}, 'model':'', 'category':{value:''}, 'reorder':'', 'description':'', Cost:0, Sales:0, quantity:0, date:null, by:''});
  const navigate = useNavigate();
  const business = props.business;
  const item = props.item;
  const user = props.user;

  useEffect(() => {
    const viewItem = async() => {
      try {
        const response = await api.post('view_item', { business, item, user });

        if (response.status === "success") {
          setItemInfo(response.data);
        } else {
          toast.error(response.message || "Unable to fetch item");
        }
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem('access');
          navigate('/sign_in');
        } else {
          toast.error("Something went wrong");
        }
      }
    };
    viewItem();
  }, [navigate]);

  const totalCurrentCost = (parseFloat(itemInfo.quantity) * parseFloat(itemInfo.Cost)).toFixed(2);

  return (
    <div className="ia_submain_box">
      <div className="ia_description_box">
        <div className="header-back">
          <Link to="../" className="back-link">
              <FontAwesomeIcon icon={faArrowLeft} className="back-icon" />
          </Link>
          <h2 className="ia_description_word">{itemInfo.name}</h2>
        </div>
      </div>

      <div className="ivi_display_box">
        <div className="ivi_subboxes">
          <div className="ivi_holder_box">
            <span className="ivi_label"><FontAwesomeIcon icon={faBarcode} /> Item Code</span>
            <input className="ivi_input" value={itemInfo.code} readOnly title={itemInfo.code} />
          </div>
          <div className="ivi_holder_box">
            <span className="ivi_label"><FontAwesomeIcon icon={faCartPlus} /> Category</span>
            <input className="ivi_input" value={itemInfo.category.value} readOnly title={itemInfo.category.value} />
          </div>
          <div className="ivi_holder_box">
            <span className="ivi_label"><FontAwesomeIcon icon={faBraveReverse} /> Brand</span>
            <input className="ivi_input" value={itemInfo.brand} readOnly title={itemInfo.brand} />
          </div>
          <div className="ivi_holder_box">
            <span className="ivi_label"><FontAwesomeIcon icon={faNewspaper} /> Model Name</span>
            <input className="ivi_input" value={itemInfo.model} readOnly title={itemInfo.model} />
          </div>
        </div>

        <div className="ivi_subboxes">
          <div className="ivi_holder_box">
            <span className="ivi_label"><FontAwesomeIcon icon={faWarehouse} /> Unit Of Measurement</span>
            <input className="ivi_input" value={itemInfo.unit.value} readOnly title={itemInfo.unit.value} />
          </div>
          <div className="ivi_holder_box">
            <span className="ivi_label"><FontAwesomeIcon icon={faTimeline} /> Reorder Level</span>
            <input className="ivi_input" value={itemInfo.reorder} readOnly title={itemInfo.reorder} />
          </div>
          <div className="ivi_holder_box">
            <span className="ivi_label"><FontAwesomeIcon icon={faCalendarAlt} /> Date Created</span>
            <input className="ivi_input" value={itemInfo.date ? new Date(itemInfo.date).toLocaleDateString() : ""} readOnly title={itemInfo.date ? new Date(itemInfo.date).toLocaleDateString() : ""} />
          </div>
          <div className="ivi_holder_box">
            <span className="ivi_label"><FontAwesomeIcon icon={faUser} /> Created By</span>
            <input className="ivi_input" value={itemInfo.by} readOnly title={itemInfo.by} />
          </div>
        </div>

        <div className="ivi_subboxes">
          <div className="ivi_holder_box">
            <span className="ivi_label"><FontAwesomeIcon icon={faMoneyBill} /> Sales Price</span>
            <input className="ivi_input" value={`₵${itemInfo.Sales}`} readOnly title={`₵${itemInfo.Sales}`} />
          </div>
          <div className="ivi_holder_box">
            <span className="ivi_label"><FontAwesomeIcon icon={faMoneyBill} /> Cost Price</span>
            <input className="ivi_input" value={`₵ ${itemInfo.Cost}`} readOnly title={`₵ ${itemInfo.Cost}`} />
          </div>
          <div className="ivi_holder_box">
            <span className="ivi_label"><FontAwesomeIcon icon={faWeightHanging} /> Quantities</span>
            <input className="ivi_input" value={itemInfo.quantity} readOnly title={itemInfo.quantity} />
          </div>
          <div className="ivi_holder_box">
            <span className="ivi_label"><FontAwesomeIcon icon={faDollarSign} /> Total Values</span>
            <input className="ivi_input" value={`₵${totalCurrentCost || 0}`} readOnly title={`₵${totalCurrentCost || 0}`} />
          </div>
        </div>
      </div>

      {(props.access.admin || props.access.edit_access) && (
        <div className="form-actions">
          <Link to={`../edit/${props.item}`} className="action-button">
            <button className="btn btn-outline">Edit Item</button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default ViewItem;
