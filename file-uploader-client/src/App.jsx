import { useState } from 'react'
import './App.css'
import FileUpload from './FileUpload'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <FileUpload />
    </div>
  )
}

export default App
