import api from "../components/api";

const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

export const itemsLoadOptions = (business, user, location) => {
  const debouncedFn = debounce(async (value, callback) => {
    try {
      const res = await api.post('fetch_items_for_select', { value, business, user, location});
      callback(res.data);
    } catch (err) {
      console.error("Error loading options", err);
      callback([]);
    }
  }, 500);

  return (value, callback) => debouncedFn(value, callback);
};

export const locationsLoadOptions = (business, user) => {
  const debouncedFn = debounce(async (value, callback) => {
    try {
      const res = await api.post('fetch_locations_for_select', { value, business, user });
      callback(res);
    } catch (err) {
      console.error("Error loading options", err);
      callback([]);
    }
  }, 500);

  return (value, callback) => debouncedFn(value, callback);
};

export const sourceLocationsLoadOptions = (business, user) => {
  const debouncedFn = debounce(async (value, callback) => {
    try {
      const res = await api.post('fetch_source_locations_for_select', { value, business, user });
      callback(res);
    } catch (err) {
      console.error("Error loading options", err);
      callback([]);
    }
  }, 500);

  return (value, callback) => debouncedFn(value, callback);
};

export const taxLevyLoadOptions = (business) => {
  const debouncedFn = debounce(async (value, callback) => {
    try {
      const res = await api.post('fetch_tax_levy', { value, business});
      callback(res);
    } catch (err) {
      console.error("Error loading options", err);
      callback([]);
    }
  }, 500);

  return (value, callback) => debouncedFn(value, callback);
};

export const customerLoadOptions = (business) => {
  const debouncedFn = debounce(async (value, callback) => {
    try {
      const res = await api.post('fetch_customer', { value, business});
      callback(res);
    } catch (err) {
      console.error("Error loading options", err);
      callback([]);
    }
  }, 500);

  return (value, callback) => debouncedFn(value, callback);
};

export const supplierLoadOptions = (business) => {
  const debouncedFn = debounce(async (value, callback) => {
    try {
      const res = await api.post('fetch_supplier', { value, business});
      callback(res);
    } catch (err) {
      console.error("Error loading options", err);
      callback([]);
    }
  }, 500);

  return (value, callback) => debouncedFn(value, callback);
};