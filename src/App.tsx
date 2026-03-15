import { Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Review } from './pages/Review';
import { ManageDeck } from './pages/ManageDeck';
import { Stats } from './pages/Stats';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/review/:deckId" element={<Review />} />
      <Route path="/deck/:deckId" element={<ManageDeck />} />
      <Route path="/stats" element={<Stats />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
