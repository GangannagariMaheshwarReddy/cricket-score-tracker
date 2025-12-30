import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MatchSetup from './components/MatchSetup';
import TossSelection from './components/TossSelection';
import InningsSetup from './components/InningsSetup';
import ScoreBoard from './components/ScoreBoard';
import MatchHistory from './components/MatchHistory';
import './index.css';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MatchSetup />} />
        <Route path="/toss" element={<TossSelection />} />
        <Route path="/innings-setup" element={<InningsSetup />} />
        <Route path="/score" element={<ScoreBoard />} />
        <Route path="/history" element={<MatchHistory />} />
      </Routes>
    </Router>
  );
}
