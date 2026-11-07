import { useEffect } from 'react'
import { Redirect, Route, Router, Switch, useLocation } from 'wouter'
import { AlbumsScreen } from './features/albums/AlbumsScreen'
import { CoupleScreen } from './features/couple/CoupleScreen'
import { ExploreScreen } from './features/explore/ExploreScreen'
import { JournalScreen } from './features/journal/JournalScreen'
import { InstallScreen } from './features/settings/InstallScreen'
import { SettingsScreen } from './features/settings/SettingsScreen'
import { PwaStatus } from './pwa/PwaStatus'
import { TabBar } from './ui/TabBar'

// wouter wants the base without the trailing slash: "/floradeck".
const base = import.meta.env.BASE_URL.replace(/\/$/, '')

function ScrollToTop() {
  const [location] = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location])
  return null
}

export function App() {
  return (
    <Router base={base}>
      <ScrollToTop />
      <Switch>
        <Route path="/" component={ExploreScreen} />
        <Route path="/album" component={AlbumsScreen} />
        <Route path="/diario" component={JournalScreen} />
        <Route path="/coppia" component={CoupleScreen} />
        <Route path="/impostazioni" component={SettingsScreen} />
        <Route path="/installa" component={InstallScreen} />
        <Route>
          <Redirect to="/" replace />
        </Route>
      </Switch>
      <TabBar />
      <PwaStatus />
    </Router>
  )
}
