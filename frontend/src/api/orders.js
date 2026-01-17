import api from "./axios";

export const fetchMyOrders = () => api.get("/api/orders/my");
export const cancelMyOrder = (id) => api.put(`/api/orders/${id}/cancel`);
