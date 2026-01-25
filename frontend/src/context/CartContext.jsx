import { createContext, useEffect, useMemo, useState } from "react";

// ✅ both named + default exports
export const CartContext = createContext();
export default CartContext;

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const raw = localStorage.getItem("cartItems");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("cartItems", JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (item) => {
    if (!item?.id) return;

    setCartItems((prev) => {
      const exists = prev.find((x) => x.id === item.id);
      const addQty = Number(item.quantity || 1);

      if (exists) {
        return prev.map((x) =>
          x.id === item.id
            ? { ...x, ...item, quantity: Number(x.quantity || 0) + addQty }
            : x
        );
      }
      return [...prev, { ...item, quantity: addQty }];
    });
  };

  const removeFromCart = (id) => {
    setCartItems((prev) => prev.filter((x) => x.id !== id));
  };

  const updateQty = (id, qty) => {
    const q = Math.max(1, Number(qty || 1));
    setCartItems((prev) => prev.map((x) => (x.id === id ? { ...x, quantity: q } : x)));
  };

  const clearCart = () => setCartItems([]);

  const value = useMemo(
    () => ({ cartItems, addToCart, removeFromCart, updateQty, clearCart }),
    [cartItems]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
