
export const APIBASEURL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

export const API_BASE_URL = APIBASEURL;
export const APIURL       = APIBASEURL;

export default APIBASEURL;