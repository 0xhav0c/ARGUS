import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import i18n from './i18n'
import './styles/globals.css'
import { useSettingsStore } from './stores/settings-store'

const savedLang = useSettingsStore.getState().language
if (savedLang && savedLang !== i18n.language) {
  i18n.changeLanguage(savedLang)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
