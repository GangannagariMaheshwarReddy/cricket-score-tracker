import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    loadCurrentMatch,
    saveCurrentMatch,
    clearCurrentMatch,
    saveHistoryEntry,
} from "../services/storage";
import { formatOverBall } from "../utils/cricketUtils";
import "./ScoreBoard.css";

export default function ScoreBoard() {
    const navigate = useNavigate();

    const getBattingTeam = (m, inningsNo) => {
        if (!m.toss) return m.teamA;
        const first =
            m.toss.choice === "bat"
                ? m.toss.winner
                : m.toss.winner === m.teamA
                    ? m.teamB
                    : m.teamA;
        return inningsNo === 1 ? first : first === m.teamA ? m.teamB : m.teamA;
    };

    const [match, setMatch] = useState(null);
    const [inputState, setInputState] = useState({
        wide: false,
        noball: false,
        byes: false,
        legbyes: false,
        wicket: false,
    });
    const [justHadFreeHit, setJustHadFreeHit] = useState(false);
    const [showFullStats, setShowFullStats] = useState(false);

    useEffect(() => {
        const m = loadCurrentMatch();
        if (!m) {
            navigate("/");
            return;
        }
        setMatch(m);
    }, [navigate]);

    useEffect(() => {
        if (match) {
            const currentInnings = match.innings[match.inningsNumber];
            if (currentInnings && currentInnings.currentBowler && currentInnings.currentBowler.name) {
                const bowlerName = currentInnings.currentBowler.name;
                const exists = currentInnings.bowlers.some(b => b.name === bowlerName);

                if (!exists) {
                    const updated = { ...match };
                    updated.innings[match.inningsNumber].bowlers.push(currentInnings.currentBowler);
                    setMatch(updated);
                }
            }
            saveCurrentMatch(match);
        }
    }, [match]);

    useEffect(() => {
        if (!match) return;
        const inn = match.innings[match.inningsNumber];
        if (inn.freeHit && !justHadFreeHit) setJustHadFreeHit(true);
        else if (justHadFreeHit && !inn.freeHit) setJustHadFreeHit(false);
    }, [match, justHadFreeHit]);

    if (!match) return null;

    const inn = match.innings[match.inningsNumber];
    const totalBalls = match.overs * 6;
    const target = match.innings[1]?.runs + 1;
    const battingTeam = getBattingTeam(match, match.inningsNumber);
    const bowlingTeam = battingTeam === match.teamA ? match.teamB : match.teamA;

    const clearFreeHitIfWas = (updated) => {
        if (justHadFreeHit) {
            updated.innings[updated.inningsNumber].freeHit = false;
            setJustHadFreeHit(false);
        }
    };

    const getOrAddBowler = (name, cur) => {
        name = name.trim();
        let bowler = cur.bowlers.find((b) => b.name === name);
        if (!bowler) {
            bowler = { name, balls: 0, runs: 0, wickets: 0 };
            cur.bowlers.push(bowler);
        }
        cur.currentBowler = bowler;
        return bowler;
    };

    const getCurrentBowler = (cur) => {
        if (!cur.currentBowler && cur.bowler) {
            return getOrAddBowler(cur.bowler.name, cur);
        }
        if (!cur.currentBowler) {
            if (cur.complete || match.status === "complete") return null;
            const name = window.prompt("Enter bowler name:");
            if (name && name.trim()) {
                return getOrAddBowler(name, cur);
            } else {
                alert("Bowler name is required to continue scoring.");
                return null;
            }
        }
        return cur.currentBowler;
    };

    const recordEvent = (eventObj) => {
        const updated = { ...match };
        updated.innings[match.inningsNumber].events = [...(inn.events || []), eventObj];
        setMatch(updated);
    };

    const endInningsAndProceed = () => {
        const updated = { ...match };
        updated.innings[match.inningsNumber].complete = true;
        if (match.inningsNumber === 1) {
            updated.inningsNumber = 2;
            updated.status = "setupSecond";
            saveCurrentMatch(updated);
            setMatch(updated);
            navigate("/innings-setup");
        } else {
            const firstRuns = updated.innings[1].runs;
            const secondRuns = updated.innings[2].runs;
            let result = "";
            if (secondRuns > firstRuns)
                result = `${getBattingTeam(updated, 2)} won by ${
                    10 - updated.innings[2].wickets
                } wickets`;
            else if (secondRuns === firstRuns) result = "Match tied";
            else result = `${getBattingTeam(updated, 1)} won by ${
                firstRuns - secondRuns
            } runs`;
            updated.status = "complete";
            updated.result = result;
            saveHistoryEntry({ ...updated, finishedAt: new Date().toISOString() });
            clearCurrentMatch();
            setMatch(updated);
            alert("Match complete: " + result);
            navigate("/history");
        }
    };

    const calculateCRR = () => {
        if (!inn.balls) return 0;
        return (inn.runs / (inn.balls / 6)).toFixed(2);
    };

    const legalBallsBowled = (bowler) => bowler?.balls || 0;

    const checkAndHandleOverEnd = (cur, bowler) => {
        const legalBalls = legalBallsBowled(bowler);

        if (
            legalBalls > 0 &&
            legalBalls % 6 === 0 &&
            !cur.complete &&
            match.status !== "complete"
        ) {
            cur.batsmen.filter(b => !b.out).forEach((b) => (b.striker = !b.striker));
            const newBowler = window.prompt("Enter new bowler name:");

            if (!newBowler || newBowler.trim() === bowler.name) {
                cur.batsmen.filter(b => !b.out).forEach((b) => (b.striker = !b.striker));
            } else if (newBowler.trim()) {
                getOrAddBowler(newBowler, cur);
            }

            return true;
        }
        return false;
    };

    const getStrikerIdx = (batsmen) =>
        batsmen.findIndex((b) => b.striker && !b.out);

    const handleScoreInput = (runs) => {
        if (inn.complete || match.status === "complete") return;

        const updated = { ...match };
        const cur = updated.innings[match.inningsNumber];
        const bowler = getCurrentBowler(cur);

        if (!bowler && !inputState.wide) return;

        // --- EXTRA LOGIC ---
        if (inputState.noball || inputState.wide || inputState.byes || inputState.legbyes) {
            if (inputState.noball) {
                cur.extras.noball += 1;
                const batsmanRuns = inputState.byes || inputState.legbyes ? 0 : runs;
                const strikerIdx = getStrikerIdx(cur.batsmen);

                if (batsmanRuns > 0 && strikerIdx !== -1) {
                    cur.batsmen[strikerIdx].runs += batsmanRuns;
                    cur.batsmen[strikerIdx].balls += 1;
                    if (batsmanRuns === 4) cur.batsmen[strikerIdx].fours += 1;
                    if (batsmanRuns === 6) cur.batsmen[strikerIdx].sixes += 1;
                }

                if ([1, 3, 5].includes(batsmanRuns))
                    cur.batsmen.filter(b => !b.out).forEach((b) => (b.striker = !b.striker));

                cur.runs += 1 + runs;
                bowler.runs += 1 + runs;
                cur.freeHit = true;
                recordEvent({
                    type: "extra",
                    extraType: "noball",
                    runs: 1 + runs,
                    batsmen: batsmanRuns > 0 && strikerIdx !== -1 ? [cur.batsmen[strikerIdx].name] : [],
                    overBall: formatOverBall(cur.balls),
                });
            } else if (inputState.wide) {
                cur.extras.wide += 1 + runs;
                cur.runs += 1 + runs;
                bowler.runs += 1 + runs;
                recordEvent({
                    type: "extra",
                    extraType: "wide",
                    runs: 1 + runs,
                    overBall: formatOverBall(cur.balls),
                });
            } else if (inputState.byes) {
                const kind = "byes";
                cur.extras.byes += runs;
                cur.runs += runs;
                cur.balls += 1;
                bowler.balls += 1;

                const strikerIdx = getStrikerIdx(cur.batsmen);
                if (strikerIdx !== -1) {
                    // Batsman faced ball but doesn't get runs in byes
                    cur.batsmen[strikerIdx].balls += 1;
                }

                if (cur.balls >= totalBalls) cur.complete = true;

                if ([1, 3, 5].includes(runs))
                    cur.batsmen.filter(b => !b.out).forEach((b) => (b.striker = !b.striker));

                checkAndHandleOverEnd(cur, bowler);

                recordEvent({
                    type: "extra",
                    extraType: kind,
                    runs,
                    overBall: formatOverBall(cur.balls),
                });
                clearFreeHitIfWas(updated);
            } else if (inputState.legbyes) {
                const kind = "legbyes";
                cur.extras.legbyes += runs;
                cur.runs += runs;
                cur.balls += 1;
                bowler.balls += 1;

                const strikerIdx = getStrikerIdx(cur.batsmen);
                if (strikerIdx !== -1) {
                    // Increment balls faced but not runs for batsman
                    cur.batsmen[strikerIdx].balls += 1;
                }

                if (cur.balls >= totalBalls) cur.complete = true;

                if ([1, 3, 5].includes(runs))
                    cur.batsmen.filter(b => !b.out).forEach((b) => (b.striker = !b.striker));

                checkAndHandleOverEnd(cur, bowler);

                recordEvent({
                    type: "extra",
                    extraType: kind,
                    runs,
                    overBall: formatOverBall(cur.balls),
                });
                clearFreeHitIfWas(updated);
            }
        }
        // --- WICKET LOGIC ---
        else if (inputState.wicket) {
            if (inn.freeHit) {
                alert("Cannot take wicket on free hit (except run out).");
                return;
            }

            const strikerIdx = getStrikerIdx(cur.batsmen);
            if (strikerIdx === -1) return;

            // Add runs to batsman and total
            cur.runs += runs;
            bowler.runs += runs;
            cur.batsmen[strikerIdx].runs += runs;
            cur.batsmen[strikerIdx].balls += 1;
            if (runs === 4) cur.batsmen[strikerIdx].fours += 1;
            if (runs === 6) cur.batsmen[strikerIdx].sixes += 1;

            // Increment wickets, balls for innings and bowler
            cur.wickets += 1;
            cur.balls += 1;
            bowler.wickets += 1;
            bowler.balls += 1;

            // Mark striker as out
            cur.batsmen[strikerIdx].out = true;
            cur.batsmen[strikerIdx].striker = false;

            const fallenBatsman = cur.batsmen[strikerIdx].name;
            const overEndWicket = legalBallsBowled(bowler) % 6 === 0;

            if (cur.wickets < 10) {
                const newName = window.prompt("New batsman name:");
                if (newName && newName.trim()) {
                    cur.batsmen.filter(b => !b.out).forEach(b => b.striker = false);

                    const newBatsmanStriker = !overEndWicket;
                    const nonStriker = cur.batsmen.find(b => !b.out && !b.striker);

                    cur.batsmen.push({
                        name: newName.trim(),
                        runs: 0,
                        balls: 0,
                        fours: 0,
                        sixes: 0,
                        striker: newBatsmanStriker,
                        out: false,
                    });

                    if (!newBatsmanStriker && runs % 2 !== 0 && nonStriker) {
                        nonStriker.striker = true;
                        cur.batsmen[cur.batsmen.length - 1].striker = false;
                    }
                } else alert("No name entered.");
            } else cur.complete = true;

            checkAndHandleOverEnd(cur, bowler);

            recordEvent({ type: "wicket", overBall: formatOverBall(cur.balls), batsman: fallenBatsman, runsOnWicketBall: runs });
            clearFreeHitIfWas(updated);
        }
        // --- NORMAL RUNS LOGIC ---
        else {
            cur.runs += runs;
            cur.balls += 1;
            const strikerIdx = getStrikerIdx(cur.batsmen);

            if (strikerIdx !== -1) {
                cur.batsmen[strikerIdx].runs += runs;
                cur.batsmen[strikerIdx].balls += 1;
                if (runs === 4) cur.batsmen[strikerIdx].fours += 1;
                if (runs === 6) cur.batsmen[strikerIdx].sixes += 1;
            }

            bowler.runs += runs;
            bowler.balls += 1;

            if (cur.balls >= totalBalls) cur.complete = true;

            if ([1, 3, 5].includes(runs))
                cur.batsmen.filter(b => !b.out).forEach((b) => (b.striker = !b.striker));

            checkAndHandleOverEnd(cur, bowler);

            recordEvent({
                type: "run",
                runs,
                batsmen: strikerIdx !== -1 ? [cur.batsmen[strikerIdx].name] : [],
                overBall: formatOverBall(cur.balls),
            });
            clearFreeHitIfWas(updated);
        }

        if (match.inningsNumber === 2 && cur.runs >= target) {
            updated.innings[updated.inningsNumber].complete = true;
            updated.status = "complete";
            updated.result = `${getBattingTeam(updated, 2)} won by ${
                10 - updated.innings[2].wickets
            } wickets`;
            saveHistoryEntry({ ...updated, finishedAt: new Date().toISOString() });
            clearCurrentMatch();
            setMatch(updated);
            alert("Match complete: " + updated.result);
            navigate("/history");
            return;
        }

        setInputState({
            wide: false,
            noball: false,
            byes: false,
            legbyes: false,
            wicket: false,
        });
        setMatch(updated);

        if (cur.balls >= totalBalls || cur.wickets >= 10) endInningsAndProceed();
    };

    const startSliceIndex = Math.floor(inn.balls / 6) * 6;
    const thisOverEvents = (inn.events || []).slice(startSliceIndex);

    const formatEventDisplay = (e) => {
        if (e.type === 'run') return e.runs;
        if (e.type === 'wicket') {
            return e.runsOnWicketBall && e.runsOnWicketBall > 0 ? `W+${e.runsOnWicketBall}` : 'W';
        }
        if (e.type === 'extra') {
            const extraType = e.extraType.charAt(0).toUpperCase() + e.extraType.slice(1);
            const runsOnly = e.runs - (e.extraType === 'wide' || e.extraType === 'noball' ? 1 : 0);
            if (e.extraType === 'byes' || e.extraType === 'legbyes') {
                return `${extraType}${e.runs > 0 ? e.runs : ''}`;
            }
            if (runsOnly > 0) {
                return `${extraType} + ${runsOnly}`;
            }
            return extraType;
        }
        return '';
    };

    const groupEventsByOver = (events) => {
        const overs = {};
        if (!events || events.length === 0) return overs;

        let totalBallsBowled = 0;

        events.forEach(event => {
            const ballsBeforeThis = totalBallsBowled;
            let isLegalBall = true;
            if (event.type === 'extra') {
                if (event.extraType === 'wide' || event.extraType === 'noball') {
                    isLegalBall = false;
                }
            }

            const overIndex = Math.floor(ballsBeforeThis / 6);

            if (!overs[overIndex]) {
                overs[overIndex] = [];
            }
            overs[overIndex].push(event);

            if (isLegalBall || event.type === 'run' || event.type === 'wicket') {
                totalBallsBowled++;
            }
        });
        return overs;
    };

    const handleSwapBatsman = () => {
        const updated = { ...match };
        const cur = updated.innings[match.inningsNumber];

        const activeBatsmen = cur.batsmen.filter(b => !b.out);
        if (activeBatsmen.length === 2) {
            activeBatsmen.forEach(b => b.striker = !b.striker);
            setMatch(updated);
            window.alert("Batsmen swapped!");
        } else {
            window.alert("Cannot swap. Requires exactly two batsmen at the crease.");
        }
    };

    return (
        <div className="scoreboard">
            <div className="score-main-panel">
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <span>{battingTeam}, {match.inningsNumber === 1 ? "1st" : "2nd"} inning</span>
                    <span>CRR</span>
                </div>
                <div className="score-row">
                    <span className="score-large">{inn.runs} - {inn.wickets}</span>
                    <span className="score-aux">({Math.floor(inn.balls / 6)}.{inn.balls % 6})</span>
                    <span className="crr-num">{calculateCRR()}</span>
                </div>
                {match.inningsNumber === 2 && (
                    <div style={{ marginTop: 3, fontSize: ".98rem", textAlign: 'left' }}>
                        Target: {target} &nbsp;|&nbsp; Need: {Math.max(0, target - inn.runs)}
                    </div>
                )}
                {inn.freeHit && <p className="free-hit">Free Hit!</p>}
            </div>

            <table className="bat-table">
                <thead>
                    <tr>
                        <th>Batsman</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th>
                    </tr>
                </thead>
                <tbody>
                    {inn.batsmen.filter(b => !b.out).map((b, i) => (
                        <tr key={i}>
                            <td>{b.name}{b.striker ? "*" : ""}</td>
                            <td>{b.runs}</td>
                            <td>{b.balls}</td>
                            <td>{b.fours}</td>
                            <td>{b.sixes}</td>
                            <td>{b.balls ? ((b.runs / b.balls) * 100).toFixed(2) : "0.00"}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <th>Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>ER</th>
                    </tr>
                    <tr>
                        <td>{inn.currentBowler?.name || "C"}</td>
                        <td>{inn.currentBowler?.balls ? formatOverBall(inn.currentBowler.balls) : "0.0"}</td>
                        <td>0</td>
                        <td>{inn.currentBowler?.runs || 0}</td>
                        <td>{inn.currentBowler?.wickets || 0}</td>
                        <td>{inn.currentBowler?.balls ? (inn.currentBowler.runs / (inn.currentBowler.balls / 6)).toFixed(2) : "0.00"}</td>
                    </tr>
                </tfoot>
            </table>

            <div className="over-panel">
                <label style={{ fontWeight: 500 }}>This over:</label>&nbsp;
                <span>{thisOverEvents.map(formatEventDisplay).join(' ')}</span>
            </div>

            <div className="extras-row">
                <label><input type="checkbox" checked={inputState.wide} onChange={e => setInputState(s => ({ ...s, wide: e.target.checked, noball: false, byes: false, legbyes: false, wicket: false }))} /> Wide</label>
                <label><input type="checkbox" checked={inputState.noball} onChange={e => setInputState(s => ({ ...s, wide: false, noball: e.target.checked, byes: false, legbyes: false, wicket: false }))} /> No Ball</label>
                <label><input type="checkbox" checked={inputState.byes} onChange={e => setInputState(s => ({ ...s, wide: false, noball: false, byes: e.target.checked, legbyes: false, wicket: false }))} /> Byes</label>
                <label><input type="checkbox" checked={inputState.legbyes} onChange={e => setInputState(s => ({ ...s, wide: false, noball: false, byes: false, legbyes: e.target.checked, wicket: false }))} /> Leg Byes</label>
                <label><input type="checkbox" checked={inputState.wicket} onChange={e => setInputState(s => ({ ...s, wide: false, noball: false, byes: false, legbyes: false, wicket: e.target.checked }))} /> Wicket</label>
            </div>

            <div className="control-buttons-row" style={{marginBottom: "15px", display: "flex", gap: "8px"}}>
                <button className="action-btn" style={{flex: 1, backgroundColor: "#6c757d", color: "white", padding: "8px", border: "none", borderRadius: "4px"}} onClick={handleSwapBatsman}>Swap Batsman</button>
            </div>

            <div className="keypad-container">
                <div className="side-buttons">
                    <button className="side-btn retire-btn" onClick={() => window.alert("Retire action placeholder")}>Retire</button> 
                    <button className="side-btn undo-btn" onClick={() => window.alert("Undo action placeholder")}>Undo</button>
                    <button className="side-btn partnerships-btn" onClick={() => window.alert("Partnerships action placeholder")}>Partnerships</button>
                    <button className="side-btn extras-btn" onClick={() => window.alert("Extras action placeholder")}>Extras</button>
                </div>

                <div className="keypad-row">
                    {[0, 1, 2, 3, 4, 5, 6].map((val) =>
                        <button className="run-btn" key={val} onClick={() => handleScoreInput(val)}>{val}</button>
                    )}
                    <button className="run-btn" onClick={() => window.alert("More actions")}>...</button>
                </div>
            </div>

            <button style={{ marginTop: 16, padding: "8px 16px", cursor: "pointer" }} onClick={() => setShowFullStats(s => !s)}>
                {showFullStats ? "Hide Full Match Stats" : "Show Full Match Stats"}
            </button>

            {showFullStats && (
                <div style={{ marginTop: 20 }}>
                    {[1, 2].map((inningsNo) => {
                        const inning = match.innings[inningsNo];
                        if (!inning) return null;

                        const battingTeam = getBattingTeam(match, inningsNo);
                        const bowlingTeam = battingTeam === match.teamA ? match.teamB : match.teamA;
                        const oversLog = groupEventsByOver(inning.events);

                        return (
                            <div key={inningsNo} style={{ marginBottom: 40, border: '1px solid #ccc', padding: '10px', borderRadius: '5px', backgroundColor: 'white' }}>

                                <h2 style={{ color: '#007bff' }}>{battingTeam} Batting (Innings {inningsNo})</h2>
                                <p style={{ fontWeight: 600 }}>
                                    Total: {inning.runs} - {inning.wickets} ({Math.floor(inning.balls / 6)}.{inning.balls % 6} overs)
                                </p>

                                <h3 style={{ marginTop: 16, color: '#424242' }}>Batsmen Statistics</h3>
                                <table className="bat-table" style={{ marginBottom: 10 }}>
                                    <thead>
                                        <tr>
                                            <th>Batsman</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th><th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inning.batsmen.map((b, i) => (
                                            <tr key={i}>
                                                <td>{b.name}</td><td>{b.runs}</td><td>{b.balls}</td><td>{b.fours}</td><td>{b.sixes}</td><td>{b.balls ? ((b.runs / b.balls) * 100).toFixed(2) : "0"}</td><td>{b.out ? "out" : inningsNo === match.inningsNumber && b.striker ? "not out*" : "not out"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <h3 style={{ color: '#424242' }}>{bowlingTeam} Bowling</h3>
                                <table className="bat-table" style={{ marginBottom: 10 }}>
                                    <thead>
                                        <tr>
                                            <th>Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>ER</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inning.bowlers.map((bw, i) => (
                                            <tr key={i}>
                                                <td>{bw.name}</td><td>{formatOverBall(bw.balls)}</td><td>0</td><td>{bw.runs}</td><td>{bw.wickets}</td><td>{bw.balls ? (bw.runs / (bw.balls / 6)).toFixed(2) : "0.00"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <h3 style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 10, color: '#424242' }}>Over-by-Over Log</h3>
                                <div className="overs-log-container" style={{ fontSize: '.9rem' }}>
                                    {Object.keys(oversLog).sort((a, b) => parseInt(a) - parseInt(b)).map(overNum => (
                                        <div key={overNum} style={{ marginBottom: '5px' }}>
                                            <strong style={{ display: 'inline-block', width: '60px', color: '#388E3C' }}>Over {parseInt(overNum) + 1}:</strong>
                                            <span>{oversLog[overNum].map(formatEventDisplay).join(' ')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}