import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimesCircle, faTachometer } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { useNavigate } from "react-router-dom";

const ViewCash = ({ payments, user, business, access }) => {
  const [journal, setjournal] = useState({
    by: '',
    number: '',
    from: '',
    to: '',
    date: '',
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
        
        setjournal({
          ...response
        });
      } catch (error) {
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

        if (response == 'done'){
          navigate(-1);
        }
      }
    catch{

    }
  }
  return (
    <div className="ivi_display_mainbox">
      <div className="ia_submain_box">
        <div className="ia_description_box">
          <h2>Cash Receipt Number : {journal.number}</h2>
          <FontAwesomeIcon 
            icon={faTimesCircle} 
            className="close-button"
            onClick={() => navigate(-1)}
          />
        </div>

        <div className="ivi_display_box">
          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label>Reference Number</label>
              <div className="ivi_input">{journal.transation_number}</div>
            </div>
            <div className="ivi_holder_box">
              <label>Transaction Date</label>
              <div className="ivi_input">{journal.date}</div>
            </div>
            <div className="ivi_holder_box">
              <label>User</label>
              <div className="ivi_input">{journal.by}</div>
            </div>
            <div className="ivi_holder_box">
              <label>Status</label>
              <div className="ivi_input">{journal.status}</div>
            </div>
          </div>

          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label>Description</label>
              <div className="ivi_input">{journal.description}</div>
            </div>
            
            <div className="ivi_holder_box">
              <label>Reference Type</label>
              <div className="ivi_input">{journal.ref_type}</div>
            </div>
            <div className="ivi_holder_box">
              <label>External No</label>
              <div className="ivi_input">{journal.external}</div>
            </div>
          </div>

          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label>Amount</label>
              <div className="ivi_input">{journal.amount}</div>
            </div>
            <div className="ivi_holder_box">
              <label>From</label>
              <div className="ivi_input">{journal.from}</div>
            </div>
            <div className="ivi_holder_box">
              <label>To</label>
              <div className="ivi_input">{journal.to}</div>
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