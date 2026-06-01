import { createContext, useEffect, useMemo, useState, useContext } from "react";
import AuthContext from "./AuthContext.jsx";
import { NORMAL_MIN_KG } from "../utils/orderConstants";

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
  const { user } = useContext(AuthContext);

  const cartKey = user?._id ? `cartItems:${user._id}` : "cartItems:guest";

  const [cartItems, setCartItems] = useState(() => readCart(cartKey));

  useEffect(() => {
    setCartItems(readCart(cartKey));
  }, [cartKey]);

  useEffect(() => {
    writeCart(cartKey, cartItems);
  }, [cartKey, cartItems]);

  const addToCart = (item) => {
    if (!item?.id) return;

    // Default quantity is NORMAL_MIN_KG (20) so the cart always
    // starts at the normal order minimum on first add.
    const addQty = Number(item.quantity || NORMAL_MIN_KG);

    setCartItems((prev) => {
      const exists = prev.find((x) => x.id === item.id);

      if (exists) {
        // Already in cart — increment by the same amount
        return prev.map((x) =>
          x.id === item.id
            ? { ...x, ...item, quantity: Number(x.quantity || 0) + addQty }
            : x
        );
      }

      // New item — start at addQty (20 by default)
      return [...prev, { ...item, quantity: addQty }];
    });
  };

  const removeFromCart = (id) => {
    setCartItems((prev) => prev.filter((x) => x.id !== id));
  };

  const updateQty = (id, qty) => {
    const q = Math.max(1, Number(qty || 1));
    setCartItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, quantity: q } : x))
    );
  };

  const clearCart = () => setCartItems([]);

  const value = useMemo(
    () => ({ cartItems, addToCart, removeFromCart, updateQty, clearCart }),
    [cartItems]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};