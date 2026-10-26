(() => {
  "use strict";

  const MAX_BUILDS = 3;
  const DEFAULT_BUDGET = 400000;

  const CATEGORIES = [
    { id: "destination", label: "Destination" },
    { id: "ship", label: "Ship" },
    { id: "cabin", label: "Cabin" },
    { id: "extra", label: "Extra" }
  ];

  const ITEMS = [
    { id: "dest-moon", category: "destination", name: "Moon · Tranquility Base", price: 50000,
      available: true, tags: ["short", "classic"], conflicts: {} },
    { id: "dest-mars", category: "destination", name: "Mars · Olympus Dome", price: 240000,
      available: true, tags: ["long", "popular"],
      conflicts: { "ship-shuttle": "The orbital shuttle runs out of fuel before Mars." } },
    { id: "dest-europa", category: "destination", name: "Europa · Ice Station", price: 350000,
      available: true, tags: ["long", "deep-space"],
      conflicts: {
        "ship-shuttle": "The orbital shuttle cannot reach Jupiter's moons.",
        "ship-cruiser": "The cruiser's shielding is not rated for Jupiter's radiation belt."
      } },

    { id: "ship-shuttle", category: "ship", name: "Orbital Shuttle", price: 20000,
      available: true, tags: ["economy", "short"], conflicts: {} },
    { id: "ship-cruiser", category: "ship", name: "Star Cruiser", price: 120000,
      available: true, tags: ["comfort"], conflicts: {} },
    { id: "ship-explorer", category: "ship", name: "Deep-Space Explorer", price: 180000,
      available: true, tags: ["long", "deep-space"], conflicts: {} },

    { id: "cabin-standard", category: "cabin", name: "Standard cabin", price: 10000,
      available: true, tags: ["economy"], conflicts: {} },
    { id: "cabin-premium", category: "cabin", name: "Premium cabin", price: 40000,
      available: true, tags: ["comfort"], conflicts: {} },
    { id: "cabin-suite", category: "cabin", name: "Panorama suite", price: 90000,
      available: true, tags: ["luxury", "comfort"],
      conflicts: { "ship-shuttle": "A suite does not fit into the orbital shuttle." } },

    { id: "extra-spa", category: "extra", name: "Zero-G spa pass", price: 8000,
      available: true, tags: ["relax", "comfort"], conflicts: {} },
    { id: "extra-chef", category: "extra", name: "Private chef", price: 25000,
      available: true, tags: ["luxury", "food"],
      conflicts: { "cabin-standard": "The private chef needs a Premium cabin or a suite." } },
    { id: "extra-deck", category: "extra", name: "Observation deck pass", price: 5000,
      available: false, tags: ["view"], conflicts: {} },
    { id: "extra-photo", category: "extra", name: "Photo package", price: 3000,
      available: true, tags: ["memories"], conflicts: {} }
  ];

  const root = document.getElementById("configurator");
  const searchInput = document.getElementById("cfg-search");
  const categorySelect = document.getElementById("cfg-category");
  const budgetInput = document.getElementById("cfg-budget");
  const messageBox = document.getElementById("cfg-message");
  const itemsBox = document.getElementById("cfg-items");
  const summaryBox = document.getElementById("cfg-summary");
  const buildsBox = document.getElementById("cfg-builds");

  const state = {
    selection: {},
    builds: [],
    budget: DEFAULT_BUDGET,
    budgetInvalid: false,
    query: "",
    category: "all",
    nextBuildNumber: 1,
    message: null
  };
  for (const category of CATEGORIES) {
    state.selection[category.id] = null;
  }

  const moneyFormat = new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0
  });
  const money = (value) => moneyFormat.format(value);

  function h(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === "className") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key === "dataset") Object.assign(node.dataset, value);
      else node.setAttribute(key, value === true ? "" : String(value));
    }
    for (const child of children) {
      if (child) node.append(child);
    }
    return node;
  }

  const findItem = (id) => ITEMS.find((item) => item.id === id);
  const categoryLabel = (id) => CATEGORIES.find((category) => category.id === id).label;

  function notify(text, kind) {
    state.message = text ? { text, kind } : null;
  }

  function getTotal(selection = state.selection) {
    let total = 0;
    for (const category of CATEGORIES) {
      const id = selection[category.id];
      if (id !== null) {
        total += findItem(id).price;
      }
    }
    return total;
  }

  function getBlockReason(item) {
    if (state.selection[item.category] === item.id) return null;

    if (!item.available) return "Sold out.";

    for (const category of CATEGORIES) {
      if (category.id === item.category) continue;
      const otherId = state.selection[category.id];
      if (otherId === null) continue;
      if (item.conflicts[otherId]) return item.conflicts[otherId];
      const other = findItem(otherId);
      if (other.conflicts[item.id]) return other.conflicts[item.id];
    }

    const currentId = state.selection[item.category];
    const currentPrice = currentId === null ? 0 : findItem(currentId).price;
    const newTotal = getTotal() - currentPrice + item.price;
    if (newTotal > state.budget) {
      return `Over budget by ${money(newTotal - state.budget)}.`;
    }
    return null;
  }

  function getSaveBlockReason() {
    const missing = CATEGORIES
      .filter((category) => state.selection[category.id] === null)
      .map((category) => category.label.toLowerCase());
    if (missing.length > 0) {
      return `Choose one item in every category (missing: ${missing.join(", ")}).`;
    }
    const total = getTotal();
    if (total > state.budget) {
      return `The build is over budget by ${money(total - state.budget)}.`;
    }
    if (state.builds.length >= MAX_BUILDS) {
      return `You can keep up to ${MAX_BUILDS} builds. Delete one to save a new one.`;
    }
    return null;
  }

  function toggleItem(id) {
    const item = findItem(id);
    if (!item) return;

    if (state.selection[item.category] === id) {
      state.selection[item.category] = null;
      notify(`${item.name} removed.`, "info");
    } else {
      const reason = getBlockReason(item);
      if (reason) {
        notify(`Blocked: ${item.name}. ${reason}`, "error");
      } else {
        state.selection[item.category] = id;
        notify(`${item.name} added.`, "success");
      }
    }
    render();
  }

  function saveBuild() {
    const reason = getSaveBlockReason();
    if (reason) {
      notify(`Cannot save. ${reason}`, "error");
    } else {
      const number = state.nextBuildNumber++;
      state.builds.push({
        id: number,
        name: `Build ${number}`,
        selection: { ...state.selection },
        total: getTotal()
      });
      notify(`Build ${number} saved.`, "success");
    }
    render();
  }

  function deleteBuild(buildId) {
    const index = state.builds.findIndex((build) => String(build.id) === buildId);
    if (index === -1) return;
    const [removed] = state.builds.splice(index, 1);
    notify(`${removed.name} deleted.`, "info");
    render();
  }

  function clearSelection() {
    for (const category of CATEGORIES) {
      state.selection[category.id] = null;
    }
    notify("Selection cleared.", "info");
    render();
  }

  function buildCard(item) {
    const selected = state.selection[item.category] === item.id;
    const reason = getBlockReason(item);
    const classes = ["card"];
    if (selected) classes.push("is-selected");
    if (reason) classes.push("is-blocked");

    return h("article", { className: classes.join(" ") },
      h("p", { className: "card-category", text: categoryLabel(item.category) }),
      h("h3", { text: item.name }),
      h("p", { className: "card-price", text: money(item.price) }),
      h("p", { className: "tags", text: item.tags.join(" · ") }),
      reason ? h("p", { className: "card-reason", text: reason }) : null,
      h("button", {
        type: "button",
        className: selected ? "btn btn-selected" : "btn",
        "aria-pressed": String(selected),
        "aria-disabled": reason ? "true" : null,
        dataset: { action: "toggle", id: item.id },
        text: selected ? "Remove" : "Select"
      })
    );
  }

  function renderItems() {
    const query = state.query.trim().toLowerCase();
    const visible = ITEMS.filter((item) => {
      const categoryOk = state.category === "all" || item.category === state.category;
      const text = [item.name, categoryLabel(item.category), ...item.tags].join(" ").toLowerCase();
      return categoryOk && text.includes(query);
    });

    const nodes = visible.map(buildCard);
    if (visible.length === 0) {
      const inCategory = state.category === "all" ? "" : ` in ${categoryLabel(state.category)}`;
      nodes.push(h("p", { className: "empty", text: `Nothing found for “${state.query.trim()}”${inCategory}. Clear the search or choose another category.` }));
    }
    itemsBox.replaceChildren(...nodes);
  }

  function renderSummary() {
    const total = getTotal();
    const remaining = state.budget - total;
    const over = remaining < 0;
    const saveReason = getSaveBlockReason();

    const list = h("ul", { className: "summary-list" });
    for (const category of CATEGORIES) {
      const id = state.selection[category.id];
      const item = id === null ? null : findItem(id);
      list.append(h("li", {},
        h("span", { className: "summary-label", text: category.label }),
        h("span", { className: item ? "summary-value" : "summary-value is-empty", text: item ? `${item.name} · ${money(item.price)}` : "not chosen" })
      ));
    }

    const safeMax = Math.max(state.budget, 1);
    summaryBox.classList.toggle("is-over", over);
    summaryBox.replaceChildren(
      h("h3", { text: "Your build" }),
      list,
      h("p", { className: "summary-total" }, "Total: ", h("strong", { text: money(total) })),
      h("p", { className: over ? "summary-budget is-over" : "summary-budget",
        text: over ? `Over budget by ${money(-remaining)}` : `Left in budget: ${money(remaining)}` }),
      h("progress", { max: safeMax, value: Math.min(total, safeMax), "aria-label": "Budget used" }),
      saveReason ? h("p", { className: "hint", text: saveReason }) : h("p", { className: "hint is-ok", text: "Ready to save." }),
      h("div", { className: "actions" },
        h("button", { type: "button", className: "btn", dataset: { action: "save" },
          "aria-disabled": saveReason ? "true" : null, text: `Save build (${state.builds.length}/${MAX_BUILDS})` }),
        h("button", { type: "button", className: "btn btn-secondary", dataset: { action: "clear" }, text: "Clear" })
      )
    );
  }

  function renderBuilds() {
    const title = h("h3", { text: "Saved builds" });
    if (state.builds.length === 0) {
      buildsBox.replaceChildren(title, h("p", { className: "empty", text: "No saved builds yet. Complete a build and press “Save build”." }));
      return;
    }

    let cheapest = Infinity;
    for (const build of state.builds) {
      if (build.total < cheapest) cheapest = build.total;
    }
    const compare = state.builds.length > 1;

    const headRow = h("tr", {}, h("th", { scope: "col", text: "Category" }));
    for (const build of state.builds) {
      headRow.append(h("th", { scope: "col" },
        h("span", { text: build.name }),
        h("button", { type: "button", className: "btn btn-small btn-secondary",
          "aria-label": `Delete ${build.name}`, dataset: { action: "delete-build", buildId: build.id }, text: "Delete" })
      ));
    }

    const body = h("tbody");
    for (const category of CATEGORIES) {
      const ids = state.builds.map((build) => build.selection[category.id]);
      const differs = compare && new Set(ids).size > 1;
      const row = h("tr", {}, h("th", { scope: "row", text: category.label }));
      for (const id of ids) {
        row.append(h("td", { className: differs ? "differs" : null, text: findItem(id).name }));
      }
      body.append(row);
    }
    const totalRow = h("tr", { className: "total-row" }, h("th", { scope: "row", text: "Total" }));
    for (const build of state.builds) {
      const best = compare && build.total === cheapest;
      totalRow.append(h("td", { className: best ? "is-best" : null, text: best ? `${money(build.total)} · cheapest` : money(build.total) }));
    }
    body.append(totalRow);

    const nodes = [title, h("table", {}, h("thead", {}, headRow), body)];
    if (compare) {
      nodes.push(h("p", { className: "hint", text: "Highlighted cells differ between builds." }));
    }
    buildsBox.replaceChildren(...nodes);
  }

  function captureFocus() {
    const active = document.activeElement;
    if (!active || !root.contains(active) || !active.dataset.action) return null;
    const { action, id, buildId } = active.dataset;
    let selector = `[data-action="${action}"]`;
    if (id) selector += `[data-id="${id}"]`;
    if (buildId) selector += `[data-build-id="${buildId}"]`;
    return selector;
  }

  function render() {
    const focusSelector = captureFocus();

    if (state.message) {
      messageBox.textContent = state.message.text;
      messageBox.className = `message message--${state.message.kind}`;
    } else {
      messageBox.textContent = "";
      messageBox.className = "message";
    }
    budgetInput.classList.toggle("is-invalid", state.budgetInvalid);
    if (state.budgetInvalid) budgetInput.setAttribute("aria-invalid", "true");
    else budgetInput.removeAttribute("aria-invalid");

    renderItems();
    renderSummary();
    renderBuilds();

    if (focusSelector) {
      const again = root.querySelector(focusSelector);
      if (again) again.focus();
    }
  }

  root.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button || !root.contains(button)) return;
    const { action, id, buildId } = button.dataset;
    if (action === "toggle") toggleItem(id);
    else if (action === "save") saveBuild();
    else if (action === "clear") clearSelection();
    else if (action === "delete-build") deleteBuild(buildId);
  });

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value;
    notify(null);
    render();
  });

  categorySelect.addEventListener("change", () => {
    state.category = categorySelect.value;
    notify(null);
    render();
  });

  budgetInput.addEventListener("input", () => {
    const raw = budgetInput.value.trim();
    const value = Number(raw);
    if (raw === "" || !Number.isFinite(value) || value < 0) {
      state.budgetInvalid = true;
      notify("Budget must be a number, 0 or more. The previous budget is still used.", "error");
    } else {
      state.budgetInvalid = false;
      state.budget = value;
      notify(null);
    }
    render();
  });

  function init() {
    const options = [h("option", { value: "all", text: "All categories" })];
    for (const category of CATEGORIES) {
      options.push(h("option", { value: category.id, text: category.label }));
    }
    categorySelect.replaceChildren(...options);
    budgetInput.value = String(DEFAULT_BUDGET);
    render();
  }

  init();
})();
