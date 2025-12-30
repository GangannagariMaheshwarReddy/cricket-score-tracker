import React from "react";
import { loadMatchHistory, deleteMatchHistoryEntry } from "../services/storage";
import { useNavigate } from "react-router-dom";

export default function MatchHistory() {
  const history = loadMatchHistory();
  const navigate = useNavigate();

  return (
    <div style={{maxWidth: 700, margin:"auto", padding:20}}>
      <h2>Match History</h2>
      <ul>
        {history.map((entry, i) => (
          <li key={i} style={{marginBottom:15, border:"1px solid #ccc", borderRadius:6, padding:10}}>
            <div><strong>{entry.teamA}</strong> vs <strong>{entry.teamB}</strong></div>
            <div>{entry.result}</div>
            <div>Started: {entry.startedAt}</div>
            <button onClick={()=> {deleteMatchHistoryEntry(i); window.location.reload();}}>Delete</button>
          </li>
        ))}
      </ul>
      <button onClick={()=> navigate("/")}>New Match</button>
    </div>
  );
}
