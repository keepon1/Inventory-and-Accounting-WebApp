import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimesCircle, faEdit, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import AsyncSelect from "react-select/async";
import api from "../api";
import { Link, useNavigate } from "react-router-dom";
import {
  itemsLoadOptions,
  locationsLoadOptions,
  sourceLocationsLoadOptions,
} from "../../utils/fetchData";
import { toast } from "react-toastify";
import { set } from "date-fns";

const CreateTransfer = ({ business, user, access }) => {
  const [transfer, setTransfer] = useState({
    description: "",
    issueDate: new Date().toISOString().split("T")[0],
    from: { value: "", label: "" },
    to: { value: "", label: "" },
  });
  const [defaultItems, setDefaultItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [sourceLocations, setSourceLocations] = useState([]);
  const [currentItem, setCurrentItem] = useState({ item: null, qty: 1 });
  const [loading, setLoading] = useState(false);
  const [transferItems, setTransferItems] = useState([]);
  const [printData, setPrintData] = useState(null);

  const printRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [items, locationsRes, source] = await Promise.all([
          api.post("fetch_items_for_select", {
            business,
            user,
            value: "",
            location: "",
          }),
          api.post("fetch_locations_for_select", { business, user, value: "" }),
          api.post("fetch_source_locations_for_select", {
            business,
            user,
            value: "",
          }),
        ]);
        if (items.status === "error" || locationsRes.status === "error" || source.status === "error") {
          toast.error(items.message || locationsRes.message || source.message || "Failed to fetch initial data");
          return;
        }
        setDefaultItems(items.data);
        setLocations(locationsRes.data);
        setSourceLocations(source.data);
      } catch (error) {
        if (error.response?.status === 401) navigate("/sign_in");
      }
    };
    fetchData();
  }, []);

  const handleAddItem = async () => {
    if (!transfer.from) {
      toast.error("Please select From location");
      return;
    }
    if (!transfer.to) {
      toast.error("Please select To location");
      return;
    }
    if (!currentItem.item) {
      toast.error("Please select Item");
      return;
    }
    if (transfer.from.value === transfer.to.value) {
      toast.error("Cannot transfer to the same location");
      return;
    }
    if (currentItem.qty < 1) {
      toast.error("Quantity cannot be less than one");
      return;
    }

    if (transferItems.find((i) => i.code === currentItem.item.code)) {
      toast.error("Item already added");
      return;
    }

    if (loading) {
      toast.info('Please wait... verification in progress');
      return;
    }

    try {
      setLoading(true);
    
      const verificationResponse = await api.post("verify_transfer_quantity", {
        business,
        loc: transfer.from.value,
        detail: { item: currentItem.item.item_name, qty: currentItem.qty },
      });

      if (verificationResponse.status === "error") {
        toast.error(verificationResponse.message);
        setLoading(false);
        return;
      }

      setTransferItems((prev) => [
        ...prev,
        {
          code: currentItem.item.code,
          name: currentItem.item.value,
          item_name: currentItem.item.value,
          value: currentItem.item.value,
          label: currentItem.item.value,
          brand: currentItem.item.brand,
          qty: currentItem.qty,
          category__name: currentItem.item.category__name,
          model: currentItem.item.model,
          unit__suffix: currentItem.item.unit__suffix,
        },
      ]);

      toast.success("Item added to transfer list");
      setLoading(false);
      setCurrentItem({ item: null, qty: 1 });
    } catch (error) {
      toast.error("An error occurred while adding item");
      setLoading(false);
      console.error('Error adding item:', error);
      if (error.response?.status === 401) navigate("/sign_in");
    }
  };

  const submitTransfer = async (print = false) => {
    if (!transferItems.length) {
      toast.error("Please add at least one item");
      return;
    }
    if (transfer.from === transfer.to) {
      toast.error("Cannot transfer to the same location");
      return;
    }

    if (loading) {
      toast.info('Please wait... creation in progress');
      return;
    }

    const formData = new FormData();
    formData.append("business", business);
    formData.append("user", user);
    formData.append("description", transfer.description);
    formData.append("date", transfer.issueDate);
    formData.append("from", transfer.from.value);
    formData.append("to", transfer.to.value);

    transferItems.forEach((item) => {
      formData.append(
        "items",
        JSON.stringify({ name: item.name, qty: item.qty })
      );
    });

    try {
      setLoading(true);
      const response = await api.post("create_transfer", formData);

      if (response.status === "success") {
        toast.success(response.message || "Transfer created successfully");
        if (print) {
          setPrintData({
            id: response.data.id,
            status: response.data.status,
            business,
            user,
            from: transfer.from.label,
            to: transfer.to.label,
            date: transfer.issueDate,
            description: transfer.description,
            items: transferItems,
          });
          setTimeout(() => {
            window.print();
            navigate(-1);
          }, 500);
          setLoading(false);
        } else {
          navigate(-1);
        }
      } else {
        toast.error(response.message || "Transfer failed");
        setLoading(false);
        return;
      }
    } catch (error) {
      toast.error("Something went wrong while creating transfer");
      setLoading(false);
      console.error('Error creating transfer:', error);
      if (error.response?.status === 401) navigate("/sign_in");
    }
  };

  return (
    <>
      {!printData && (
        <div className="ivi_display_mainbox">
          <div className="ia_submain_box">
            <div className="ia_description_box">
              <div className="header-back">
                <Link to="../" className="back-link">
                  <FontAwesomeIcon icon={faArrowLeft} className="back-icon" />
                </Link>
                <h2 className="ia_description_word">Create Transfer</h2>
              </div>
            </div>

            <div className="ivi_display_box">
              <div className="ivi_subboxes">
                <div className="ivi_holder_box">
                  <label className="ivi_label">Description</label>
                  <input
                    type="text"
                    className="ivi_input"
                    value={transfer.description}
                    onChange={(e) =>
                      setTransfer({ ...transfer, description: e.target.value })
                    }
                  />
                </div>
                <div className="ivi_holder_box">
                  <label className="ivi_label">Issue Date</label>
                  <input
                    type="date"
                    className="ivi_input"
                    value={transfer.issueDate}
                    onChange={(e) =>
                      setTransfer({ ...transfer, issueDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="ivi_subboxes">
                <div className="ivi_holder_box">
                  <label className="ivi_label">From Location*</label>
                  <AsyncSelect
                    cacheOptions
                    defaultOptions={sourceLocations}
                    className="ivi_select"
                    classNamePrefix="ivi_select"
                    loadOptions={sourceLocationsLoadOptions(business, user)}
                    value={transfer.from}
                    onChange={(selected) =>
                      setTransfer({ ...transfer, from: selected })
                    }
                  />
                </div>
                <div className="ivi_holder_box">
                  <label className="ivi_label">To Location*</label>
                  <AsyncSelect
                    cacheOptions
                    defaultOptions={locations}
                    className="ivi_select"
                    classNamePrefix="ivi_select"
                    loadOptions={locationsLoadOptions(business, user)}
                    value={transfer.to}
                    onChange={(selected) =>
                      setTransfer({ ...transfer, to: selected })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="ivi_display_box" style={{ marginTop: "2rem" }}>
              <div className="ivi_subboxes">
                <div className="ivi_holder_box">
                  <label className="ivi_label">Select Item*</label>
                  <AsyncSelect
                    cacheOptions
                    defaultOptions={defaultItems}
                    className="ivi_select"
                    classNamePrefix="ivi_select"
                    loadOptions={itemsLoadOptions(business, user, "")}
                    value={currentItem.item}
                    onChange={(selected) =>
                      setCurrentItem({ ...currentItem, item: selected })
                    }
                  />
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
                    onChange={(e) =>
                      setCurrentItem({ ...currentItem, qty: e.target.value })
                    }
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
                Preview transfer
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
                    <th className="action-width">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transferItems.map((item, index) => (
                    <tr key={index}>
                      <td>{item.category__name}</td>
                      <td>{item.code}</td>
                      <td>{item.brand}</td>
                      <td>{item.model}</td>
                      <td>{item.name}</td>
                      <td>{item.qty}</td>
                      <td>{item.unit__suffix}</td>
                      <td>
                        <FontAwesomeIcon
                          icon={faEdit}
                          className="item_action"
                          onClick={() => {
                            setCurrentItem({
                              item: transferItems.find(
                                (i) => i.code === item.code
                              ),
                              qty: item.qty,
                            });
                            setTransferItems((prev) =>
                              prev.filter((_, i) => i !== index)
                            );
                            toast.info("Item moved back for editing");
                          }}
                        />
                        <FontAwesomeIcon
                          icon={faTimesCircle}
                          className="item_action"
                          onClick={() => {
                            setTransferItems((prev) =>
                              prev.filter((_, i) => i !== index)
                            );
                            toast.info("Item removed from transfer");
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ia_add_item_mbox">
              <button
                className="btn btn-outline"
                onClick={() => submitTransfer(false)}
              >
                Create transfer
              </button>
              <button
                className="btn btn-outline"
                style={{ marginLeft: "1rem" }}
                onClick={() => submitTransfer(true)}
              >
                Create & Print
              </button>
            </div>
          </div>
        </div>
      )}

      {printData && (
        <div ref={printRef} className="print-container">
          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <h2 style={{ margin: 0 }}>{printData.business}</h2>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div style={{ textAlign: "left" }}>
              <p><b>Transfer ID:</b> {printData.id}</p>
              <p><b>Description:</b> {printData.description}</p>
              <p><b>User:</b> {printData.user}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p><b>Date:</b> {printData.date}</p>
              <p><b>From:</b> {printData.from}</p>
              <p><b>To:</b> {printData.to}</p>
              <p><b>Status:</b> {printData.status}</p>
            </div>
          </div>

          <table className="ia_main_table" style={{ marginTop: "1rem" }}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
              </tr>
            </thead>
            <tbody>
              {printData.items.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.name}</td>
                  <td>{item.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </>
  );
};

export default CreateTransfer;
