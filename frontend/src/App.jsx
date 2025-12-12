import { useState } from 'react'
import Navbar from "./components/Navbar";


function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <Navbar />
    <h1 className="text-green-500 text-3xl">Welcome to D2C Crop Selling System</h1>
    </>
  )
}

export default App
