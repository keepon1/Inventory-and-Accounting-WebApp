import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimesCircle, faTachometer, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const ViewPayment = ({ payments, user, business, access }) => {
  const [journal, setjournal] = useState({
    by: '',
    number: '',
    from: '',
    to: '',
    date: '',
    description: '',
    amount: 0,
    transation_number: 0,
    status: '',
    ref_type: '',
    external: '',
  });

  const navigate = useNavigate();

  useEffect(() => {
    const fetchjournal = async () => {
      try {
        const response = await api.post(
          'view_payment',
          { business, number: payments, user },
        );

        if (response.status === 'error') {
          toast.error(response.message || 'Failed to fetch payment details');
          return;
        }

        setjournal({
          ...response.data
        });
      } catch (error) {
        toast.error('An error occurred while fetching payment details');
        console.error('Fetch error:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('access');
          navigate('/sign_in');
        }
      }
    };
    fetchjournal();
  }, []);

  const reverse = async () => {
    try {
      const response = await api.post(
        'reverse_payment',
        { business, number: journal.number, user },
      );

      if (response.status == 'success') {
        toast.success(response.message || 'Payment reversed successfully');
        navigate(-1);
      } else {
        toast.error(response.message || 'Failed to reverse payment');
        return;
      }
    }
    catch (error) {
      toast.error('An error occurred while reversing payment');
      console.error('Fetch error:', error);
    }
  }
  return (
    <div className="ivi_display_mainbox">
      <div className="ia_submain_box">
        <div className="ia_description_box">
          <div className="header-back">
            <Link to="../" className="back-link">
              <FontAwesomeIcon icon={faArrowLeft} className="back-icon" />
            </Link>
            <h2>{payments}</h2>
          </div>
        </div>

        <div className="ivi_display_box">
          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label>Transaction Number</label>
              <input className="ivi_input" value={journal.transation_number} readOnly title={journal.transation_number} />
            </div>
            <div className="ivi_holder_box">
              <label>Transaction Date</label>
              <input className="ivi_input" value={journal.date} readOnly title={journal.date} />
            </div>
            <div className="ivi_holder_box">
              <label>User</label>
              <input className="ivi_input" value={journal.by} readOnly title={journal.by} />
            </div>
            <div className="ivi_holder_box">
              <label>Status</label>
              <input className="ivi_input" value={journal.status} readOnly title={journal.status} />
            </div>
          </div>

          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label>Description</label>
              <input className="ivi_input" value={journal.description} readOnly title={journal.description} />
            </div>
            <div className="ivi_holder_box">
              <label>Reference Type</label>
              <input className="ivi_input" value={journal.ref_type} readOnly title={journal.ref_type} />
            </div>
            <div className="ivi_holder_box">
              <label>External No</label>
              <input className="ivi_input" value={journal.external} readOnly title={journal.external} />
            </div>
          </div>

          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label>Amount</label>
              <input className="ivi_input" value={journal.amount} readOnly title={journal.amount} />
            </div>
            <div className="ivi_holder_box">
              <label>From</label>
              <input className="ivi_input" value={journal.from} readOnly title={journal.from} />
            </div>
            <div className="ivi_holder_box">
              <label>To</label>
              <input className="ivi_input" value={journal.to} readOnly title={journal.to} />
            </div>
          </div>
        </div>

        {journal.status === 'Completed' ? (
          <>
            {(access.admin || access.reverse_access) && (
              <div className="ia_add_item_mbox">
                <button
                  className="btn btn-outline-red"
                  onClick={() => reverse()}
                >
                  <FontAwesomeIcon icon={faTachometer} /> reverse payment
                </button>
              </div>
            )}
          </>
        ) : (
          <></>
        )}

      </div>
    </div>
  );
};

export default ViewPayment;