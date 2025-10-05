import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTachometer, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { format } from "date-fns";

const ViewJournal = ({ journals, business, user, access }) => {
  const [journal, setjournal] = useState({
    by: '',
    number: '',
    type: '',
    date: null,
    description: '',
    amount: 0,
    transation_number: 0,
    items: [],
  });

  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchjournal = async () => {
      try {
        const response = await api.post(
          'view_journal',
          { business, number: journals, user },
        );

        if (response.status === 'error') {
          toast.error(response.message || 'Failed to fetch journal details');
          return;
        }
        
        const { customer, items } = response.data;
        setjournal({
          ...customer,
          items,
        });
      } catch (error) {
        toast.error('An error occurred while fetching journal details');
        console.error('Error fetching journal details:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('access');
          navigate('/sign_in');
        }
      }
    };
    fetchjournal();
  }, []);

  const reverse = async() => {
    if (loading) {
      toast.info('Please wait... reversing in progress');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(
        'reverse_journal',
        { business, number: journal.number, user },
      );

      if (response.status === 'success') {
        toast.success(response.message || 'Journal reversed successfully');
        navigate(-1);

      } else {
        toast.error(response.message || 'Failed to reverse journal');
        setLoading(false);
        return;
      }
    }

    catch(error) {
      toast.error('An error occurred while reversing journal');
      setLoading(false);
      console.error('Error reversing journal:', error);
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
              <label>Entry Type</label>
              <input className="ivi_input" value={journal.type} readOnly title={journal.type} />
            </div>
            <div className="ivi_holder_box">
              <label>Transaction Number</label>
              <input className="ivi_input" value={journal.transation_number} readOnly title={journal.transation_number} />
            </div>
          </div>

          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label>Date</label>
              <input className="ivi_input" value={format(journal.date, 'dd/MM/yyyy')} readOnly title={journal.date} />
            </div>
            <div className="ivi_holder_box">
              <label>Description</label>
              <input className="ivi_input" value={journal.description} readOnly title={journal.description} />
            </div>
          </div>

          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label>Total Amount</label>
              <input className="ivi_input" value={`GHS ${journal.amount}`} readOnly title={journal.amount} />
            </div>
            <div className="ivi_holder_box">
              <label>Created by</label>
              <input className="ivi_input" value={journal.by} readOnly title={journal.by} />
            </div>
          </div>
        </div>

        <div className="ia_table_box">
          <table className="ia_main_table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Debiting Account</th>
                <th>Crediting Account</th>
              </tr>
            </thead>
            <tbody>
              {journal.items.map((item, index) => (
                <tr key={index}>
                  <td>{format(item.date, 'dd/MM/yyyy')}</td>
                  <td>{item.type}</td>
                  <td>{item.description}</td>
                  <td>GHS {item.amount}</td>
                  <td>{item.debit}</td>
                  <td>{item.credit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {journal.type === 'Manual Entry'? (
          <>
          {(access.admin || access.reverse_access) && (
            <div className="ia_add_item_mbox">
              <button 
                className="btn btn-outline-red"
                onClick={() => reverse()}
              >
                <FontAwesomeIcon icon={faTachometer} /> reverse journal
              </button>
            </div>
          )}
          </>
        ):(<></>)}

      </div>
    </div>
  );
};

export default ViewJournal;