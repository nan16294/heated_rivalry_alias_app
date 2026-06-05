import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ChevronLeft, Plus } from "lucide-react";
import { BACKGROUNDS, FALLBACK_WORDS, ROUND_SECONDS, WORDS_WEBHOOK_URL } from "./config";
import "./styles.css";

const STORAGE_KEY = "heated-rivalry-alias-state-v1";

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function extractWord(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();

  if (Array.isArray(value)) {
    for (const item of value) {
      const extracted = extractWord(item);
      if (extracted) return extracted;
    }
    return "";
  }

  if (typeof value === "object") {
    const preferredKeys = [
      "words", "word", "Word", "WORDS", "text", "value",
      "Слово", "слово", "Слова", "слова", "0"
    ];

    for (const key of preferredKeys) {
      if (key in value) {
        const extracted = extractWord(value[key]);
        if (extracted) return extracted;
      }
    }

    for (const item of Object.values(value)) {
      const extracted = extractWord(item);
      if (extracted) return extracted;
    }
  }

  return "";
}

function normalizeWords(payload) {
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.words)
      ? payload.words
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.rows)
          ? payload.rows
          : Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.result)
              ? payload.result
              : payload?.words
                ? [payload.words]
                : payload?.data
                  ? [payload.data]
                  : [payload];

  return source.map(extractWord).filter(Boolean);
}

async function loadWordsFromWebhook() {
  try {
    const response = await fetch(WORDS_WEBHOOK_URL, { method: "GET" });
    if (!response.ok) throw new Error("Webhook error");
    const data = await response.json();
    const words = normalizeWords(data);
    return words.length ? words : FALLBACK_WORDS;
  } catch (error) {
    console.warn("Не удалось загрузить слова из Make. Используются резервные слова.", error);
    return FALLBACK_WORDS;
  }
}

const defaultState = {
  screen: "home",
  teams: [
    { id: crypto.randomUUID(), name: "Команда 1", score: 0 },
    { id: crypto.randomUUID(), name: "Команда 2", score: 0 },
  ],
  currentTeamIndex: 0,
  round: 1,
  game: 1,
  words: [],
  wordIndex: 0,
  guessedThisRound: 0,
  skippedThisRound: 0,
  savedGame: false,
};

function App() {
  const [state, setState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultState, ...JSON.parse(saved), screen: "home", savedGame: true } : defaultState;
  });

  useEffect(() => {
    const safeState = { ...state, screen: "home", savedGame: true };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
  }, [state.teams, state.currentTeamIndex, state.round, state.game, state.words, state.wordIndex]);

  const update = (patch) => setState((prev) => ({ ...prev, ...patch }));
  const resetGame = async () => {
    const words = shuffle(await loadWordsFromWebhook());
    update({
      screen: "teams",
      teams: defaultState.teams.map((team, index) => ({ ...team, id: crypto.randomUUID(), name: `Команда ${index + 1}`, score: 0 })),
      currentTeamIndex: 0,
      round: 1,
      game: 1,
      words,
      wordIndex: 0,
      guessedThisRound: 0,
      skippedThisRound: 0,
      savedGame: true,
    });
  };

  return (
    <main className="app-shell">
      {state.screen === "home" && <Home state={state} update={update} resetGame={resetGame} />}
      {state.screen === "teams" && <Teams state={state} update={update} />}
      {state.screen === "round" && <RoundIntro state={state} update={update} />}
      {state.screen === "play" && <Play state={state} update={update} />}
      {state.screen === "how" && <HowToPlay update={update} />}
    </main>
  );
}

function Screen({ bg, className = "", children }) {
  const style = bg ? { backgroundImage: `linear-gradient(180deg, rgba(40,34,25,.42), rgba(21,29,25,.72)), url(${bg})` } : undefined;
  return <section className={`screen ${className}`} style={style}>{children}</section>;
}

function TopBar({ title, onBack }) {
  return (
    <div className="topbar">
      <button className="back-button" onClick={onBack}><ChevronLeft size={28} /> Меню</button>
      <div className="top-title">{title}</div>
      <div className="top-spacer" />
    </div>
  );
}

function Home({ state, update, resetGame }) {
  return (
    <Screen bg={BACKGROUNDS.home} className="home-screen">
      <div className="brand-block">
        <div className="hero-title">
          <span className="hero-line">Heated Rivalry</span>
          <span className="hero-line alias-line">Alias</span>
        </div>
      </div>
      <div className="home-actions">
        <button className="btn secondary" disabled={!state.savedGame} onClick={() => update({ screen: "round" })}>Продолжить</button>
        <button className="btn primary" onClick={resetGame}>Новая игра</button>
        <button className="btn ghost" onClick={() => update({ screen: "how" })}>Как играть</button>
      </div>
    </Screen>
  );
}

function Teams({ state, update }) {
  const addTeam = () => {
    update({ teams: [...state.teams, { id: crypto.randomUUID(), name: `Команда ${state.teams.length + 1}`, score: 0 }] });
  };

  const renameTeam = (id) => {
    const current = state.teams.find((team) => team.id === id)?.name || "";
    const name = prompt("Название команды", current);
    if (!name?.trim()) return;
    update({ teams: state.teams.map((team) => team.id === id ? { ...team, name: name.trim() } : team) });
  };

  return (
    <Screen bg={BACKGROUNDS.teams} className="teams-screen">
      <TopBar title="Команды" onBack={() => update({ screen: "home" })} />
      <div className="team-list">
        {state.teams.map((team, index) => (
          <button className="team-card" key={team.id} onClick={() => renameTeam(team.id)}>
            <span className="team-number">{index + 1}</span>
            <span>
              <strong>{team.name}</strong>
              <small>Нажмите, чтобы переименовать</small>
            </span>
          </button>
        ))}
        <button className="add-team" onClick={addTeam}><Plus size={34} /></button>
      </div>
      <p className="hint">Можно добавить столько команд, сколько нужно</p>
      <button className="btn primary bottom" onClick={() => update({ screen: "round" })}>Далее</button>
    </Screen>
  );
}

function RoundIntro({ state, update }) {
  const activeTeam = state.teams[state.currentTeamIndex];
  return (
    <Screen bg={BACKGROUNDS.round} className="round-screen">
      <TopBar title="Счёт" onBack={() => update({ screen: "teams" })} />
      <ScoreBoard teams={state.teams} />
      <div className="round-center">
        <h2>Раунд {state.round} \ Игра {state.game}</h2>
        <p>Ходит команда</p>
        <strong>{activeTeam?.name}</strong>
      </div>
      <button className="btn primary bottom" onClick={() => update({ screen: "play", guessedThisRound: 0, skippedThisRound: 0 })}>Погнали!</button>
    </Screen>
  );
}

function ScoreBoard({ teams }) {
  return (
    <div className="score-board">
      <div className="score-title">Счёт команд</div>
      {teams.map((team, index) => (
        <div className="score-row" key={team.id}>
          <span>{index + 1}. {team.name}</span>
          <strong>{team.score}</strong>
        </div>
      ))}
    </div>
  );
}

function Play({ state, update }) {
  const [seconds, setSeconds] = useState(ROUND_SECONDS);
  const [running, setRunning] = useState(false);
  const [cardAnimation, setCardAnimation] = useState("");
  const startY = useRef(null);
  const activeTeam = state.teams[state.currentTeamIndex];
  const deck = state.words.length ? state.words : FALLBACK_WORDS;
  const word = deck[state.wordIndex] || "Слова закончились";

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setSeconds((value) => value - 1), 1000);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (seconds <= 0) finishRound();
  }, [seconds]);

  const applyWordResult = (type) => {
    const deck = state.words.length ? state.words : FALLBACK_WORDS;
    const isLastWord = state.wordIndex >= deck.length - 1;
    const nextDeckPatch = isLastWord ? { words: shuffle(deck), wordIndex: 0 } : { wordIndex: state.wordIndex + 1 };

    if (type === "guessed") {
      const teams = state.teams.map((team, index) =>
        index === state.currentTeamIndex ? { ...team, score: team.score + 1 } : team
      );
      update({ teams, guessedThisRound: state.guessedThisRound + 1, ...nextDeckPatch });
    } else {
      update({ skippedThisRound: state.skippedThisRound + 1, ...nextDeckPatch });
    }
  };

  const nextWord = (type) => {
    if (!running || cardAnimation) return;

    setCardAnimation(type);
    window.setTimeout(() => {
      applyWordResult(type);
      setCardAnimation("");
    }, 260);
  };

  const finishRound = () => {
    const nextIndex = (state.currentTeamIndex + 1) % state.teams.length;
    const nextRound = nextIndex === 0 ? state.round + 1 : state.round;
    update({ screen: "round", currentTeamIndex: nextIndex, round: nextRound, game: state.game + 1, guessedThisRound: 0, skippedThisRound: 0 });
  };

  const onTouchStart = (event) => { startY.current = event.touches[0].clientY; };
  const onTouchEnd = (event) => {
    if (startY.current === null) return;
    const diff = startY.current - event.changedTouches[0].clientY;
    if (diff > 45) nextWord("guessed");
    startY.current = null;
  };

  const time = useMemo(() => {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(Math.max(seconds % 60, 0)).padStart(2, "0");
    return `${m}:${s}`;
  }, [seconds]);

  return (
    <Screen bg={BACKGROUNDS.play} className="play-screen">
      <TopBar title={activeTeam?.name || "Команда"} onBack={() => update({ screen: "round" })} />
      <div className="play-stats top">
        <b>{state.guessedThisRound}</b>
        <span>угадано</span>
      </div>
      <div className="play-main">
        {!running ? (
          <button className="word-circle start-circle" onClick={() => setRunning(true)}>Старт</button>
        ) : (
          <div className="play-field">
            <div className="swipe-hint">↑ Смахните вверх — угадано</div>
            <button className={`word-circle ${cardAnimation ? `is-${cardAnimation}` : ""}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>{word}</button>
            <div className="swipe-hint muted-hint">Не знаешь слово — нажми «Пропуск»</div>
          </div>
        )}
      </div>
      <div className="play-stats bottom-stats">
        <span>пропущено</span>
        <b>{state.skippedThisRound}</b>
      </div>
      <button className="skip-btn" disabled={!running || !!cardAnimation} onClick={() => nextWord("skipped")}>Пропуск</button>
      <div className="play-footer">
        <button className="small-btn" onClick={() => setRunning((v) => !v)}>{running ? "Пауза" : "Старт"}</button>
        <div className="timer">{time}</div>
      </div>
    </Screen>
  );
}

function HowToPlay({ update }) {
  return (
    <Screen className="how-screen">
      <TopBar title="Как играть" onBack={() => update({ screen: "home" })} />
      <div className="rules-card">
        <h2>Правила</h2>
        <p>Один игрок объясняет слово на экране, не называя само слово. Команда угадывает как можно больше слов за 90 секунд.</p>
        <p><b>Смахнуть вверх</b> — слово угадано, команде начисляется очко.</p>
        <p><b>Пропуск</b> — отдельная кнопка внизу экрана. Смахивание вниз мы не используем, чтобы Telegram не сворачивал мини‑эпп.</p>
        <p>После окончания таймера ход переходит следующей команде.</p>
      </div>
      <button className="btn primary bottom" onClick={() => update({ screen: "home" })}>Понятно</button>
    </Screen>
  );
}

createRoot(document.getElementById("root")).render(<App />);
