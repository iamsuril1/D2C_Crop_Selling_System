// src/context/CartContext.jsx
import { createContext, useEffect, useMemo, useState, useContext } from "react";
import AuthContext from "./AuthContext.jsx";

export const CartContext = createContext(null);
export default CartContext;

const readCart = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeCart = (key, cartItems) => {
  localStorage.setItem(key, JSON.stringify(cartItems));
};

export const CartProvider = ({ children }) => {
  const { user } = useContext(AuthContext); // depends on your existing AuthProvider [file:47]

  const cartKey = user?._id ? `cartItems:${user._id}` : "cartItems:guest";

  const [cartItems, setCartItems] = useState(() => readCart(cartKey));

  // When user changes (login/logout), switch to that user's cart
  useEffect(() => {
    setCartItems(readCart(cartKey));
  }, [cartKey]);

  // Persist cart
  useEffect(() => {
    writeCart(cartKey, cartItems);
  }, [cartKey, cartItems]);

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
