import { HashRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import LibraryView from './views/LibraryView'
import PlaylistsView from './views/PlaylistsView'
import QueueView from './views/QueueView'
import SettingsView from './views/SettingsView'

function App() {
  return (
    <HashRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<LibraryView />} />
          <Route path="/library" element={<LibraryView />} />
          <Route path="/playlists" element={<PlaylistsView />} />
          <Route path="/playlists/:id" element={<PlaylistsView />} />
          <Route path="/queue" element={<QueueView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Routes>
      </AppLayout>
    </HashRouter>
  )
}

export default App
