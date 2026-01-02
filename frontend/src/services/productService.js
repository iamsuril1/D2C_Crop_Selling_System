import axios from "axios";

const API_URL = "http://localhost:5000/api/products";

const getAuthHeader = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

export const getMyProducts = async (token) => {
  const res = await axios.get(`${API_URL}/my-products`, getAuthHeader(token));
  return res.data;
};

export const createProduct = async (formData, token) => {
  const res = await axios.post(API_URL, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const updateProduct = async (id, formData, token) => {
  const res = await axios.put(`${API_URL}/${id}`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const deleteProduct = async (id, token) => {
  const res = await axios.delete(`${API_URL}/${id}`, getAuthHeader(token));
  return res.data;
};
