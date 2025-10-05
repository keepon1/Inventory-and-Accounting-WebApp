import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimesCircle, faTachometer, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { format } from "date-fns";

const ViewCash = ({ payments, user, business, access }) => {
  const [journal, setjournal] = useState({
    by: '',
    number: '',
    from: '',
    to: '',
    date: null,
    description: '',
    amount: 0,
    transation_number: 0,
    status:'',
    ref_type:'',
    external:'',
  });

  const navigate = useNavigate();

  useEffect(() => {
    const fetchjournal = async () => {
      try {
        const response = await api.post(
          'view_cash_receipt',
          { business, number: payments, user },
        );

        if (response.status === 'error') {
          toast.error(response.message || 'Failed to fetch cash receipt details');
          return;
        }
        
        setjournal({
          ...response.data
        });
      } catch (error) {
        toast.error('An error occurred while fetching cash receipt details'); 
        console.error('Fetch error:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('access');
          navigate('/sign_in');
        }
      }
    };
    fetchjournal();
  }, []);

  const reverse = async() => {
    try {
        const response = await api.post(
          'reverse_cash_receipt',
          { business, number: journal.number, user },
        );

        if (response.status === 'success') {
          toast.success(response.message || 'Cash receipt reversed successfully');
          navigate(-1);
        }
      }
    catch(error){
      toast.error('An error occurred while reversing cash receipt'); 
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
            <h2>{journal.number}</h2>
          </div>
        </div>

        <div className="ivi_display_box">
          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label>Reference Number</label>
              <input className="ivi_input" value={journal.transation_number} readOnly title={journal.transation_number} />
            </div>
            <div className="ivi_holder_box">
              <label>Transaction Date</label>
              <input className="ivi_input" value={format(journal.date, 'dd/MM/yyyy')} readOnly title={journal.date} />
            </div>
            <div className="ivi_holder_box">
              <label>User</label>
              <input className="ivi_input" value={journal.by} readOnly title={journal.by} />
            </div>
            <div className="ivi_holder_box">
              <label>Status</label>
              <div className="ivi_input">{journal.status}</div>
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
              <input className="ivi_input" value={`GHS ${journal.amount}`} readOnly title={journal.amount} />
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

        {journal.status === 'Completed'?(
          <>
          {(access.admin || access.reverse_access) && (
            <div className="ia_add_item_mbox">
              <button 
              className="btn btn-outline-red"
              onClick={() => reverse()}
              >
                  <FontAwesomeIcon icon={faTachometer} /> reverse cash receipt
              </button>
            </div>
          )}
          </>
        ):(<></>)}
        
      </div>
    </div>
  );
};

export default ViewCash;