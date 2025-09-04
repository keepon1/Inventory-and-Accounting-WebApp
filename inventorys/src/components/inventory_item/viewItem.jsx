import React, { useEffect, useState } from "react";
import api from "../api";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBarcode, faWeightHanging, faDollarSign, faWarehouse, faCalendarAlt, faUser, faTimesCircle, faMoneyBill, faTimeline, faNewspaper, faCartPlus } from "@fortawesome/free-solid-svg-icons";
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
        <div className="ia_description">
          <span className="ia_description_word">{props.item}</span>
        </div>
        <div className="inner_close">
          <FontAwesomeIcon 
            onClick={() => navigate(-1)}
            className="close-button" icon={faTimesCircle} />
        </div>
      </div>

      <div className="ivi_display_box">
        <div className="ivi_subboxes">
          <div className="ivi_holder_box">
            <span className="ivi_label"><FontAwesomeIcon icon={faBarcode} /> Item Code</span>
            <div className="ivi_input">{itemInfo.code}</div>
          </div>
          <div className="ivi_holder_box">
            <span className="ivi_label"><FontAwesomeIcon icon={faCartPlus} /> Category</span>
            <div className="ivi_input">{itemInfo.category.value}</div>
          </div>
          <div className="ivi_holder_box">
            <span className="ivi_label"><FontAwesomeIcon icon={faBraveReverse} /> Brand</span>
            <div className="ivi_input">{itemInfo.brand}</div>
          </div>
          <div className="ivi_holder_box">
            <span className="ivi_label"><FontAwesomeIcon icon={faNewspaper} /> Model Name</span>
            <div className="ivi_input">{itemInfo.model}</div>
          </div>
        </div>

        <div className="ivi_subboxes">
          <div className="ivi_holder_box">
            <span className="ivi_label"><FontAwesomeIcon icon={faWarehouse} /> Unit Of Measurement</span>
            <div className="ivi_input">{itemInfo.unit.value}</div>
          </div>
          <div className="ivi_holder_box">
            <span className="ivi_label"><FontAwesomeIcon icon={faTimeline} /> Reorder Level</span>
            <div className="ivi_input">{itemInfo.reorder}</div>
          </div>
          <div className="ivi_holder_box">
            <span className="ivi_label"><FontAwesomeIcon icon={faCalendarAlt} /> Date Created</span>
            <div className="ivi_input">{itemInfo.date ? new Date(itemInfo.date).toLocaleDateString() : ""}</div>
          </div>
          <div className="ivi_holder_box">
            <span className="ivi_label"><FontAwesomeIcon icon={faUser} /> Created By</span>
            <div className="ivi_input">{itemInfo.by}</div>
          </div>
        </div>

        <div className="ivi_subboxes">
          <div className="ivi_holder_box">
            <span className="ivi_label"><FontAwesomeIcon icon={faMoneyBill} /> Sales Price</span>
            <div className="ivi_input">₵{itemInfo.Sales}</div>
          </div>
          <div className="ivi_holder_box">
            <span className="ivi_label"><FontAwesomeIcon icon={faMoneyBill} /> Cost Price</span>
            <div className="ivi_input">₵ {itemInfo.Cost}</div>
          </div>
          <div className="ivi_holder_box">
            <span className="ivi_label"><FontAwesomeIcon icon={faWeightHanging} /> Quantities</span>
            <div className="ivi_input">{itemInfo.quantity}</div>
          </div>
          <div className="ivi_holder_box">
            <span className="ivi_label"><FontAwesomeIcon icon={faDollarSign} /> Total Values</span>
            <div className="ivi_input">₵{totalCurrentCost || 0}</div>
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
