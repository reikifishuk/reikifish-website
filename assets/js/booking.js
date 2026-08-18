(() => {
  const state = { config: null, service: null, date: "", start: "", step: 1 };
  const form = document.querySelector("#booking-form");
  const status = document.querySelector("#booking-status");
  const serviceBox = document.querySelector("#service-options");
  const dateInput = document.querySelector("#booking-date");
  const slotsBox = document.querySelector("#slot-options");

  const showStatus = (message, type = "error") => {
    status.textContent = message;
    status.className = `booking-status is-${type}`;
    status.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const clearStatus = () => { status.className = "booking-status"; status.textContent = ""; };
  const service = () => state.config.services.find((item) => item.id === state.service);
  const setStep = (step) => {
    state.step = step;
    document.querySelectorAll("[data-step]").forEach((el) => { el.hidden = Number(el.dataset.step) !== step; });
    document.querySelectorAll("[data-progress]").forEach((el) => el.classList.toggle("is-active", Number(el.dataset.progress) <= step));
    document.querySelector(".booking-shell").scrollIntoView({ behavior: "smooth", block: "start" });
    clearStatus();
    if (step === 4) prepareReview();
  };
  const nextButton = (step) => document.querySelector(`[data-step="${step}"] [data-next]`);

  async function loadConfig() {
    const response = await fetch("/api/booking/config", { cache: "no-store" });
    if (!response.ok) throw new Error("The booking service is not available.");
    state.config = await response.json();
    serviceBox.innerHTML = state.config.services.map((item) => `
      <button type="button" class="booking-service" data-service="${item.id}">
        <strong>${item.name}</strong><span>${item.duration} minutes</span><b>${item.paid ? `£${item.price}` : "Free"}</b>
      </button>`).join("");
    serviceBox.insertAdjacentHTML(
      "beforeend",
      `
      <button
        type="button"
        class="booking-service booking-service-promo"
        data-service="intro"
        aria-label="Select a free 10-minute introductory call"
      >
        <span class="booking-promo-label">
          A gentle first step
        </span>

        <strong>
          Begin with a free conversation.
        </strong>

        <span class="booking-promo-copy">
          Ten private minutes to ask questions, explain what is
          happening and see whether this approach feels right.
        </span>

        <b>
          Free consultation
          <span aria-hidden="true">&rarr;</span>
        </b>
      </button>
      `
    );
    serviceBox.addEventListener("click", (event) => {
      const button = event.target.closest("[data-service]");
      if (!button) return;
      state.service = button.dataset.service; state.start = "";
      document.querySelectorAll("[data-service]").forEach((el) => el.classList.toggle("is-selected", el === button));
      nextButton(1).disabled = false;
    });
  }

  async function loadSlots() {
    state.date = dateInput.value; state.start = ""; nextButton(2).disabled = true;
    if (!state.date || !state.service) return;
    slotsBox.innerHTML = "<p>Checking availability…</p>";
    try {
      const response = await fetch(`/api/booking/availability?date=${encodeURIComponent(state.date)}&service=${encodeURIComponent(state.service)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Availability could not be loaded.");
      slotsBox.innerHTML = data.slots.length ? data.slots.map((slot) => `<button class="booking-slot" type="button" data-start="${slot.start}">${slot.label}</button>`).join("") : "<p>No times are available on this date. Please choose another weekday.</p>";
    } catch (error) { slotsBox.innerHTML = `<p>${error.message}</p>`; }
  }

  slotsBox.addEventListener("click", (event) => {
    const button = event.target.closest("[data-start]"); if (!button) return;
    state.start = button.dataset.start;
    document.querySelectorAll(".booking-slot").forEach((el) => el.classList.toggle("is-selected", el === button));
    nextButton(2).disabled = false;
  });
  dateInput.addEventListener("change", loadSlots);

  form.addEventListener("click", (event) => {
    if (event.target.closest("[data-back]")) setStep(Math.max(1, state.step - 1));
    if (!event.target.closest("[data-next]")) return;
    if (state.step === 1 && state.service) setStep(2);
    else if (state.step === 2 && state.start) setStep(3);
    else if (state.step === 3) {
      if (!form.reportValidity()) return;
      setStep(4);
    }
  });

  function details() {
    const data = new FormData(form);
    return { service: state.service, date: state.date, start: state.start, name: data.get("name"), email: data.get("email"), phone: data.get("phone"), notes: data.get("notes") };
  }
  function prepareReview() {
    const chosen = service();
    const when = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(state.start));
    document.querySelector("#booking-summary").innerHTML = `<dl><div><dt>Session</dt><dd>${chosen.name}</dd></div><div><dt>Date and time</dt><dd>${when} UK time</dd></div><div><dt>Duration</dt><dd>${chosen.duration} minutes</dd></div><div><dt>Total</dt><dd>${chosen.paid ? `£${chosen.price}` : "Free"}</dd></div></dl>`;
    document.querySelector("#free-confirm").hidden = chosen.paid;
    document.querySelector("#paypal-buttons").hidden = !chosen.paid;
    if (chosen.paid) loadPayPal();
  }

  let paypalLoaded = false;
  function loadPayPal() {
    if (window.paypal) return renderPayPal();
    if (paypalLoaded) return; paypalLoaded = true;
    if (!state.config.paypalClientId) return showStatus("PayPal Sandbox has not been configured yet.");
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(state.config.paypalClientId)}&currency=GBP&intent=capture`;
    script.onload = renderPayPal; script.onerror = () => showStatus("PayPal could not be loaded."); document.head.appendChild(script);
  }
  function renderPayPal() {
    const container = document.querySelector("#paypal-buttons"); container.innerHTML = "";
    window.paypal.Buttons({
      style: { color: "gold", shape: "pill", label: "paypal", height: 48 },
      createOrder: async () => {
        clearStatus();
        const response = await fetch("/api/booking/create-order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(details()) });
        const data = await response.json(); if (!response.ok) throw new Error(data.error || "Checkout could not start."); return data.orderID;
      },
      onApprove: async ({ orderID }) => {
        const response = await fetch("/api/booking/capture-order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderID }) });
        const data = await response.json(); if (!response.ok) return showStatus(data.error || "Payment could not be confirmed.");
        form.hidden = true; showStatus(`Booking confirmed. Your reference is ${data.reference}. A confirmation email is on its way.`, "success");
      },
      onError: (error) => { console.error(error); showStatus(error.message || "PayPal checkout was interrupted. No booking has been confirmed."); },
      onCancel: () => showStatus("Checkout was cancelled. No payment was taken."),
    }).render("#paypal-buttons");
  }

  document.querySelector("#free-confirm").addEventListener("click", async () => {
    const response = await fetch("/api/booking/create-order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(details()) });
    const data = await response.json(); if (!response.ok) return showStatus(data.error || "The call could not be booked.");
    form.hidden = true; showStatus(`Your introductory call is booked. Reference: ${data.reference}.`, "success");
  });

  const today = new Date(); dateInput.min = today.toISOString().slice(0, 10); const max = new Date(today.getTime() + 60 * 86400000); dateInput.max = max.toISOString().slice(0, 10);
  loadConfig().catch((error) => { serviceBox.innerHTML = `<p>${error.message}</p>`; showStatus(error.message); });
})();
