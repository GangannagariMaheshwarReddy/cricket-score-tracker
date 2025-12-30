import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveCurrentMatch } from "../services/storage";
import './MatchSetup.css';

export default function MatchSetup() {
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [overs, setOvers] = useState(2);
  const navigate = useNavigate();

  const start = () => {
    if (!teamA.trim() || !teamB.trim()) {
      alert("Enter both team names");
      return;
    }
    const match = {
      teamA: teamA.trim(),
      teamB: teamB.trim(),
      overs: Number(overs),
      inningsNumber: 1,
      innings: {
        1: createEmptyInnings(),
        2: createEmptyInnings()
      },
      toss: null,
      status: "setup",
      startedAt: new Date().toISOString(),
      result: null
    };
    saveCurrentMatch(match);
    navigate("/toss");
  };

  function createEmptyInnings() {
    return {
      runs: 0, wickets: 0, balls: 0,
      batsmen: [],
      bowler: null,
      bowlers: [],
      extras: { wide:0, noball:0, byes:0, legbyes:0 },
      events: [],
      complete: false,
      freeHit: false
    };
  }

  return (
    <div className="setup-container">
      <h2>Start New Match</h2>
      <input placeholder="Team A" value={teamA} onChange={e=>setTeamA(e.target.value)} />
      <input placeholder="Team B" value={teamB} onChange={e=>setTeamB(e.target.value)} />
      <input type="number" min="1" value={overs} onChange={e=>setOvers(e.target.value)} placeholder="Overs" />
      <button onClick={start}>Next: Toss</button>
    </div>
  );
}
