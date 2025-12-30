import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadCurrentMatch, saveCurrentMatch } from "../services/storage";
import './InningsSetup.css';

export default function InningsSetup() {
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [striker1, setStriker1] = useState("");
  const [striker2, setStriker2] = useState("");
  const [bowler, setBowler] = useState("");

  useEffect(()=>{
    const m = loadCurrentMatch();
    if(!m){ navigate("/"); return; }
    setMatch(m);
  },[navigate]);

  const startInnings = () => {
    if(!striker1.trim() || !striker2.trim() || !bowler.trim()){ alert("Enter batsmen and bowler names"); return; }
    const updated = {...match};
    const innNum = updated.inningsNumber;
    updated.innings[innNum].batsmen = [
      {name:striker1.trim(), runs:0, balls:0, fours:0, sixes:0, striker:true},
      {name:striker2.trim(), runs:0, balls:0, fours:0, sixes:0, striker:false}
    ];
    const initialBowler = {name:bowler.trim(), balls:0, runs:0, wickets:0};
    updated.innings[innNum].bowler = initialBowler;
    updated.innings[innNum].bowlers = [initialBowler];
    updated.status = "live";
    saveCurrentMatch(updated);
    navigate("/score");
  };

  if(!match) return null;

  const battingTeam = (match.toss?.choice==="bat") ? match.toss.winner : (match.toss.winner===match.teamA?match.teamB:match.teamA);

  return (
    <div className="innings-setup-container">
      <h2>Innings {match.inningsNumber} Setup</h2>
      <p>Batting: <strong>{battingTeam}</strong></p>
      <input placeholder="Striker (Batsman 1)" value={striker1} onChange={e=>setStriker1(e.target.value)} />
      <input placeholder="Non-Striker (Batsman 2)" value={striker2} onChange={e=>setStriker2(e.target.value)} />
      <input placeholder="Bowler name" value={bowler} onChange={e=>setBowler(e.target.value)} />
      <button onClick={startInnings}>Start Innings</button>
    </div>
  );
}
