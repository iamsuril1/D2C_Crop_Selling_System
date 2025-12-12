import { useState } from 'react'
import Navbar from "./components/Navbar";


function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <Navbar />
    <h1 className="text-red-500 text-3xl">Tailwind Working!</h1>
    </>
  )
}

export default App
