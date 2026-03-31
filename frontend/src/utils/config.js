// FIX: Vite requires VITE_ prefix with underscores.
// Was: VITEAPIBASEURL / VITEAPIURL (broken — env vars never resolved, always fell back to localhost)
// Now: VITE_API_BASE_URL (correct Vite convention)

export const APIBASEURL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

export const API_BASE_URL = APIBASEURL; // alias for EditProfile.jsx
export const APIURL = APIBASEURL;       // alias for older files

export default APIBASEURL;