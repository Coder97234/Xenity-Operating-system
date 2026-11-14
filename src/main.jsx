import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles/global.css'
import './styles/apps.css'

// No StrictMode: the boot sequence is a real side effect (system updater runs
// once per boot), and React 18's double-invoked effects would run it twice.
createRoot(document.getElementById('root')).render(<App />)
