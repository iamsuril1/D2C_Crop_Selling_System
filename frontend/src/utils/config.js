export const APIBASEURL =
  import.meta.env.VITEAPIBASEURL ||
  import.meta.env.VITEAPIURL ||
  "http://localhost:5000";

export const API_BASE_URL = APIBASEURL; // for EditProfile.jsx
export const APIURL = APIBASEURL; // for older files

export default APIBASEURL;
