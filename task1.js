
(() => {
  "use strict";

  const CODE_LENGTH = 4;
  const MAX_ATTEMPTS = 8;
  const DIGIT_MIN = 0;
  const DIGIT_MAX = 9;

  const DIGIT_COUNT = DIGIT_MAX - DIGIT_MIN + 1;

  const form = document.getElementById("cb-form");
  const input = document.getElementById("cb-input");
  const submitButton = document.getElementById("cb-submit");
  const restartButton = document.getElementById("cb-restart");
  const rulesText = document.getElementById("cb-rules");
  const messageBox = document.getElementById("cb-message");
  const leftText = document.getElementById("cb-left");
  const progress = document.getElementById("cb-progress");
  const historyList = document.getElementById("cb-history");
  const emptyText = document.getElementById("cb-empty");
  const panel = document.getElementById("task1");

  let state = null;

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function createSecret() {
    const pool = [];
    for (let digit = DIGIT_MIN; digit <= DIGIT_MAX; digit++) {
      pool.push(digit);
    }
    const secret = [];
    while (secret.length < CODE_LENGTH) {
      const index = randInt(0, pool.length - 1);
      secret.push(pool.splice(index, 1)[0]);
    }
    return secret;
  }

  function reject(message) {
    return { ok: false, message };
  }

  function parseGuess(raw) {
    const text = raw.trim();
    if (text.length === 0) {
      return reject(`Enter ${CODE_LENGTH} digits.`);
    }
    if (text.length !== CODE_LENGTH) {
      return reject(`The code has exactly ${CODE_LENGTH} digits, you typed ${text.length}.`);
    }
    const digits = [];
    for (const char of text) {
      const digit = Number(char);
      if (char === " " || Number.isNaN(digit) || digit < DIGIT_MIN || digit > DIGIT_MAX) {
        return reject(`Only digits ${DIGIT_MIN}–${DIGIT_MAX} are allowed, found "${char}".`);
      }
      digits.push(digit);
    }
    if (new Set(digits).size !== digits.length) {
      return reject("Digits must not repeat. Use different digits.");
    }
    const key = digits.join("");
    const alreadyTried = state.attempts.some((attempt) => attempt.digits.join("") === key);
    if (alreadyTried) {
      return reject(`You already tried ${key}. Try a new code.`);
    }
    return { ok: true, digits };
  }

  function scoreGuess(digits, secret) {
    let inPlace = 0;
    let wrongPlace = 0;
    for (let i = 0; i < digits.length; i++) {
      if (digits[i] === secret[i]) {
        inPlace++;
      } else if (secret.includes(digits[i])) {
        wrongPlace++;
      }
    }
    return { inPlace, wrongPlace };
  }

  function setMessage(text, kind) {
    messageBox.textContent = text;
    messageBox.className = `message message--${kind}`;
  }

  function badge(text, kind) {
    const span = document.createElement("span");
    span.className = `badge badge--${kind}`;
    span.textContent = text;
    return span;
  }

  function render() {
    const used = state.attempts.length;
    leftText.textContent = String(MAX_ATTEMPTS - used);
    progress.max = MAX_ATTEMPTS;
    progress.value = used;

    const rows = state.attempts.map((attempt, index) => {
      const item = document.createElement("li");
      item.className = "guess";
      if (attempt.inPlace === CODE_LENGTH) {
        item.classList.add("is-win");
      }
      const number = document.createElement("span");
      number.className = "guess-no";
      number.textContent = `#${index + 1}`;
      const code = document.createElement("span");
      code.className = "guess-code";
      code.textContent = attempt.digits.join(" ");
      item.append(
        number,
        code,
        badge(`${attempt.inPlace} in place`, "hit"),
        badge(`${attempt.wrongPlace} wrong place`, "near")
      );
      return item;
    });
    historyList.replaceChildren(...rows);
    emptyText.hidden = rows.length > 0;

    input.disabled = state.finished;
    submitButton.disabled = state.finished;
    panel.classList.toggle("is-won", state.finished && state.won);
    panel.classList.toggle("is-lost", state.finished && !state.won);
  }

  function newGame() {
    state = { secret: createSecret(), attempts: [], finished: false, won: false };
    input.value = "";
    setMessage(
      `New code ready: ${CODE_LENGTH} different digits. You have ${MAX_ATTEMPTS} attempts.`,
      "info"
    );
    render();
  }

  function handleGuess(event) {
    event.preventDefault();

    if (state.finished) {
      setMessage("The game is over. Press “New game” to play again.", "info");
      return;
    }

    const parsed = parseGuess(input.value);
    if (!parsed.ok) {
      setMessage(parsed.message, "error");
      input.focus();
      return;
    }

    const score = scoreGuess(parsed.digits, state.secret);
    state.attempts.push({ digits: parsed.digits, ...score });

    const won = score.inPlace === CODE_LENGTH;
    const lost = !won && state.attempts.length >= MAX_ATTEMPTS;
    const left = MAX_ATTEMPTS - state.attempts.length;

    if (won || lost) {
      state.finished = true;
      state.won = won;
    }

    if (won) {
      setMessage(`Code cracked in ${state.attempts.length} attempt(s)! You win.`, "win");
    } else if (lost) {
      setMessage(`Out of attempts. The code was ${state.secret.join(" ")}.`, "loss");
    } else if (score.inPlace === 0 && score.wrongPlace === 0) {
      setMessage(`None of these digits is in the code. ${left} attempt(s) left.`, "info");
    } else {
      setMessage(`${score.inPlace} in place, ${score.wrongPlace} in the wrong place. ${left} attempt(s) left.`, "info");
    }

    input.value = "";
    render();
    if (!state.finished) {
      input.focus();
    } else {
      restartButton.focus();
    }
  }

  function init() {
    if (CODE_LENGTH > DIGIT_COUNT) {
      setMessage(`Cannot start: ${CODE_LENGTH} different digits do not fit into ${DIGIT_MIN}–${DIGIT_MAX}.`, "error");
      input.disabled = true;
      submitButton.disabled = true;
      return;
    }
    rulesText.textContent =
      `Guess the secret code: ${CODE_LENGTH} different digits from ${DIGIT_MIN} to ${DIGIT_MAX}. ` +
      `You have ${MAX_ATTEMPTS} attempts. After each guess you see how many digits are in the right place and how many are in the wrong place.`;
    input.placeholder = "_ ".repeat(CODE_LENGTH).trim();

    form.addEventListener("submit", handleGuess);
    restartButton.addEventListener("click", () => {
      newGame();
      input.focus();
    });
    newGame();
  }

  init();
})();
