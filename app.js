/* ==========================================================
   MAFIA NIGHT — LOGIQUE APPLICATIVE (app.js)
   Maison de Production Gbévoun
   - Billetterie & Compteur de places (Standard / VIP)
   - Paiement Mobile (Mixx by Yas / Flooz) + Redirection WhatsApp
   - Espace Admin : Numérotation séquentielle (MN-001, MN-002...),
     Génération de Pass PNG (Canvas Art Déco), Liste officielle,
     Contrôle anti-duplication à l'entrée, Export CSV & JSON.
   ========================================================== */

(function () {
  "use strict";

  const CFG = window.EVENT_CONFIG || {};
  const STORAGE_KEY = "gbevoun_mafia_night_passes_v1";
  const SESSION_AUTH_KEY = "gbevoun_mafia_night_admin_unlocked";

  let selectedTicketId = (CFG.tickets && CFG.tickets[0] && CFG.tickets[0].id) || "solo";
  let selectedPayMethod = "mixx";
  let logoImg = null;

  /* ---- Préchargement du logo Gbévoun pour les pass PNG ---- */
  function preloadLogo() {
    const img = new Image();
    img.src = "logo-gbevoun.jpeg";
    img.onload = function () {
      logoImg = img;
    };
  }

  /* ---- Utilitaires ---- */
  function formatPrice(num) {
    return Number(num || 0)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  function padNumber(n) {
    return String(n).padStart(3, "0");
  }

  function formatPassNumber(seq) {
    const prefix = CFG.ticketPrefix || "MN-";
    return prefix + padNumber(seq);
  }

  function showToast(msg) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () {
      toast.classList.remove("show");
    }, 3200);
  }

  function copyText(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(String(text)).then(
        function () {
          showToast(label + " copié : " + text);
        },
        function () {
          fallbackCopy(text, label);
        }
      );
    } else {
      fallbackCopy(text, label);
    }
  }

  function fallbackCopy(text, label) {
    const ta = document.createElement("textarea");
    ta.value = String(text);
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast(label + " copié : " + text);
    } catch (e) {
      showToast("Copiez manuellement : " + text);
    }
    document.body.removeChild(ta);
  }

  /* ---- SHA-256 autonome (fonctionne même en local file://) ---- */
  function sha256Hex(ascii) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    const lengthProperty = "length";
    let i, j;
    let result = "";
    const words = [];
    const asciiBitLength = ascii[lengthProperty] * 8;
    let hash = (sha256Hex.h = sha256Hex.h || []);
    const k = (sha256Hex.k = sha256Hex.k || []);
    let primeCounter = k[lengthProperty];
    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) {
          isComposite[i] = candidate;
        }
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += "\x80";
    while ((ascii[lengthProperty] % 64) - 56) ascii += "\x00";
    for (i = 0; i < ascii[lengthProperty]; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return "";
      words[i >> 2] |= j << (((3 - i) % 4) * 8);
    }
    words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
    words[words[lengthProperty]] = asciiBitLength;
    for (j = 0; j < words[lengthProperty]; ) {
      const w = words.slice(j, (j += 16));
      const oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        const i2 = i + j;
        const w15 = w[i - 15],
          w2 = w[i - 2];
        const a = hash[0],
          e = hash[4];
        const temp1 =
          hash[7] +
          (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
          ((e & hash[5]) ^ (~e & hash[6])) +
          k[i] +
          (w[i] =
            i < 16
              ? w[i]
              : (w[i - 16] +
                  (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                  w[i - 7] +
                  (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
                0);
        const temp2 =
          (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
          ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (i = 0; i < 8; i++) {
        hash[i] = (hash[i] + oldHash[i]) | 0;
      }
    }
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += (b < 16 ? 0 : "") + b.toString(16);
      }
    }
    return result;
  }

  /* ---- Gestion du Stockage Local des Pass (Admin) ---- */
  function loadPasses() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function savePasses(passes) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(passes));
    } catch (e) {
      showToast("Erreur de sauvegarde locale.");
    }
  }

  function getNextSequenceNumber(passes) {
    if (!passes || passes.length === 0) return 1;
    let maxSeq = 0;
    passes.forEach(function (p) {
      if (typeof p.seq === "number" && p.seq > maxSeq) {
        maxSeq = p.seq;
      }
    });
    return maxSeq + 1;
  }

  function generateSecurityCode(seq, name) {
    const clean = (name || "INVITE").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const seed = seq + "-" + clean + "-" + Date.now() + "-" + Math.random();
    const hash = sha256Hex(seed).toUpperCase();
    return "GBV-" + hash.slice(0, 4) + "-" + hash.slice(4, 8);
  }

  /* ---- Calcul des stocks (config.js + pass locaux) ---- */
  function getStockStatus() {
    const passes = loadPasses();
    const localCounts = { standard: 0, vip: 0 };
    passes.forEach(function (p) {
      const st = p.stockType || "standard";
      localCounts[st] = (localCounts[st] || 0) + 1;
    });

    const result = {};
    const stocksCfg = CFG.stocks || {};
    Object.keys(stocksCfg).forEach(function (key) {
      const s = stocksCfg[key];
      const configSold = Number(s.sold || 0);
      const sold = Math.max(configSold, localCounts[key] || 0);
      const capacity = Number(s.capacity || 0);
      const remaining = Math.max(0, capacity - sold);
      result[key] = {
        label: s.label || key,
        capacity: capacity,
        sold: sold,
        remaining: remaining,
        percentSold: capacity > 0 ? Math.min(100, Math.round((sold / capacity) * 100)) : 0,
        percentRemaining: capacity > 0 ? Math.max(0, Math.round((remaining / capacity) * 100)) : 0
      };
    });
    return result;
  }

  /* ---- Initialisation des textes Hero ---- */
  function initHero() {
    const setTxt = function (id, val) {
      const el = document.getElementById(id);
      if (el && val) el.textContent = val;
    };
    if (CFG.organizer) setTxt("hero-organizer", CFG.organizer + " présente");
    setTxt("hero-title", CFG.name);
    setTxt("hero-tagline", CFG.tagline);
    setTxt("hero-date", CFG.date);
    setTxt("hero-time", CFG.time);
    setTxt("hero-venue", CFG.venue);
  }

  /* ---- Rendu du Compteur de Places ---- */
  function renderStockBanner() {
    const container = document.getElementById("stock-banner");
    if (!container) return;
    const stocks = getStockStatus();
    container.innerHTML = "";

    Object.keys(stocks).forEach(function (key) {
      const st = stocks[key];
      const item = document.createElement("div");
      item.className = "stock-item";
      item.innerHTML =
        '<div class="stock-top">' +
        "<span>Places <strong>" +
        escapeHtml(st.label) +
        "</strong> disponibles</span>" +
        "<strong>" +
        st.remaining +
        " / " +
        st.capacity +
        " restantes</strong>" +
        "</div>" +
        '<div class="stock-bar">' +
        '<div class="stock-fill" style="width:' +
        st.percentRemaining +
        '%;"></div>' +
        "</div>";
      container.appendChild(item);
    });
  }

  /* ---- Rendu des Cartes de Tickets ---- */
  function renderTickets() {
    const grid = document.getElementById("tickets-grid");
    const select = document.getElementById("ticket-select");
    const admSelect = document.getElementById("adm-ticket");
    if (!grid || !CFG.tickets) return;

    const stocks = getStockStatus();
    grid.innerHTML = "";
    if (select) select.innerHTML = "";
    if (admSelect) admSelect.innerHTML = "";

    CFG.tickets.forEach(function (t) {
      const st = stocks[t.stock] || { remaining: 999 };
      const isSoldOut = st.remaining < (t.persons || 1);

      const card = document.createElement("div");
      card.className = "ticket-card" + (t.badge ? " featured" : "");

      let badgeHtml = "";
      if (t.badge) {
        badgeHtml = '<div class="ticket-badge">' + escapeHtml(t.badge) + "</div>";
      }

      const perksHtml = (t.perks || [])
        .map(function (perk) {
          return "<li>" + escapeHtml(perk) + "</li>";
        })
        .join("");

      const personsLabel =
        t.persons > 1
          ? t.persons + " personnes · " + t.persons + " pass nominatifs"
          : "1 personne · 1 pass nominatif";

      card.innerHTML =
        badgeHtml +
        '<div class="ticket-name">' +
        escapeHtml(t.name) +
        "</div>" +
        '<div class="ticket-persons">' +
        personsLabel +
        "</div>" +
        '<div class="ticket-price">' +
        formatPrice(t.price) +
        " <small>" +
        escapeHtml(CFG.currency || "FCFA") +
        "</small></div>" +
        '<ul class="ticket-perks">' +
        perksHtml +
        "</ul>" +
        '<button type="button" class="btn ' +
        (t.badge ? "" : "btn-outline ") +
        'btn-block" data-select-ticket="' +
        escapeHtml(t.id) +
        '" ' +
        (isSoldOut ? "disabled" : "") +
        ">" +
        (isSoldOut ? "Complet" : "Choisir ce Pass") +
        "</button>";

      grid.appendChild(card);

      if (select) {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent =
          t.name +
          " — " +
          formatPrice(t.price) +
          " " +
          (CFG.currency || "FCFA") +
          " (" +
          t.persons +
          (t.persons > 1 ? " personnes)" : " personne)");
        if (isSoldOut) opt.disabled = true;
        select.appendChild(opt);
      }

      if (admSelect) {
        const admOpt = document.createElement("option");
        admOpt.value = t.id;
        admOpt.textContent =
          t.name + " — " + formatPrice(t.price) + " " + (CFG.currency || "FCFA");
        admSelect.appendChild(admOpt);
      }
    });

    grid.querySelectorAll("[data-select-ticket]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const tid = btn.getAttribute("data-select-ticket");
        selectedTicketId = tid;
        if (select) select.value = tid;
        updateOrderForm();
        const section = document.getElementById("commander");
        if (section) section.scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  function getTicketById(id) {
    const list = CFG.tickets || [];
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return list[0] || { id: "solo", name: "Standard Solo", price: 3000, persons: 1, stock: "standard" };
  }

  /* ---- Mise à jour du Formulaire de Commande & Paiement ---- */
  function updateOrderForm() {
    const select = document.getElementById("ticket-select");
    if (select && select.value) {
      selectedTicketId = select.value;
    }
    const ticket = getTicketById(selectedTicketId);
    const fieldName2 = document.getElementById("field-name-2");
    const labelName1 = document.getElementById("label-name-1");

    if (ticket.persons > 1) {
      if (fieldName2) fieldName2.classList.remove("hidden");
      if (labelName1) labelName1.textContent = "Nom & Prénom du 1er participant (Pass #1)";
    } else {
      if (fieldName2) fieldName2.classList.add("hidden");
      if (labelName1) labelName1.textContent = "Nom & Prénom du participant";
    }

    const payments = CFG.payments || {};
    const pay = payments[selectedPayMethod] || payments.mixx || {
      label: "Mixx by Yas",
      number: "93895722",
      ussd: "*145#",
      whatsapp: "22893895722"
    };

    const elNet = document.getElementById("pay-network-label");
    const elNum = document.getElementById("pay-number");
    const elAmt = document.getElementById("pay-amount");
    const elUssd = document.getElementById("pay-ussd");
    const btnUssd = document.getElementById("btn-ussd");

    if (elNet) elNet.textContent = pay.label;
    if (elNum) elNum.textContent = pay.number;
    if (elAmt) elAmt.textContent = formatPrice(ticket.price) + " " + (CFG.currency || "FCFA");
    if (elUssd) elUssd.textContent = pay.ussd;
    if (btnUssd) {
      btnUssd.setAttribute("href", "tel:" + encodeURIComponent(pay.ussd));
    }
  }

  function initOrderEvents() {
    const select = document.getElementById("ticket-select");
    if (select) {
      select.addEventListener("change", function () {
        selectedTicketId = select.value;
        updateOrderForm();
      });
    }

    const payMethods = document.getElementById("pay-methods");
    if (payMethods) {
      payMethods.querySelectorAll(".pay-option").forEach(function (opt) {
        opt.addEventListener("click", function () {
          payMethods.querySelectorAll(".pay-option").forEach(function (o) {
            o.classList.remove("active");
          });
          opt.classList.add("active");
          selectedPayMethod = opt.getAttribute("data-method") || "mixx";
          updateOrderForm();
        });
      });
    }

    const btnCopyNumber = document.getElementById("btn-copy-number");
    if (btnCopyNumber) {
      btnCopyNumber.addEventListener("click", function () {
        const pay = (CFG.payments && CFG.payments[selectedPayMethod]) || {};
        copyText(pay.number || "93895722", "Numéro");
      });
    }

    const btnCopyAmount = document.getElementById("btn-copy-amount");
    if (btnCopyAmount) {
      btnCopyAmount.addEventListener("click", function () {
        const ticket = getTicketById(selectedTicketId);
        copyText(ticket.price, "Montant");
      });
    }

    const btnWhatsapp = document.getElementById("btn-whatsapp-send");
    if (btnWhatsapp) {
      btnWhatsapp.addEventListener("click", function () {
        const ticket = getTicketById(selectedTicketId);
        const name1 = (document.getElementById("buyer-name")?.value || "").trim();
        const name2 = (document.getElementById("buyer-name-2")?.value || "").trim();
        const phone = (document.getElementById("buyer-phone")?.value || "").trim();

        if (!name1) {
          showToast("Veuillez saisir votre Nom & Prénom avant d'envoyer sur WhatsApp.");
          document.getElementById("buyer-name")?.focus();
          return;
        }
        if (ticket.persons > 1 && !name2) {
          showToast("Veuillez saisir le Nom & Prénom du 2e participant pour le Pass Duo.");
          document.getElementById("buyer-name-2")?.focus();
          return;
        }

        const pay = (CFG.payments && CFG.payments[selectedPayMethod]) || {
          label: "Mixx by Yas",
          number: "93895722",
          whatsapp: "22893895722"
        };

        const lines = [
          "Bonjour *Maison de Production Gbévoun* !",
          "Voici ma demande de pass pour la soirée *" + (CFG.name || "Mafia Night") + "* :",
          "",
          "• *Catégorie :* " + ticket.name + " (" + formatPrice(ticket.price) + " " + (CFG.currency || "FCFA") + ")",
          "• *Participant #1 :* " + name1
        ];
        if (ticket.persons > 1) {
          lines.push("• *Participant #2 :* " + name2);
        }
        if (phone) {
          lines.push("• *WhatsApp pour réception du Pass :* " + phone);
        }
        lines.push("• *Moyen de paiement :* " + pay.label + " (" + pay.number + ")");
        lines.push("");
        lines.push("Je joins la capture d'écran de mon reçu de transfert pour validation et émission de mon pass officiel numéroté.");

        const waUrl =
          "https://wa.me/" +
          encodeURIComponent(pay.whatsapp || "22893895722") +
          "?text=" +
          encodeURIComponent(lines.join("\n"));

        window.open(waUrl, "_blank", "noopener,noreferrer");
      });
    }
  }

  /* ==========================================================
     ESPACE ADMINISTRATEUR (Numérotation, Pass PNG & Contrôle)
     ========================================================== */
  function openAdminSection() {
    const adminSec = document.getElementById("admin");
    if (!adminSec) return;
    adminSec.classList.remove("hidden");
    adminSec.scrollIntoView({ behavior: "smooth" });
  }

  function unlockAdminPanel() {
    const loginCard = document.getElementById("admin-login-card");
    const panel = document.getElementById("admin-panel");
    if (loginCard) loginCard.classList.add("hidden");
    if (panel) panel.classList.remove("hidden");
    sessionStorage.setItem(SESSION_AUTH_KEY, "1");
    refreshAdminUI();
  }

  function initAdminEvents() {
    const linkOpen = document.getElementById("link-open-admin");
    if (linkOpen) {
      linkOpen.addEventListener("click", function (e) {
        e.preventDefault();
        openAdminSection();
      });
    }

    if (window.location.hash === "#admin") {
      openAdminSection();
    }
    window.addEventListener("hashchange", function () {
      if (window.location.hash === "#admin") {
        openAdminSection();
      }
    });

    if (sessionStorage.getItem(SESSION_AUTH_KEY) === "1") {
      unlockAdminPanel();
    }

    const btnLogin = document.getElementById("btn-admin-login");
    const inputPass = document.getElementById("admin-pass");
    const tryLogin = function () {
      const val = (inputPass?.value || "").trim();
      if (!val) {
        showToast("Saisissez le mot de passe administrateur.");
        return;
      }
      const hashed = sha256Hex(val);
      if (hashed === CFG.adminPasswordHash) {
        showToast("Accès administrateur déverrouillé.");
        unlockAdminPanel();
      } else {
        showToast("Mot de passe incorrect.");
      }
    };

    if (btnLogin) btnLogin.addEventListener("click", tryLogin);
    if (inputPass) {
      inputPass.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          tryLogin();
        }
      });
    }

    const admTicket = document.getElementById("adm-ticket");
    const admFieldName2 = document.getElementById("adm-field-name-2");
    if (admTicket) {
      admTicket.addEventListener("change", function () {
        const t = getTicketById(admTicket.value);
        if (admFieldName2) {
          if (t.persons > 1) admFieldName2.classList.remove("hidden");
          else admFieldName2.classList.add("hidden");
        }
      });
    }

    const btnGenerate = document.getElementById("btn-adm-generate");
    if (btnGenerate) {
      btnGenerate.addEventListener("click", handleAdminGeneratePass);
    }

    const searchInput = document.getElementById("adm-search");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        renderAdminTable(searchInput.value);
      });
    }

    const btnExportCsv = document.getElementById("btn-export-csv");
    if (btnExportCsv) {
      btnExportCsv.addEventListener("click", exportPassesCsv);
    }

    const btnExportJson = document.getElementById("btn-export-json");
    if (btnExportJson) {
      btnExportJson.addEventListener("click", exportPassesJson);
    }

    const inputImportJson = document.getElementById("input-import-json");
    if (inputImportJson) {
      inputImportJson.addEventListener("change", importPassesJson);
    }
  }

  function handleAdminGeneratePass() {
    const admTicket = document.getElementById("adm-ticket");
    const admMethod = document.getElementById("adm-method");
    const admPhone = document.getElementById("adm-phone");
    const admName1 = document.getElementById("adm-name-1");
    const admName2 = document.getElementById("adm-name-2");
    const admRef = document.getElementById("adm-ref");

    const ticket = getTicketById(admTicket ? admTicket.value : "solo");
    const name1 = (admName1?.value || "").trim();
    const name2 = (admName2?.value || "").trim();
    const phone = (admPhone?.value || "").trim();
    const method = admMethod?.value || "Mixx by Yas (93895722)";
    const ref = (admRef?.value || "").trim();

    if (!name1) {
      showToast("Veuillez renseigner le nom du Participant #1.");
      admName1?.focus();
      return;
    }
    if (ticket.persons > 1 && !name2) {
      showToast("Veuillez renseigner le nom du Participant #2 pour le Pass Duo.");
      admName2?.focus();
      return;
    }

    const stocks = getStockStatus();
    const st = stocks[ticket.stock];
    if (st && st.remaining < ticket.persons) {
      const ok = window.confirm(
        "Attention : Le quota " +
          st.label +
          " (" +
          st.capacity +
          " places) est atteint. Voulez-vous quand même émettre ce(s) pass ?"
      );
      if (!ok) return;
    }

    const passes = loadPasses();
    let nextSeq = getNextSequenceNumber(passes);
    const nowIso = new Date().toISOString();
    const orderId = "ORD-" + Date.now();
    const createdPasses = [];

    if (ticket.persons === 1) {
      const p1 = {
        id: "PASS-" + Date.now() + "-1",
        seq: nextSeq,
        passNumber: formatPassNumber(nextSeq),
        orderId: orderId,
        holderName: name1,
        ticketId: ticket.id,
        ticketName: ticket.name,
        stockType: ticket.stock,
        orderRevenue: ticket.price,
        displayPrice: formatPrice(ticket.price) + " " + (CFG.currency || "FCFA"),
        paymentMethod: method,
        buyerPhone: phone,
        paymentRef: ref,
        securityCode: generateSecurityCode(nextSeq, name1),
        createdAt: nowIso,
        checkedIn: false,
        checkedInAt: null
      };
      passes.push(p1);
      createdPasses.push(p1);
    } else {
      // Standard Duo : génère 2 pass individuels avec 2 numéros consécutifs
      const seq1 = nextSeq;
      const seq2 = nextSeq + 1;
      const p1 = {
        id: "PASS-" + Date.now() + "-1",
        seq: seq1,
        passNumber: formatPassNumber(seq1),
        orderId: orderId,
        holderName: name1,
        ticketId: ticket.id,
        ticketName: ticket.name + " (Pass 1/2)",
        stockType: ticket.stock,
        orderRevenue: ticket.price,
        displayPrice: formatPrice(ticket.price) + " " + (CFG.currency || "FCFA") + " (Duo 1/2)",
        paymentMethod: method,
        buyerPhone: phone,
        paymentRef: ref,
        securityCode: generateSecurityCode(seq1, name1),
        createdAt: nowIso,
        checkedIn: false,
        checkedInAt: null
      };
      const p2 = {
        id: "PASS-" + Date.now() + "-2",
        seq: seq2,
        passNumber: formatPassNumber(seq2),
        orderId: orderId,
        holderName: name2,
        ticketId: ticket.id,
        ticketName: ticket.name + " (Pass 2/2)",
        stockType: ticket.stock,
        orderRevenue: 0,
        displayPrice: formatPrice(ticket.price) + " " + (CFG.currency || "FCFA") + " (Duo 2/2)",
        paymentMethod: method,
        buyerPhone: phone,
        paymentRef: ref,
        securityCode: generateSecurityCode(seq2, name2),
        createdAt: nowIso,
        checkedIn: false,
        checkedInAt: null
      };
      passes.push(p1, p2);
      createdPasses.push(p1, p2);
    }

    savePasses(passes);

    if (admName1) admName1.value = "";
    if (admName2) admName2.value = "";
    if (admRef) admRef.value = "";

    refreshAdminUI();
    renderStockBanner();
    renderTickets();
    renderLatestGeneratedPasses(createdPasses);

    const nums = createdPasses.map(function (p) { return p.passNumber; }).join(" & ");
    showToast("Pass généré(s) avec succès : " + nums);
  }

  /* ---- Dessin du Pass Officiel sur Canvas (PNG Haute Qualité) ---- */
  function drawPassCanvas(canvas, pass) {
    const W = 1200;
    const H = 620;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    const isVip = pass.stockType === "vip";

    // Fond Noir profond & dégradé Bordeaux / Or
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    if (isVip) {
      bgGrad.addColorStop(0, "#120c08");
      bgGrad.addColorStop(0.55, "#260910");
      bgGrad.addColorStop(1, "#090706");
    } else {
      bgGrad.addColorStop(0, "#090807");
      bgGrad.addColorStop(0.6, "#18090d");
      bgGrad.addColorStop(1, "#0b0908");
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Halo lumineux subtil
    const radGrad = ctx.createRadialGradient(W * 0.35, H * 0.2, 20, W * 0.35, H * 0.5, 520);
    radGrad.addColorStop(0, isVip ? "rgba(212, 175, 55, 0.16)" : "rgba(158, 34, 53, 0.20)");
    radGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, W, H);

    // Cadres Art Déco dorés
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, W - 48, H - 48);

    ctx.strokeStyle = "rgba(212, 175, 55, 0.38)";
    ctx.lineWidth = 1;
    ctx.strokeRect(34, 34, W - 68, H - 68);

    // Coins Art Déco
    const corners = [
      [24, 24, 1, 1],
      [W - 24, 24, -1, 1],
      [24, H - 24, 1, -1],
      [W - 24, H - 24, -1, -1]
    ];
    ctx.strokeStyle = "#f0d77b";
    ctx.lineWidth = 2;
    corners.forEach(function (c) {
      const cx = c[0], cy = c[1], dx = c[2], dy = c[3];
      ctx.beginPath();
      ctx.moveTo(cx + dx * 28, cy);
      ctx.lineTo(cx + dx * 28, cy + dy * 28);
      ctx.lineTo(cx, cy + dy * 28);
      ctx.stroke();
    });

    // Ligne de séparation verticale (Souche de contrôle à droite)
    const stubX = 870;
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = "rgba(212, 175, 55, 0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(stubX, 34);
    ctx.lineTo(stubX, H - 34);
    ctx.stroke();
    ctx.restore();

    // Encoches demi-cercles sur la ligne de découpe
    ctx.fillStyle = "#080706";
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 2;
    [24, H - 24].forEach(function (ny) {
      ctx.beginPath();
      ctx.arc(stubX, ny, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Logo Gbévoun en haut à gauche (si chargé)
    let textStartX = 68;
    if (logoImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(102, 102, 40, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(logoImg, 62, 62, 80, 80);
      ctx.restore();

      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(102, 102, 40, 0, Math.PI * 2);
      ctx.stroke();
      textStartX = 160;
    }

    // En-tête organisateur
    ctx.fillStyle = "#d4af37";
    ctx.font = "600 17px 'Cinzel', Georgia, serif";
    ctx.fillText((CFG.organizer || "MAISON DE PRODUCTION GBÉVOUN").toUpperCase(), textStartX, 92);

    ctx.fillStyle = "#a69c8b";
    ctx.font = "500 14px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("PASS OFFICIEL NOMINATIF · SOIRÉE IMMERSIVE ANNÉES 20–30", textStartX, 118);

    // Titre MAFIA NIGHT
    ctx.fillStyle = "#f0d77b";
    ctx.font = "800 66px 'Cinzel', Georgia, serif";
    ctx.fillText((CFG.name || "MAFIA NIGHT").toUpperCase(), 68, 215);

    // Sous-titre
    ctx.fillStyle = "#f3eee5";
    ctx.font = "italic 24px 'Cormorant Garamond', Georgia, serif";
    ctx.fillText(CFG.tagline || "Une nuit. Une famille. Un seul code : l'élégance.", 68, 252);

    // Badge Catégorie
    const badgeY = 285;
    const badgeText = pass.ticketName.toUpperCase();
    ctx.font = "700 18px 'Cinzel', Georgia, serif";
    const badgeWidth = Math.max(240, ctx.measureText(badgeText).width + 44);
    ctx.fillStyle = isVip ? "#d4af37" : "#6b1420";
    ctx.fillRect(68, badgeY, badgeWidth, 42);
    ctx.strokeStyle = "#f0d77b";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(68, badgeY, badgeWidth, 42);

    ctx.fillStyle = isVip ? "#090807" : "#f3eee5";
    ctx.fillText(badgeText, 88, badgeY + 27);

    // Détenteur du Pass
    ctx.fillStyle = "#a69c8b";
    ctx.font = "600 13px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("DÉTENTEUR DU PASS (INVITÉ NOMINATIF)", 68, 372);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 34px 'Cinzel', Georgia, serif";
    const holderDisplay = (pass.holderName || "Invité").slice(0, 34);
    ctx.fillText(holderDisplay, 68, 412);

    // Infos Date / Heure / Lieu / Dress code
    ctx.strokeStyle = "rgba(212, 175, 55, 0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(68, 442);
    ctx.lineTo(stubX - 40, 442);
    ctx.stroke();

    ctx.fillStyle = "#d4af37";
    ctx.font = "700 13px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("DATE & HORAIRE", 68, 474);
    ctx.fillText("LIEU SECRET", 350, 474);
    ctx.fillText("DRESS CODE OBLIGATOIRE", 610, 474);

    ctx.fillStyle = "#f3eee5";
    ctx.font = "500 16px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText((CFG.date || "Date bientôt annoncée") + " · " + (CFG.time || "Dès 19h"), 68, 500);
    ctx.fillText("Lomé (Privé)", 350, 500);
    ctx.fillText("Gangster Chic 20–30", 610, 500);

    // Pied de carte gauche
    ctx.fillStyle = "#a69c8b";
    ctx.font = "400 13px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(
      "Ce pass est strictement personnel et contrôlé à l'entrée par son numéro et son code de sécurité unique.",
      68,
      562
    );

    // ---- Partie Droite : Souche Numéro & Sécurité Anti-Duplication ----
    const centerStubX = stubX + (W - 24 - stubX) / 2;
    ctx.textAlign = "center";

    ctx.fillStyle = "#d4af37";
    ctx.font = "700 14px 'Cinzel', Georgia, serif";
    ctx.fillText("N° D'ORDRE OFFICIEL", centerStubX, 95);

    // Boîte Numéro de Pass (MN-001)
    ctx.fillStyle = "rgba(212, 175, 55, 0.12)";
    ctx.fillRect(stubX + 32, 114, W - stubX - 80, 78);
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 2;
    ctx.strokeRect(stubX + 32, 114, W - stubX - 80, 78);

    ctx.fillStyle = "#f0d77b";
    ctx.font = "800 44px 'Cinzel', Georgia, serif";
    ctx.fillText(pass.passNumber, centerStubX, 168);

    // Prix affiché
    ctx.fillStyle = "#f3eee5";
    ctx.font = "600 16px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(pass.displayPrice, centerStubX, 224);

    // Matrice visuelle de contrôle (Style QR / Sceau géométrique unique basé sur securityCode)
    const boxSize = 156;
    const boxX = centerStubX - boxSize / 2;
    const boxY = 252;
    ctx.fillStyle = "#080706";
    ctx.fillRect(boxX, boxY, boxSize, boxSize);
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxSize, boxSize);

    const cells = 9;
    const cellSize = (boxSize - 24) / cells;
    const codeHash = sha256Hex(pass.securityCode + "|" + pass.passNumber);
    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        const isFinder =
          (r < 2 && c < 2) ||
          (r < 2 && c >= cells - 2) ||
          (r >= cells - 2 && c < 2);
        const charIdx = (r * cells + c) % codeHash.length;
        const val = parseInt(codeHash[charIdx], 16);
        if (isFinder || val % 2 === 0) {
          ctx.fillStyle = isFinder ? "#d4af37" : "#f3eee5";
          ctx.fillRect(
            boxX + 12 + c * cellSize + 1,
            boxY + 12 + r * cellSize + 1,
            cellSize - 2,
            cellSize - 2
          );
        }
      }
    }

    // Code de sécurité anti-duplication
    ctx.fillStyle = "#a69c8b";
    ctx.font = "600 12px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("CODE ANTI-DUPLICATION", centerStubX, 442);

    ctx.fillStyle = "#f0d77b";
    ctx.font = "700 18px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(pass.securityCode, centerStubX, 468);

    // Date d'émission
    const dateStr = new Date(pass.createdAt).toLocaleDateString("fr-FR");
    ctx.fillStyle = "#a69c8b";
    ctx.font = "400 12px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("Émis le " + dateStr, centerStubX, 515);
    ctx.fillText("Entrée unique · Gbévoun", centerStubX, 535);

    ctx.textAlign = "left";
  }

  function downloadCanvasAsPng(canvas, pass) {
    const cleanName = (pass.holderName || "Invite")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_");
    const filename = pass.passNumber + "_" + cleanName + ".png";
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("Pass téléchargé : " + filename);
  }

  function sendPassViaWhatsApp(pass) {
    const rawPhone = (pass.buyerPhone || "").replace(/[^0-9]/g, "");
    const normalizedPhone =
      rawPhone.length === 8 ? "228" + rawPhone : rawPhone;

    const msg = [
      "Bonsoir *" + pass.holderName + "* !",
      "Votre paiement pour la soirée *" + (CFG.name || "Mafia Night") + "* (" + (CFG.organizer || "Maison de Production Gbévoun") + ") est validé.",
      "",
      "🎫 *Pass N° :* " + pass.passNumber,
      "👤 *Nom :* " + pass.holderName,
      "✨ *Catégorie :* " + pass.ticketName,
      "🔐 *Code de sécurité :* " + pass.securityCode,
      "",
      "Veuillez trouver ci-joint votre *Pass Officiel PNG* à présenter à l'entrée (code unique contrôlé sur la liste officielle). À très vite dans la Famille !"
    ].join("\n");

    const url = normalizedPhone
      ? "https://wa.me/" + normalizedPhone + "?text=" + encodeURIComponent(msg)
      : "https://wa.me/?text=" + encodeURIComponent(msg);

    window.open(url, "_blank", "noopener,noreferrer");
  }

  function renderLatestGeneratedPasses(passesList) {
    const container = document.getElementById("latest-passes-container");
    const grid = document.getElementById("latest-passes-grid");
    if (!container || !grid) return;

    grid.innerHTML = "";
    container.classList.remove("hidden");

    passesList.forEach(function (pass) {
      const item = document.createElement("div");
      item.className = "pass-preview-item";

      const canvas = document.createElement("canvas");
      drawPassCanvas(canvas, pass);

      const actions = document.createElement("div");
      actions.className = "pass-preview-actions";

      const btnDl = document.createElement("button");
      btnDl.type = "button";
      btnDl.className = "btn btn-sm";
      btnDl.textContent = "Télécharger PNG (" + pass.passNumber + ")";
      btnDl.addEventListener("click", function () {
        downloadCanvasAsPng(canvas, pass);
      });

      const btnWa = document.createElement("button");
      btnWa.type = "button";
      btnWa.className = "btn btn-whatsapp btn-sm";
      btnWa.textContent = "Envoyer sur WhatsApp";
      btnWa.addEventListener("click", function () {
        downloadCanvasAsPng(canvas, pass);
        sendPassViaWhatsApp(pass);
      });

      actions.appendChild(btnDl);
      actions.appendChild(btnWa);

      item.appendChild(canvas);
      item.appendChild(actions);
      grid.appendChild(item);
    });
  }

  /* ---- Mise à jour des Statistiques & Liste Complète Admin ---- */
  function refreshAdminUI() {
    const passes = loadPasses();
    const nextSeq = getNextSequenceNumber(passes);

    let stdCount = 0;
    let vipCount = 0;
    let totalRevenue = 0;
    let checkedInCount = 0;

    passes.forEach(function (p) {
      if (p.stockType === "vip") vipCount++;
      else stdCount++;
      totalRevenue += Number(p.orderRevenue || 0);
      if (p.checkedIn) checkedInCount++;
    });

    const setTxt = function (id, val) {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setTxt("stat-total-passes", String(passes.length));
    setTxt("stat-next-number", formatPassNumber(nextSeq));
    setTxt(
      "stat-stock-Breakdown",
      stdCount +
        "/" +
        (CFG.stocks?.standard?.capacity || 150) +
        " · " +
        vipCount +
        "/" +
        (CFG.stocks?.vip?.capacity || 30)
    );
    setTxt("stat-revenue", formatPrice(totalRevenue) + " " + (CFG.currency || "FCFA"));
    setTxt("stat-checked-in", checkedInCount + " / " + passes.length);

    const snippet = document.getElementById("adm-config-snippet");
    if (snippet) {
      snippet.textContent =
        "stocks: {\n" +
        '  standard: { label: "Standard", capacity: ' +
        (CFG.stocks?.standard?.capacity || 150) +
        ", sold: " +
        stdCount +
        " },\n" +
        '  vip:      { label: "VIP",      capacity: ' +
        (CFG.stocks?.vip?.capacity || 30) +
        ",  sold: " +
        vipCount +
        " }\n" +
        "},";
    }

    const searchVal = document.getElementById("adm-search")?.value || "";
    renderAdminTable(searchVal);
  }

  function renderAdminTable(query) {
    const tbody = document.getElementById("adm-table-body");
    if (!tbody) return;

    const passes = loadPasses();
    const q = (query || "").trim().toLowerCase();

    const filtered = passes.filter(function (p) {
      if (!q) return true;
      return (
        (p.passNumber || "").toLowerCase().includes(q) ||
        (p.holderName || "").toLowerCase().includes(q) ||
        (p.buyerPhone || "").toLowerCase().includes(q) ||
        (p.securityCode || "").toLowerCase().includes(q) ||
        (p.ticketName || "").toLowerCase().includes(q)
      );
    });

    tbody.innerHTML = "";

    if (filtered.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML =
        '<td colspan="9" style="text-align:center;color:var(--muted);padding:22px;">Aucun pass enregistré pour le moment.</td>';
      tbody.appendChild(tr);
      return;
    }

    filtered.forEach(function (pass) {
      const tr = document.createElement("tr");

      let statusHtml = "";
      if (pass.checkedIn) {
        const timeStr = pass.checkedInAt
          ? new Date(pass.checkedInAt).toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit"
            })
          : "";
        statusHtml =
          '<span class="pill pill-used">Déjà entré ' +
          (timeStr ? "(" + timeStr + ")" : "") +
          "</span>";
      } else {
        statusHtml = '<span class="pill pill-valid">Valide · Non utilisé</span>';
      }

      const paymentInfo =
        escapeHtml(pass.paymentMethod || "-") +
        (pass.paymentRef ? "<br><small style=\"color:var(--muted)\">Réf: " + escapeHtml(pass.paymentRef) + "</small>" : "");

      tr.innerHTML =
        '<td><strong class="mono">' +
        escapeHtml(pass.passNumber) +
        "</strong></td>" +
        "<td><strong>" +
        escapeHtml(pass.holderName) +
        "</strong></td>" +
        "<td>" +
        escapeHtml(pass.ticketName) +
        "</td>" +
        "<td>" +
        escapeHtml(pass.displayPrice) +
        "</td>" +
        "<td>" +
        paymentInfo +
        "</td>" +
        "<td>" +
        escapeHtml(pass.buyerPhone || "-") +
        "</td>" +
        '<td><span class="mono" style="font-size:0.84rem;">' +
        escapeHtml(pass.securityCode) +
        "</span></td>" +
        "<td>" +
        statusHtml +
        "</td>" +
        "<td>" +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
        '<button type="button" class="btn btn-sm ' +
        (pass.checkedIn ? "btn-outline" : "") +
        '" data-action="checkin" data-id="' +
        escapeHtml(pass.id) +
        '">' +
        (pass.checkedIn ? "Annuler entrée" : "Pointer entrée") +
        "</button>" +
        '<button type="button" class="btn btn-outline btn-sm" data-action="png" data-id="' +
        escapeHtml(pass.id) +
        '">PNG</button>' +
        '<button type="button" class="btn btn-whatsapp btn-sm" data-action="wa" data-id="' +
        escapeHtml(pass.id) +
        '">WhatsApp</button>' +
        '<button type="button" class="btn btn-outline btn-sm" style="border-color:var(--danger);color:var(--danger);" data-action="delete" data-id="' +
        escapeHtml(pass.id) +
        '">✕</button>' +
        "</div>" +
        "</td>";

      tbody.appendChild(tr);
    });

    tbody.querySelectorAll("button[data-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const action = btn.getAttribute("data-action");
        const id = btn.getAttribute("data-id");
        handleTableAction(action, id);
      });
    });
  }

  function handleTableAction(action, passId) {
    const passes = loadPasses();
    const idx = passes.findIndex(function (p) {
      return p.id === passId;
    });
    if (idx === -1) return;
    const pass = passes[idx];

    if (action === "checkin") {
      if (pass.checkedIn) {
        const confirmUndo = window.confirm(
          "Le pass " +
            pass.passNumber +
            " (" +
            pass.holderName +
            ") est déjà marqué comme ENTRÉ.\nVoulez-vous vraiment réinitialiser son statut d'entrée ?"
        );
        if (!confirmUndo) return;
        pass.checkedIn = false;
        pass.checkedInAt = null;
        showToast("Statut d'entrée réinitialisé pour " + pass.passNumber);
      } else {
        pass.checkedIn = true;
        pass.checkedInAt = new Date().toISOString();
        showToast("Entrée validée pour " + pass.passNumber + " (" + pass.holderName + ")");
      }
      savePasses(passes);
      refreshAdminUI();
    } else if (action === "png") {
      const tempCanvas = document.createElement("canvas");
      drawPassCanvas(tempCanvas, pass);
      downloadCanvasAsPng(tempCanvas, pass);
    } else if (action === "wa") {
      sendPassViaWhatsApp(pass);
    } else if (action === "delete") {
      const ok = window.confirm(
        "Supprimer définitivement le pass " + pass.passNumber + " (" + pass.holderName + ") ?"
      );
      if (!ok) return;
      passes.splice(idx, 1);
      savePasses(passes);
      refreshAdminUI();
      renderStockBanner();
      renderTickets();
      showToast("Pass " + pass.passNumber + " supprimé.");
    }
  }

  /* ---- Export CSV (Excel) & Sauvegarde JSON ---- */
  function exportPassesCsv() {
    const passes = loadPasses();
    if (passes.length === 0) {
      showToast("Aucun pass à exporter.");
      return;
    }

    const headers = [
      "Numero_Pass",
      "Participant",
      "Categorie",
      "Type_Stock",
      "Recette_FCFA",
      "Moyen_Paiement",
      "Reference_Paiement",
      "WhatsApp_Client",
      "Code_Securite",
      "Statut_Entree",
      "Heure_Entree",
      "Date_Emission"
    ];

    const rows = passes.map(function (p) {
      return [
        p.passNumber,
        p.holderName,
        p.ticketName,
        p.stockType,
        p.orderRevenue,
        p.paymentMethod,
        p.paymentRef || "",
        p.buyerPhone || "",
        p.securityCode,
        p.checkedIn ? "ENTRE" : "NON_UTILISE",
        p.checkedInAt || "",
        p.createdAt || ""
      ]
        .map(function (cell) {
          const str = String(cell ?? "").replace(/"/g, '""');
          return '"' + str + '"';
        })
        .join(";");
    });

    const csvContent = "\uFEFF" + headers.join(";") + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Mafia_Night_Liste_Officielle.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Liste CSV exportée (compatible Excel).");
  }

  function exportPassesJson() {
    const passes = loadPasses();
    const data = JSON.stringify(passes, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Mafia_Night_Sauvegarde.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Sauvegarde JSON téléchargée.");
  }

  function importPassesJson(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (!Array.isArray(parsed)) throw new Error("Format invalide");
        savePasses(parsed);
        refreshAdminUI();
        renderStockBanner();
        renderTickets();
        showToast(parsed.length + " pass importés avec succès.");
      } catch (err) {
        showToast("Fichier JSON invalide.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* ---- Démarrage ---- */
  document.addEventListener("DOMContentLoaded", function () {
    preloadLogo();
    initHero();
    renderStockBanner();
    renderTickets();
    updateOrderForm();
    initOrderEvents();
    initAdminEvents();
  });
})();
