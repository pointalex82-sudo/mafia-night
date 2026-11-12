/* ==========================================================
   MAFIA NIGHT — CONFIGURATION
   Modifiez ce fichier pour mettre à jour la date, le lieu,
   les places vendues (compteur) et les numéros de paiement.
   ========================================================== */
window.EVENT_CONFIG = {
  name: "Mafia Night",
  organizer: "Maison de Production Gbévoun",
  tagline: "Une nuit. Une famille. Un seul code : l'élégance.",
  date: "Date bientôt annoncée",          // ex : "Samedi 12 décembre 2026"
  time: "19h00 – 02h00",
  venue: "Lieu privé dévoilé aux détenteurs de pass · Lomé",
  currency: "FCFA",
  ticketPrefix: "MN-",

  /* ---- Catégories de tickets ---- */
  tickets: [
    {
      id: "solo",
      name: "Standard Solo",
      price: 3000,
      persons: 1,
      stock: "standard",
      perks: ["Accès à la soirée", "Photobooth thématique", "Concours du meilleur look"]
    },
    {
      id: "duo",
      name: "Standard Duo",
      price: 5000,
      persons: 2,
      stock: "standard",
      badge: "Le plus choisi",
      perks: ["Accès pour 2 personnes", "2 pass nominatifs", "Photobooth thématique", "Concours du meilleur look"]
    },
    {
      id: "vip",
      name: "VIP Solo",
      price: 10000,
      persons: 1,
      stock: "vip",
      badge: "Prestige",
      perks: ["Accès prioritaire", "Espace VIP réservé", "Accueil personnalisé", "Toutes les animations"]
    }
  ],

  /* ---- Compteur de places (à mettre à jour à la main) ----
     "sold" = nombre de PERSONNES déjà validées.
     L'espace admin vous indique les bons chiffres à recopier ici. */
  stocks: {
    standard: { label: "Standard", capacity: 150, sold: 0 },
    vip:      { label: "VIP",      capacity: 30,  sold: 0 }
  },

  /* ---- Moyens de paiement ---- */
  payments: {
    mixx: {
      label: "Mixx by Yas",
      number: "93895722",
      ussd: "*145#",
      whatsapp: "22893895722",
      color: "#f5c400"
    },
    flooz: {
      label: "Flooz",
      number: "79864336",
      ussd: "*155#",
      whatsapp: "22879864336",
      color: "#1e88e5"
    }
  },

  /* ---- Mot de passe admin (empreinte SHA-256) ----
     Mot de passe par défaut : MafiaNight2026
     Pour le changer : Admin > Réglages > « Générer une empreinte ». */
  adminPasswordHash: "154747da69904f017e139101f9b606cffc5a4ceb7b8bcb645b61aa285d727f73"
};

