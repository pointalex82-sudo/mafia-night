/* ==========================================================
   MAFIA NIGHT — CONFIGURATION
   Modifiez ce fichier pour mettre à jour la date, le lieu,
   les places vendues (compteur) et les numéros de paiement.
   ========================================================== */
window.EVENT_CONFIG = {
  name: "Mafia Night",
  organizer: "Maison de Production Gbévoun",
  tagline: "Une nuit. Une famille. Un seul code : l'élégance.",
  date: "Jeudi 24 décembre 2026",
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
     Mot de passe : XELA93
     Pour le changer : Admin > Réglages > « Générer une empreinte ». */
  adminPasswordHash: "b0cb6382e463f7ef61bbc65b59ce81314acf3dcafef55243f4f5f66b2e19344a",

  /* ---- Connexion Base de données Cloud (Supabase) ---- */
  supabase: {
    url: "https://tziuuntapgxgljxhhdfx.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6aXV1bnRhcGd4Z2xqeGhoZGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2ODgzMDEsImV4cCI6MjExMDI2NDMwMX0.p3zd5ZG9jzZwDu5Opn2TT3aCIzUKNNpJISeW8Qajqos"
  }
};

