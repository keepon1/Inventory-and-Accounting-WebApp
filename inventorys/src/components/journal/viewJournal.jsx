import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimesCircle, faTachometer } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { useNavigate } from "react-router-dom";

const ViewJournal = ({ journals, business, user, access }) => {
  const [journal, setjournal] = useState({
    by: '',
    number: '',
    type: '',
    date: '',
    description: '',
    amount: 0,
    transation_number: 0,
    items: [],
  });

  const navigate = useNavigate();

  useEffect(() => {
    const fetchjournal = async () => {
      try {
        const response = await api.post(
          'view_journal',
          { business, number: journals, user },
        );
        
        const { customer, items } = response;
        setjournal({
          ...customer,
          items,
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
          'reverse_journal',
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
          <h2>journal Invoice : {journal.number}</h2>
          <FontAwesomeIcon 
            icon={faTimesCircle} 
            className="close-button"
            onClick={() => navigate(-1)}
          />
        </div>

        <div className="ivi_display_box">
          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label>Entry Type</label>
              <div className="ivi_input">{journal.type}</div>
            </div>
            <div className="ivi_holder_box">
              <label>Transaction Number</label>
              <div className="ivi_input">{journal.transation_number}</div>
            </div>
          </div>

          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label>Date</label>
              <div className="ivi_input">{journal.date}</div>
            </div>
            <div className="ivi_holder_box">
              <label>Description</label>
              <div className="ivi_input">{journal.description}</div>
            </div>
          </div>

          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label>Total Amount</label>
              <div className="ivi_input">{journal.amount}</div>
            </div>
            <div className="ivi_holder_box">
              <label>Created by</label>
              <div className="ivi_input">{journal.by}</div>
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
                  <td>{item.date}</td>
                  <td>{item.type}</td>
                  <td>{item.description}</td>
                  <td>{item.amount}</td>
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
        ):(
          <></>
        )}

      </div>
    </div>
  );
};

export default ViewJournal;