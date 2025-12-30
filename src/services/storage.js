export function saveCurrentMatch(match) {
  localStorage.setItem("currentMatch", JSON.stringify(match));
}
export function loadCurrentMatch() {
  const raw = localStorage.getItem("currentMatch");
  return raw ? JSON.parse(raw) : null;
}
export function clearCurrentMatch() {
  localStorage.removeItem("currentMatch");
}
export function saveHistoryEntry(entry) {
  const arr = JSON.parse(localStorage.getItem("matchHistory")) || [];
  arr.push(entry);
  localStorage.setItem("matchHistory", JSON.stringify(arr));
}
export function loadMatchHistory() {
  return JSON.parse(localStorage.getItem("matchHistory")) || [];
}
export function deleteMatchHistoryEntry(index) {
  const history = JSON.parse(localStorage.getItem("matchHistory") || "[]");
  history.splice(index, 1);
  localStorage.setItem("matchHistory", JSON.stringify(history));
}
