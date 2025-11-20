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
import { format } from "date-fns";

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
            total: transferItems.reduce((sum, item) => sum + Number(item.qty), 0)
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
                <tfoot>
                  <tr>
                    <td colSpan="5" style={{ textAlign: "right", fontWeight: "bold" }}>Total Quantity:</td>
                    <td style={{ fontWeight: "bold" }}>
                      {transferItems.reduce((sum, item) => sum + Number(item.qty), 0)}
                    </td>
                    <td></td>
                    <td></td>
                  </tr>
                </tfoot>
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
        <div ref={printRef} className="print-container pos80">
          <div style={{ textAlign: "center", marginBottom: "4px" }}>
            <h2 style={{ margin: 0 }}>{printData.business}</h2>
            <h3 style={{ margin: "2px 0", fontSize: "12px" }}>TRANSFER RECEIPT</h3>
          </div>

          <div className="info-row" style={{ marginBottom: "4px" }}>
            <div style={{ textAlign: "left", width: "60%" }}>
              <div><strong>Transfer#: {printData.id}</strong></div>
              <div><strong>From: {printData.from}</strong></div>
              <div><strong>To: {printData.to}</strong></div>
            </div>
            <div style={{ textAlign: "right", width: "38%" }}>
              <div><strong>Date: {format(new Date(printData.date), 'dd/MM/yyyy')}</strong></div>
              <div><strong>Status: {printData.status}</strong></div>
              <div><strong>By: {printData.user}</strong></div>
            </div>
          </div>

          {printData.description && (
            <div style={{ marginBottom: "4px", fontSize: "11px" }}>
              <strong>Desc: {printData.description}</strong>
            </div>
          )}

          <div style={{ borderTop: "1px dashed #000", marginTop: "4px" }} />

          <table className="ia_main_table" style={{ marginTop: "4px", width: "100%", fontSize: "11px" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", width: "70%" }}>Item</th>
                <th style={{ textAlign: "center", width: "15%" }}>Qty</th>
                <th style={{ textAlign: "right", width: "15%" }}>Unit</th>
              </tr>
            </thead>
            <tbody>
              {printData.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <strong>{item.name}</strong>
                  </td>
                  <td style={{ textAlign: "center" }}><strong>{item.qty}</strong></td>
                  <td style={{ textAlign: "right" }}><strong>{item.unit__suffix}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ borderTop: "1px dashed #000", marginTop: "4px", marginBottom: "4px" }} />

          <div style={{ textAlign: "right", fontSize: "11px", fontWeight: "700" }}>
            <div><strong>Total Items: {printData.items.length}</strong></div>
            <div><strong>Total Qty: {printData.total}</strong></div>
          </div>

          <div style={{ marginTop: "8px", textAlign: "center", fontSize: "11px" }}>
            <div><strong>--- TRANSFER RECEIPT ---</strong></div>
          </div>

          <div style={{ marginTop: "6px", textAlign: "center", fontSize: "10px", fontStyle: "italic" }}>
            <div>Please verify items upon receipt</div>
            <div>Report discrepancies immediately</div>
          </div>
        </div>
      )}

      <style>{`
        @page { size: 80mm auto; margin: 0; }
        @media print {
          body * { visibility: hidden; }
          .pos80, .pos80 * { visibility: visible; }
          .pos80 {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            max-width: 80mm;
            padding: 4mm;
            font-family: "Courier New", monospace;
            font-size: 12px;
            color: #000;
            background: #fff;
          }
          .pos80 h2, .pos80 h3 { margin: 0; padding: 0; }
          .pos80 .info-row { display: flex; justify-content: space-between; font-size: 11px; }
          .pos80 table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .pos80 thead th { border-bottom: 1px dashed #000; padding-bottom: 2px; }
          .pos80 th, .pos80 td { padding: 2px 0; }
          .pos80 .right { text-align: right; }
        }
      `}</style>
    </>
  );
};

export default CreateTransfer;