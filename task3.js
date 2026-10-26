(() => {
  "use strict";

  const MAX_PER_ORDER = 6;
  const BOOKING_CODE_LENGTH = 6;
  const BOOKING_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const BLOCKED_EMAIL_DOMAINS = ["mailinator.com", "tempmail.com", "10minutemail.com"];

  const EVENTS = [
    { id: "moon-gala", name: "Moon Launch Gala", dates: [
      { date: "2027-03-15", soldOut: false },
      { date: "2027-03-22", soldOut: true },
      { date: "2027-04-05", soldOut: false }
    ] },
    { id: "mars-expo", name: "Mars Expo", dates: [
      { date: "2027-05-10", soldOut: false },
      { date: "2027-05-17", soldOut: false },
      { date: "2027-05-24", soldOut: true }
    ] },
    { id: "orbit-night", name: "Orbital Night Party", dates: [
      { date: "2027-06-12", soldOut: false },
      { date: "2027-06-19", soldOut: true }
    ] }
  ];

  const TICKET_TYPES = [
    { id: "standard", name: "Standard", price: 50, seatsLeft: 20 },
    { id: "vip", name: "VIP", price: 150, seatsLeft: 4 },
    { id: "student", name: "Student", price: 25, seatsLeft: 0 }
  ];

  const PROMO_CODES = [
    { code: "ASTRA10", percent: 10, types: null },
    { code: "EARLYBIRD", percent: 20, types: ["standard"] },
    { code: "VIPCLUB", percent: 15, types: ["vip"] }
  ];

  const form = document.getElementById("ticket-form");
  form.noValidate = true;

  const FIELD_KEYS = ["event", "date", "type", "quantity", "name", "email", "promo"];
  const fields = {};
  for (const key of FIELD_KEYS) {
    fields[key] = document.getElementById(`tf-${key}`);
  }
  const errorBox = (key) => document.getElementById(`tf-${key}-error`);
  const summaryBox = document.getElementById("tf-summary");
  const resultBox = document.getElementById("tf-result");
  const dateHint = document.getElementById("tf-date-hint");
  const preview = {
    event: document.getElementById("pv-event"),
    date: document.getElementById("pv-date"),
    type: document.getElementById("pv-type"),
    quantity: document.getElementById("pv-quantity"),
    name: document.getElementById("pv-name"),
    email: document.getElementById("pv-email"),
    subtotal: document.getElementById("pv-subtotal"),
    discount: document.getElementById("pv-discount"),
    total: document.getElementById("pv-total")
  };

  const touched = new Set();

  function h(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === "className") node.className = value;
      else if (key === "text") node.textContent = value;
      else node.setAttribute(key, value === true ? "" : String(value));
    }
    for (const child of children) {
      if (child) node.append(child);
    }
    return node;
  }

  const money = (value) => `$${value.toFixed(2)}`;
  const findEvent = () => EVENTS.find((event) => event.id === fields.event.value);
  const findType = () => TICKET_TYPES.find((type) => type.id === fields.type.value);
  const formatDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric"
  });

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function createBookingCode() {
    let code = "AST-";
    for (let i = 0; i < BOOKING_CODE_LENGTH; i++) {
      code += BOOKING_CODE_ALPHABET[randInt(0, BOOKING_CODE_ALPHABET.length - 1)];
    }
    return code;
  }

  function findPromo() {
    const typed = fields.promo.value.trim().toUpperCase();
    return PROMO_CODES.find((promo) => promo.code === typed) || null;
  }

  function builtInMessage(input, label) {
    const validity = input.validity;
    if (validity.valueMissing) return `${label} is required.`;
    if (validity.typeMismatch) return "Enter a valid email address, for example name@example.com.";
    if (validity.badInput) return `${label} is not a valid value.`;
    if (validity.tooShort) return `${label} needs at least ${input.minLength} characters.`;
    if (validity.rangeUnderflow) {
      return input.type === "date" ? `Pick a date on or after ${input.min}.` : `${label} must be at least ${input.min}.`;
    }
    if (validity.rangeOverflow) {
      return input.type === "date" ? `Pick a date on or before ${input.max}.` : `${label} must be at most ${input.max}.`;
    }
    if (validity.stepMismatch) return `${label} must be a whole number.`;
    return "";
  }

  function availableDates(event) {
    return event.dates.filter((entry) => !entry.soldOut).map((entry) => entry.date).join(", ");
  }

  const validators = {
    event(input) {
      return builtInMessage(input, "Event");
    },

    date(input) {
      const message = builtInMessage(input, "Date");
      if (message) return message;
      const event = findEvent();
      if (!event) return "Choose an event first, then check its dates.";
      const entry = event.dates.find((candidate) => candidate.date === input.value);
      if (!entry) return `${event.name} has no show on ${input.value}. Available dates: ${availableDates(event)}.`;
      if (entry.soldOut) return `${formatDate(entry.date)} is sold out. Available dates: ${availableDates(event)}.`;
      return "";
    },

    type(input) {
      const message = builtInMessage(input, "Ticket type");
      if (message) return message;
      const type = findType();
      if (type && type.seatsLeft === 0) return `${type.name} tickets are sold out. Choose another type.`;
      return "";
    },

    quantity(input) {
      const message = builtInMessage(input, "Quantity");
      if (message) return message;
      const quantity = Number(input.value);
      if (!Number.isInteger(quantity)) return "Quantity must be a whole number.";
      const type = findType();
      if (type && type.seatsLeft > 0 && quantity > type.seatsLeft) {
        return `Only ${type.seatsLeft} ${type.name} seat(s) left. Reduce the quantity.`;
      }
      return "";
    },

    name(input) {
      const message = builtInMessage(input, "Name");
      if (message) return message;
      const words = input.value.trim().split(/\s+/);
      const validWord = (word) => /^[\p{L}][\p{L}'’-]+$/u.test(word);
      if (words.length < 2 || !words.every(validWord)) {
        return "Enter first and last name, letters only (at least 2 letters in each part).";
      }
      return "";
    },

    email(input) {
      const message = builtInMessage(input, "Email");
      if (message) return message;
      const domain = input.value.trim().split("@")[1].toLowerCase();
      if (BLOCKED_EMAIL_DOMAINS.includes(domain)) {
        return `Addresses from ${domain} are not accepted. Use a permanent email.`;
      }
      return "";
    },

    promo(input) {
      const typed = input.value.trim();
      if (typed === "") return "";
      const promo = findPromo();
      if (!promo) return `Promo code “${typed}” was not found.`;
      const type = findType();
      if (promo.types !== null && type && !promo.types.includes(type.id)) {
        return `${promo.code} works only for: ${promo.types.join(", ")} tickets.`;
      }
      return "";
    }
  };

  function showError(key, message) {
    const input = fields[key];
    const box = errorBox(key);
    const wrapper = input.closest(".field");
    box.textContent = message;
    wrapper.classList.toggle("is-invalid", message !== "");
    wrapper.classList.toggle("is-valid", message === "" && touched.has(key) && input.value.trim() !== "");
    if (message) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }

  function checkField(key) {
    const message = validators[key](fields[key]);
    showError(key, message);
    return message;
  }

  function recheckTouched() {
    for (const key of FIELD_KEYS) {
      if (touched.has(key)) checkField(key);
    }
  }

  function getPrice() {
    const type = findType();
    const quantity = Number(fields.quantity.value);
    const validQuantity = Number.isInteger(quantity) && quantity > 0;
    const subtotal = type && validQuantity ? type.price * quantity : 0;
    const promo = findPromo();
    const promoWorks = promo !== null && (promo.types === null || (type !== undefined && promo.types.includes(type.id)));
    const discount = promoWorks ? Math.round(subtotal * promo.percent) / 100 : 0;
    return { type, validQuantity, quantity, subtotal, discount, promo: promoWorks ? promo : null };
  }

  function updatePreview() {
    const event = findEvent();
    const price = getPrice();
    const dateValue = fields.date.value;

    preview.event.textContent = event ? event.name : "—";
    preview.date.textContent = dateValue ? formatDate(dateValue) : "—";
    preview.type.textContent = price.type ? price.type.name : "—";
    preview.quantity.textContent = price.validQuantity ? String(price.quantity) : "—";
    preview.name.textContent = fields.name.value.trim() || "—";
    preview.email.textContent = fields.email.value.trim() || "—";
    preview.subtotal.textContent = money(price.subtotal);
    preview.discount.textContent = price.promo ? `−${money(price.discount)} (${price.promo.code}, ${price.promo.percent}%)` : money(0);
    preview.total.textContent = money(price.subtotal - price.discount);

    dateHint.textContent = event
      ? `Available dates for ${event.name}: ${availableDates(event)}.`
      : "Choose an event first to see its dates.";
  }

  function fillEventOptions() {
    const options = [h("option", { value: "", text: "Choose an event…" })];
    for (const event of EVENTS) {
      options.push(h("option", { value: event.id, text: event.name }));
    }
    fields.event.replaceChildren(...options);
  }

  function fillTypeOptions() {
    const current = fields.type.value;
    const options = [h("option", { value: "", text: "Choose a ticket type…" })];
    for (const type of TICKET_TYPES) {
      const seats = type.seatsLeft > 0 ? `${type.seatsLeft} left` : "sold out";
      options.push(h("option", { value: type.id, text: `${type.name} · $${type.price} (${seats})` }));
    }
    fields.type.replaceChildren(...options);
    fields.type.value = current;
  }

  form.addEventListener("blur", (event) => {
    const key = FIELD_KEYS.find((name) => fields[name] === event.target);
    if (!key) return;
    touched.add(key);
    checkField(key);
  }, true);

  function handleChange(event) {
    const key = FIELD_KEYS.find((name) => fields[name] === event.target);
    if (!key) return;
    if (touched.has(key)) checkField(key);
    recheckTouched();
    updatePreview();
  }
  form.addEventListener("input", handleChange);
  form.addEventListener("change", handleChange);

  function showSummary(errors) {
    const list = h("ul");
    for (const { key, message } of errors) {
      const link = h("a", { href: `#tf-${key}`, text: message });
      link.addEventListener("click", (event) => {
        event.preventDefault();
        fields[key].focus();
      });
      list.append(h("li", {}, link));
    }
    summaryBox.replaceChildren(
      h("p", { className: "error-count", text: errors.length === 1 ? "1 error found" : `${errors.length} errors found` }),
      list
    );
    summaryBox.hidden = false;
  }

  function showResult(ticket) {
    const list = h("dl", { className: "result-list" });
    const rows = [
      ["Event", ticket.event],
      ["Date", ticket.date],
      ["Type", ticket.type],
      ["Quantity", String(ticket.quantity)],
      ["Passenger", ticket.name],
      ["Email", ticket.email],
      ["Paid", money(ticket.total)]
    ];
    for (const [label, value] of rows) {
      list.append(h("div", {}, h("dt", { text: label }), h("dd", { text: value })));
    }
    const title = h("h3", { id: "tf-result-title", tabindex: "-1", text: "Booking confirmed" });
    resultBox.replaceChildren(
      title,
      h("p", { className: "ticket-code", text: ticket.code }),
      list
    );
    resultBox.hidden = false;
    title.focus();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    resultBox.hidden = true;

    const errors = [];
    for (const key of FIELD_KEYS) {
      touched.add(key);
      const message = checkField(key);
      if (message) errors.push({ key, message });
    }

    if (errors.length > 0) {
      showSummary(errors);
      fields[errors[0].key].focus();
      return;
    }

    const price = getPrice();
    const ticket = {
      code: createBookingCode(),
      event: findEvent().name,
      date: formatDate(fields.date.value),
      type: price.type.name,
      quantity: price.quantity,
      name: fields.name.value.trim(),
      email: fields.email.value.trim(),
      total: price.subtotal - price.discount
    };
    price.type.seatsLeft -= price.quantity;

    summaryBox.hidden = true;
    summaryBox.replaceChildren();
    touched.clear();
    form.reset();
    fillTypeOptions();
    for (const key of FIELD_KEYS) showError(key, "");
    updatePreview();
    showResult(ticket);
  });

  fields.quantity.max = String(MAX_PER_ORDER);
  fillEventOptions();
  fillTypeOptions();
  updatePreview();
})();
