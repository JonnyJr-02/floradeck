import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { requestPersistence } from './db/persist'
import { listenForInstallPrompt } from './pwa/installPrompt'
import { initTheme } from './ui/theme'
import './ui/styles.css'

initTheme()
listenForInstallPrompt()
// Ask once per start that the collection survives low storage; browsers answer without a prompt.
void requestPersistence()

const root = document.getElementById('root')
if (!root) throw new Error('FloraDeck: #root is missing from index.html')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
