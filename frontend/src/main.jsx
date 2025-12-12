import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import './index.css'
import { CartProvider } from "./context/CartContext.jsx";

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
           <CartProvider>
      <App />
      </CartProvider>
    </AuthProvider>
  </BrowserRouter>
)
