export function calculatePartnership(events) {
  if (!events || events.length === 0) return [];
  const partnerships = [];
  let currentPartnership = { batsmen: [], runs: 0 };
  events.forEach(e => {
    if (e.type === "wicket") {
      if (currentPartnership.runs > 0 && currentPartnership.batsmen.length > 0) {
        partnerships.push({ ...currentPartnership });
      }
      currentPartnership = { batsmen: [], runs: 0 };
    } else {
      let runAmount = 0;
      if (e.type === "run") runAmount = e.runs || 0;
      else if (e.type === "extra") runAmount = e.runs || 0;
      currentPartnership.runs += runAmount;
      if (Array.isArray(e.batsmen)) {
        e.batsmen.forEach(b => {
          if (!currentPartnership.batsmen.includes(b)) currentPartnership.batsmen.push(b);
        });
      }
    }
  });
  if (currentPartnership.runs > 0 && currentPartnership.batsmen.length > 0) {
    partnerships.push(currentPartnership);
  }
  return partnerships;
}
export function formatOverBall(balls) {
  const overs = Math.floor(balls / 6);
  const ballsLeft = balls % 6;
  return `${overs}.${ballsLeft}`;
}
export function getFallOfWickets(events) {
  return (events || [])
    .filter(e => e.type === "wicket")
    .map(e => ({
      score: e.runsBefore || 0,
      batsman: e.batsman || "Unknown",
      overBall: e.overBall || "-"
    }));
}
