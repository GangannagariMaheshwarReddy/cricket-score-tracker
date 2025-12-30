import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadCurrentMatch, saveCurrentMatch } from "../services/storage";
import './Toss.css';

export default function TossSelection() {
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [winner, setWinner] = useState("");
  const [choice, setChoice] = useState("bat");

  useEffect(() => {
    const m = loadCurrentMatch();
    if (!m) { navigate("/"); return; }
    setMatch(m);
  }, [navigate]);

  const confirmToss = () => {
    if (!winner) { alert("Select toss winner"); return; }
    const updated = { ...match, toss: { winner, choice }, status: "tossDone" };
    saveCurrentMatch(updated);
    navigate("/innings-setup");
  };

  if (!match) return null;
  return (
    <div className="toss-container">
      <h2>Toss</h2>
      <p>{match.teamA} vs {match.teamB}</p>
      <div className="teams-row">
        <div className={`team-box${winner === match.teamA ? " selected" : ""}`} onClick={() => setWinner(match.teamA)}>{match.teamA}</div>
        <div className={`team-box${winner === match.teamB ? " selected" : ""}`} onClick={() => setWinner(match.teamB)}>{match.teamB}</div>
      </div>
      <div className="choice-row">
        <div className={`choice-box${choice === "bat" ? " selected" : ""}`} onClick={() => setChoice("bat")}>Bat</div>
        <div className={`choice-box${choice === "bowl" ? " selected" : ""}`} onClick={() => setChoice("bowl")}>Bowl</div>
      </div>
      <button className="confirm-btn" onClick={confirmToss}>Confirm Toss & Proceed</button>
    </div>
  );
}
