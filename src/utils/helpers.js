export const getCleanIP = (serverIP) => {
  return serverIP.replace(/^https?:\/\//, '').replace(/\/$/, '');
};

export const getRandomSeed = () => {
  return Math.floor(Math.random() * 9007199254740991).toString();
};

export const guessPromptType = (text) => {
  const lower = String(text).toLowerCase();
  return (lower.includes("bad") || lower.includes("worst") || lower.includes("ugly")) ? "NEGATIVE PROMPT" : "PROMPT";
};