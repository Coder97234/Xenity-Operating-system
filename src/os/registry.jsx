import Files from '../apps/Files'
import Terminal from '../apps/Terminal'
import Browser from '../apps/Browser'
import Settings from '../apps/Settings'
import Store from '../apps/Store'
import Calculator from '../apps/Calculator'
import Notes from '../apps/Notes'
import Weather from '../apps/Weather'
import TextEditor from '../apps/TextEditor'
import Passwords from '../apps/Passwords'
import FlatpakApp from '../apps/FlatpakApp'
import { isFlatpakId } from './appindex'

export const APP_COMPONENTS = {
  finder: Files,
  terminal: Terminal,
  browser: Browser,
  settings: Settings,
  store: Store,
  passwords: Passwords,
  calculator: Calculator,
  notes: Notes,
  weather: Weather,
  editor: TextEditor,
}

export function componentFor(appId) {
  if (isFlatpakId(appId)) return FlatpakApp
  return APP_COMPONENTS[appId]
}
