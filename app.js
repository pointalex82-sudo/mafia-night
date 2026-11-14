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
  /* ---- Client Supabase pour synchronisation Cloud en direct ---- */
  let supabaseClient = null;
  function getSupabase() {
    if (supabaseClient) return supabaseClient;
    if (window.supabase && CFG.supabase && CFG.supabase.url && CFG.supabase.anonKey) {
      try {
        supabaseClient = window.supabase.createClient(CFG.supabase.url, CFG.supabase.anonKey);
      } catch (err) {
        console.warn("Erreur initialisation Supabase:", err);
      }
    }
    return supabaseClient;
  }

  const STORAGE_KEY = "gbevoun_mafia_night_passes_v1";
  const PENDING_KEY = "gbevoun_mafia_night_pending_v1";
  const SESSION_AUTH_KEY = "gbevoun_mafia_night_admin_unlocked";

  let selectedTicketId = (CFG.tickets && CFG.tickets[0] && CFG.tickets[0].id) || "solo";
  let selectedPayMethod = "mixx";
  let logoImg = null;
  let currentReceiptData = null; // { name: string, dataUrl: string }

  /* ---- Préchargement du logo Gbévoun pour les pass PNG ---- */
  const LOGO_DATA_URI = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBYRXhpZgAATU0AKgAAAAgAAgESAAMAAAABAAEAAIdpAAQAAAABAAAAJgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAA8KADAAQAAAABAAAA8AAAAAD/wAARCADwAPADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9sAQwACAgICAgIDAgIDBQMDAwUGBQUFBQYIBgYGBgYICggICAgICAoKCgoKCgoKDAwMDAwMDg4ODg4PDw8PDw8PDw8P/9sAQwECAgIEBAQHBAQHEAsJCxAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ/90ABAAP/9oADAMBAAIRAxEAPwD93KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigApr/dP0NOpr/dP0ND2YPZn//Q/dyiiigAooooAKKKKACiiua8ZeLtB8A+FdU8Z+J52ttK0eBri4dI3lcIvZY4wzuxJAVVBJJAFAHS0V8S/CD9v74A/GL4jf8ACqNPbVfDXieYkWlprtkbFrs4yFiyzYdl5VH2lu2TxX2pBc291EJ7WVJ4iSA8bB1JU4IBXI4IwfegCaivDfFP7Qnwu0bxHf8Aw10fxTo1/wDESKCQ2egS6hFbz3F0Iy0VuzMSI2c4GDyAc4r8cf2qv+Cgn7TfhmBvgL4z8Mx/B/xfdXkDXmtWNw12iaTKceZbEKzZJzudGJwpVQrHgA/oA6UV+dH7C/7SPw88caHrHwx0Xxp4j8dN4TIlfxL4jtUtIbhbh1jSGOYuzE7z+7WX94Qe+MD6a+L/AO1F8BPgLfwaR8V/GFroWo3Vu11FaOsktw8KkjcI4lYgMVIXONxGBQB77RXwF4D/AG6bfxq3w/1q58EXejeGfif4ludA0G6ubhTc3EUMWY71rcL8sby5jI3HHUE19+0AFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFNf7p+hp1Nf7p+hoezB7M//R/dyiiigAooooAKK/Mv8Ab+/bt1r9lq70b4d+BNGgvPFXiaza6S/vmP2SwiMphRzGB+9csrHBYKoGTnpXhOjftY/Fr9mP9orwd8Pvj58WNH+J3g3x5Zw3FzqFrDBANGmuWKo+6DgQhgM7uDGdwC45APQfjT+29r/wA/bY1nwD8XL650X4Y3nh6GPSp7e0W4EN5OquNQZQu+XbIHiZQSBgZXqa/KDxX/wUW/as0e81zwn4U+LVx4g0X7a5tNYfTbe1vJYEb5WRWjLRK45KHJHYgVj/ALfHgH4l/Dr4pXOn+JvGCeMfCWuX+oa1oFxHfJeBYr6RXlXaGd4iMquOEfG5O+PgugD7C/aW/a21z9o5fhx4i1XTf7L8a+DdOa0v9agkCT6jOJA0U4ESp5RTbkAE4ZmxgYFfqV/wTr+PWi/s8/sX+Ivif8Yb68bwuni02disUbXMqyXEMRkCrkYUybnPPUMeSef5869eX45fEVfgpJ+z8L5P+ENk1Yaybfyl837UqbOJfvbO+3+9zQB3H7V+keBPD/x41/UPhZ40j8baFrc39s22ows3mRvfO0zQysQD5sTHk8HGM4bIHmHxK+LnxH+MGpafrHxK12fX73SrKLTraa42l0toM7EJUDceSSzZZjySa84ooA+gvE/7SHxO8W/Dbw78FLa7i0LwXoUcCR6bYKLeG4uo2LG8un+/JM0h3FmbC8bQMV9zf8FNfil8Mtc1bwr8P7HS9P8AEnjfRtD0kX/i6zvzLIWWN/Ms3jjzE/JD7ixZd1fkvS5JoA/Qv9jr4/wXfx8+EkP7QfjIWPgX4WwXraR9qULb2cnlM0Snyk3MWk2gM248AZxX9Wui6zpXiPR7HxDoN3Hf6bqcEdzbXELbo5oZVDo6nuGUgiv4StPt7e7vYLW7nFrBNIiSTFSwiRiAzlV5IUc4HJr+xj9nH4ufs22/gnwd8Fvhj8TNG8S3mg6Xa2FvFHdxi6uRBEAWEJIbc2CSgyR07UAfWFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFNf7p+hp1Nf7p+hoezB7M//0v3cooooAK/O39tr9v7w7+ybe6J4V0TSofFXivUWFxdWTXBhSzsezyMoYiSU8RqR0BY8YB+uPjL8c/hh+z/4Vg8a/FjV/wCxtIubuKyjlEMk7NPKGZVCRKzcKrMTjAAr+fj/AIKe/BCa68eR/tB/C3w7c6x4L8T2keo6h4lt7ttQtZbiYhFUqM/Zo0QIFzwd2MjAAALvxW/a6+BP7dPh3xLoHxs0WD4a+IvDllc3vhHXI5ZLrcyDc2n3YCDd5+BtwMBvu4YfN+QLHNJkj2pKAFJJxk5wMfhSUUUAFFFFABRRRQAUUUUAW7A2QvYDqQka0EiGYRECQx7hvCE8btucZ4zX7e+Lf2G9K8eeJvgd46/Yr8H6j4d8Papa2mtX/iHUNQG2BfNR4y0UkjTC4jCsW8tdjllC8ZI/F/wRrOieHfGOia/4l0dfEGk6deQXF1pzyGJLyGJwzws4BKhwNpODwa/Uf9nj9tP4W2Pxk8c/tN/Hi81OLX9Mt1tvB/hjSzJ9gitpI3iNsgGIkWGMIi78Lyz4LAAAH9MgBAAJ3EAZPTJ9fxpa+K/2Kv2rPEv7WPhHXfF+r+BJvCNhp12ILK5Mxnt75GDbhG7IhLwkASEArkjBzkD7UoAKKKKACiiigAooooAKKKKACiiigApr/dP0NOpr/cP0ND2YPZn/0/3cooooA/LT/gq98R7/AMFfAmw8OyeB7bxXoviqee2ur26EhTSZ40BtZ42jwUmLMxRiQDtK87iK/mPTxFr8WltokWpXSac/3rYTOIGOc8xg7Dzz0r+jL9vbwJ+074z1TxT/AMJR8VfD/wANfgUbeC3gS9lYfb5XQM0U0ccLzPKZFOADgKBtBOa/m6uI0imkijkEyoxUOudrAHAIyAcHqMgGgCGiiigAooooAKKKKACiiigAooqWCCe5lWC2jaWR+AqAsxPsByaAIqcDittfC/iZ/uaReN9LeQ/+y1ai8EeM5z+50DUJP920mP8AJKAP0l/ZF8W/tVftHxw/Bn4efGgfD2LwDo3maPpsI+zG+ETElALcKZCCcyO5cjIO05Jr98v2RPGvxZ8f/AHwz4k+NulSaT4ukWeG6WWE28k6wStHHO0JClDKqhiMAH7wABAr8Uv+CVUvgPwF8X47Xx34F1+LxxrZltNJ1mS2kGm2kLx5eJ0KqUkl2sPNO4Ywo25JP9IhJJyeTQAlFFFABRRRQAUUUUAFFFFABRRRQAVHKcRPj0P8qkqG4JWCQ/7LfyoezB7M/9T9p/H/AMRfBnwt8ON4t8e6nHpGkpPb2xnkDMPOupVhiXCgn5nYDOMAZJwAa/Dr/gqD+1l450r4j6V4I+BXjnVNNtfCkZXXzpJkggi1CVg0KSXceN7eXx5edoPq2QP2o+Nngzwp4/8AhT4n8L+NfDkvizSbmyleTS4OLi6eEeZGkDZUrMXUeWwIw2K/CLwp+0h+xTB8LPEf7K/xl+F/iX4ZaSdQW+uwlw95qNxdwsHQ3crRxzLIAAADGybemOtAHxj8ZP25fid8fvgnpPwj+LGnWOt3+iXyXdtr53x3+ERkKyIhETsyttZ9oJHbPNfFFdh8QG8Ev421xvhtHeReFTdy/wBmLqBVrsWu7935xT5d+OuK4+gAooooAKKKKACiiigAooooAK+z/wDgnkqv+2h8LEcAqdRmyCMj/j0m7V8YV9of8E78H9tL4WZ/6CE//pJPQB/YKkfeOMceiio7q7h0+2lvL2Zba3t0aSSR2CIiKMszMcAADkk8AV+RH/BX7S5tG+D/AIY+JuharqOla5Z6vFpYezvZ7eKS1uIppWWSKNgrMHjUq2MgZGcVf/YN8A6D4r/YL13WvE0Gs+Jr3x9barbatHFeTT313FbyTQRQ2gmcpE+w4XGAWOWzQB+p3h/xj4a8W6EniXwvrVprGjShyt5aXCT2zCMkPiRCV+XBzzx3qv4S8ZeE/Huhw+JfBOsWmu6TOzrHdWUyTws0Z2uA6EjKkYI7V+PnhDwj4e/Zc/ZiH7LnjrxZqeieO/ine3F++kaDbHWtYtNLmwJYI0gKqrtbxFXm+7uL7VbGa0/iR+2d8CP2af2RNG0/9j61a9/tMzafp0ht5dmm3QGZ59QaVR/pZzuWN+XOGxsWgD9lgCxwvJpOhwa/D742/H3wh8c/2PPA+meIfjBqHwx8VW0Vhc6hdX+n39sdZnjtv34hMKI06B2Dh4soWx6gj72039p/4K/Bv4WfDTTPGfjW68Satr+i6e9h5VncXmr6rGYF/wBKazhWSYeZgsSwznIySDQB9l0V8WWf/BQz9kO80/UNUXx5HDa6WkBuGltLmMrJceZshCmPcZf3bbkAyMc1sSft1fsxRf8ACIxSeLGF345Fs2k232O58+ZLyXyYXZfL+RWfjLEY70AfXdFfK3jf9tT9nD4e+ML/AMEeJfFBW+0aSOHU5re0uLmy02WY7US8uokaKFieMMwweDzXxt8WP+Cj+maX+1f4M+EXg+eS38D6dds3iHVEtJLmS/V4HKRWkao7tArbW82NSZDyp2DLAH65UV+Lq/8ABSx/Ef7YVj4UtbHV9O+GegW19DLbwaZcXGpandNF+6nltEjM6Rq2DGu0EA7n64H3Hrn7dv7Mfh7xHd+Hb/xRKy6bcQ2l/qEFlczaZY3M+QkNzeohhiclSCC3BBB6GgD6/pjyRxSJDI6pJJkqpIDMB1wOpxXmfxO+M/wv+Dfg4ePfiT4itdG0OTaIZ3bebhpBuRYEj3NKzLyAgPHPTmvwu/Z+8VeHda/4KoWb+A9f1jWfCtzHqE1n/bEt000RuNMeWWPZd4kRVkLBQR93HbmgD+iCq92cWsx9I3/9BNfLUn7bn7MUXitvCUnjWIOl7/ZrX/kTnSlviM/ZjqAT7N5uP4d9fUl4QbOYjkGN/wD0E0PZg9mf/9X91rlUe2lSSQwoyMC4baUBGCwY9COue3Wv5L/2x/2P/i18LvHvjLxhY2uu+LPA2ltbTS+KdTVXE5u1TB84O3mhWYR7x3HIXgV/S1+1JpfhfW/2evHmjeNdYu9A0S+0ySG61CxgluZ7ZGKgSCGEM7qDjeAOU3ZIGTX8gPi7xh45stJvPhrp/jbUvEPgTT7txbIst3Fpk21vllS2nxs3HkKygg0AeS0UUUAFFFFABRRRQAUUUdaACitbRdB1zxJdtYeHtPuNUukikmaK1ieaQRRLukcqgJ2qoyxxgDrW3/wrzx3/AGJp/iQeHtQOl6rcvaWlyLWUw3FwmN0Ub7cM43D5RzzQBx1faP8AwTv/AOT0fhZ/2EZv/SSevkTUtA1zRdSvdH1jTrixv9NYrdW80TxywMpwRKjAFMEgc4r66/4J3/8AJ6Pwswf+YjN/6STUAftD/wAFjT/xi9og9fE9n/6TXNVP2MvjR4a+AH/BNHTvil4mkjMejnWHtrZ5BG15dG7lENuhPO6R8DgHAycYFfZv7RH7I/wu/agm0n/haV7rTWWjK3k2Vjfm2tGkc/66SLawaUAlQ/UKcV4BD/wSo/ZGS3gs57PXbq1t3Lxwy6vKYlY9SECgDPfHWgD8xPil421y1/4KU6d408f+Kbn4ZR69Y6W8OrWwim/s63vtLjChTco0ZiErNG7leMk8c1J+1n8Gfg98G/2XNf0f4NeP7n4gQXnjXTJtVmPlSW9teGxu2CpLbqIi7KwLgElRtzjIr9K/23/En7A2lPo3hD9qS1N3remWaSabDZQXJ1BLRsqqiaAKvlsVPyu+MjOB1qf9mW//AGT/ANr/AOAfiX4S+CPh3Jo/w58O38Vr9iutsUkszKJluleKRpBLkcuzlz344oA+K/22Nf8ADWu/8E1vg1a6TqNrqF5pY8PLOkMqSy2/mafMuHCklCxRhg4ztPpXjP7H/iy10H9vX4ean8TryOytW8JabbabPeOI4kR9EhFuFZ8KoOHAOfvE9zX7D33/AATy/ZNv/B+meBH8ISQ6Lpc8t0kMN9cxma4mCq01wyvmVwqhULfcXIXAJqn4z/YX/ZDtvAumr4s8FT6hpPgSCee32TXdze/ZVZpnt/3bGaePOdkXOM4TGcUAfgd4LNpffCj9ruW3K3ETPpc8TrhlKjW3wyn0IbgjtXfePdf0m/8ADH7Etromo20+o6XBtnSOVGe2lOrReWJgDlMkH72Ohr3r/gn58OYIPi/8Ufh78Vfhxrln4L+J9rJY2UV5o93DZeTHcvPHHLLsAgxHjYxYYYAA5xX6fWH/AATl/Y7sbLS7D/hAIriLSZJpU865uGaV59uTO4cNJt2AICcKM4HJNAH4p/sj+D9G+Ld78bPgp8Wvio3w6XXbqO91OC4htD/aT2NzK0pa4uirI8MhDFUbLAknOK7nwbp/g/4ef8FG/gxpuk+JTq/hjS9K0uKy1i+AtvtFr/ZsqwyMHwFBGFXPUYr9lPFv7Bn7KHjbxtb+P/EPgG1l1WDytyxySxW05hUKhngRgkhCqASR82PmzXS/Fz9jz9nX45+JtI8X/EzwjFqep6LFHbwukslur28RLJDKkTKskaknaD0BI6cUAfjfp3iez07/AIKk/E3X9O1e2tPt2ma62nXjTokLyy6Put2SUkKQzAFSDz2rxL9iTwX4F+NXwx+I/wAHvid8Xn+H2nXF3bateWMsdkq36W4OZvtFzhw0Lr8yK3Qg4OTX75eM/wBi79mf4geP9M+JfirwPaXWt6VHbxRbWeK2dLRQkAlt0IjkEaqqqCMbQAcgYrI8TfsI/sp+L/iKfilr/gK1n1ySUXEwWSSO0nmBz5ktsjCJiTyeMN/EDzQB+Rn7eSWHgvV/2UtIOs3HiD4baJpllJBf3kZT7ZHFcwebLIhAwzWyx8EfdNY37RHiFNU/4KPeLtb+GOp299cXfha9Flc2UqSK87eHZFAjdCQX7ADnOB1r95/jN8BvhT8f/CMfgj4qaFHq2mQSCW32sYZraRRtDQSphkOOCBwRwQa8d8N/sD/sl+FPEGk+J9H+H9quoaHFBHZvJLM6xtbuZEmKF9rzFjlncEnj0oA/EX9kX4ZfDz9oL9mjxH8M/iT8Z08B6L4b1ptauNJltbLLH7OFW8WeZ0mcY3IyKSAQOORX9IvgixttO+G+gabZ6hLq9tbaTaxRXsylJbmNIFCTOp5VnADEHoTXzZJ+wB+yZL8S2+K0ngWA6w1x9rMHmyCwNxnd5v2QHy87vm2425/hr7Duf+PaX/cb/wBBND2YPZn/1vv/APbX/bC8MfsueBrmyDufG2v6ddyaDE9s81q08RSMmZx8oCmTdtP3sYOAa/Pb47ftVfD3Xv8Agm7pdjYeItE1z4g+LYLSx1S2WC0ivIZ2kL3kjWkKL5ZQLtWTaBghgcnNfaf/AAUp8S/ADwz8F9Lf4+eD7zxZaajqP2XTjpzpb3lncGNnaaO5cER/KuCpBD9CpAr+U/VzpTapdvoaypp7TSG2W4ZHnWHcdgkZAFLhcbiAAT0FAGeR3pKKKACiiigAooooA1NE0XVfEmsWXh/QrWS+1LUpo7e2t4lLSSyysFRFA5JJIFf0G/s1/wDBIPwpoNvJrn7S14mv6iZIJLbTdLuJI7WJF+Z1uZCitKWOFKrtAAOGOePmb/gkJ8SPhD4b+KGseAfGOkwf8Jj4oMJ0HVJYlkKG3WRpbVGIJiaQfMGXG7G0npX9JlAHCeGPhd8M/BN7JqXg3wlpOhXksK27zWNlDbStCgAWMvGoYqMDgntXZLZWawxW6wRiKBg0aBFCow5BUYwCPUVZooA5a88DeCNRm1K41Dw7p1zNrMXkXzy2kLvdxYxsnYqTIuOzEivxz+LvgjwX4E/4Kp/AfSfA+g2Ph+yk0tZHgsLeO2iZwt8u4pGFBbaoGeuAK/bWvxz/AGiBn/grN8BQP+gQv8r+gD9hLy8tNPtZb6/njtraEFpJZXEcaKOpZmIAHuTXNaH4+8B+J5Xh8NeJdM1eSL762d7BcFfqI3Yj8a/mY/bT/aE8cftN/tUN8Fl1efTfBOm+IIvDtpZQOyxPJ9pW2lu5lGBJIz5K7shVAA7k7n/BTX9ln4afswa38PtQ+D1tPpFprtndW11GZ5JC09iYwJtzHIaRZPnAwMjIAyaAPuz/AIK0+IfhJ4p+A0unaXqWk6n428Oavp8kkcEkM1/aWs/mxsHKEuiM2MqTjODjpXnn/BHnxh4X8E/Bz4pa74y1iz0LSrfWLHfdX06W8Ks1uwALyELk44Gcmvg+z+C3gfTP+CdWu/H3S7u7uPEXiDXbHSL2GfZ5Fv8AZLiRyYSoDHzQUJ3HgjHvVz9if9i+b9rnwB4+VvGN1oP/AAjckDWVikfm2txfTROUknBcAABdmQNwBPPGCAf1D+D/AB54I+IWmHWvAfiCw8RWCtsM+n3MdzGrf3WaNjg+xwav+I/FHhrwdpUuv+LdWtNE02DiS6vZ0t4Uz0BkkKqCewzmv5DP2P8A41eN/wBmr9o/QTbXMtrYXWqRaTrtgHPlTwSTeRIHT7paIksjYyCOOCa+gv2zfjrF+0P+2hB8PfGXiA6b8LvDGvQaMVaUpaQwwzCK+vHA43sRJ8/UIABQB/R74O+Ofwb+IbXMfgTx3o3iB7NGknSz1CGZ440GWdlDZCgDJbGB61SP7QfwDUZPxL8Mgf8AYYs//jlfzXft5an+z34Q+MPhPxh+xzq+m2VudLKXg0CTbDBcxSMgztxzLC21x0cA7s5NfLvx/wDBmlaTeeE/iB4Z0tdJ0D4haJb6tBbxj9zBdqWt76GLPREuY2ZV/hR1FAH9fl98dfglpmmWOtaj8QNAttP1MSm0uJNTtlhuBC2yTynL4fY3yttzg8GrD/Gr4PJ4Rbx+3jfRR4ZSVoDqf2+D7H5qctGJd20uMj5Qc+1fjD8f/CPwP+KH7CHwJtvht4Vs7PxH4r1DT9H0IQbjJZ3Vw5/tTJzl1aVGMm7qSG4r87NHtfD3xu/aj8F/A/QoWsfhxa+IINKsNPSRihtUlCXFy/PNxdhC8snXkAfKqgAH9WPgD40/CH4qtPH8NfGek+J5LUbpY7C8inkjXpuZFO4DPfGK5Hxj+1N+zh4AbyvF3xJ0KxmBC+SL6KabJOMeVCXf9K/n1/b88G2P7H/7XGi+KvgFCvhCK50201O3t7LdHBFMjvBNHtB5ilEYLoeG3MDwa+PP2lrLwDbfF6PWfhhpg0bw/r+naRq8NkrtIltLfWsU08Ss5LbVmLgAnge1AH9bvj/9pH4BfC3evxA+IGjaLPGoY28t3GbnBG4fuELS5IOQNtWL/wDaD+CekeANK+KOueM9N0nwxrlst3Y3d5Otv9ohcZUxxviRiR/CFJ9q/n8/4K2fDLwf4P8AiR4D8a+HNPWy1Hxro5udUdWYi4uIPLjWQqSQrbCAduAcDvXz1+1P8M9E8P8AwQ/Z6+KGn3F1Lf8AjLw20N5HNMZII203y4Y/IU/6sFT8yg4JGeCTkA/pj1v9rL9nLw14G0H4keIfHmn6doHihGk0yaZmWS6RGKM0cO0ylVZSGJXAPWvWfDfjTwn8QPCcXi7wNq9trujX8Lvb3dpIJYZAAc4YdCDwQcEHggV/Kr4q/Zg1e7/Yc8OftYav4yn1CW3ul0m10eSLMNpp/wBplhVY5S2Q3mhnKhQPmPfmv0o/4Iz61qNx8GviboVxOz2Wn6nDNBGSSsbXFqwk2jtu8tSfpR0YPZn/1/238W+DPCPj3RZfDnjfRbPX9KmKs9rfQJcQsy9DskBGR2PUV/Of/wAFFPgh+0B45+P13ovgX4W3P/CEeE9NiXR20TSwLU2hjWSaR5IEAL+buGwnKhRgc5P9J11dW1lbTXt7Mlvb26NJJJIwRERBlmZjgAAckngV/Mv+2d/wUS+OPiP4i+NPht8MvGFrZeA4bh7K1udEVd93a7QCxuzl8vkhvLKjsMjkgH5NkEHB4NJSkknJ60lABRRRQAVcsI7KS8hTUpXgtS6iV40EjqmeSqFlDHHQFh9RVOvc/wBnv9nn4i/tL/EKD4d/Di3ja68s3F1c3DFLa0tkIDSzMATjJAAALMSABQB+in7Lv7Wv7A37M3kapoPw88T6l4pCbJddv0s5rkEjD+QgnCQKcnhBuI4LGv0e8N/8FZ/2P9edItR1HWNAdupvdOZkH1aBpf5V8q6J/wAETtL+wJ/wknxUmN4R8wtNNURBvYySliPrj8K8f+LP/BGv4qeGtKuNW+E/i2z8YSwAsLC5hNhdSADOI3LvEzHsGKZ9aAP2O0b9uT9kTXbf7TY/FfQkTuLm4Nq4/wCATqjfpXA+Mv8AgpL+xt4MDLL4+j1mVc/u9Ktp7snHYOEWP/x6v5IL6wvdLvrnTNRhe2u7OR4ZopAVeOSNirKwPIIIIIr3/wDZw/Zd+K37Ufi248L/AA0s4jHpyJLf311J5VrZxSEqrSNgsSxB2oiljg8YBNAH7n69/wAFmP2d7GUx6D4U8R6qAeHaO1tlPvhpmP6V8m+GP2ovDv7WH/BSb4LfEHwzot3oVtp0Lac0N48ckjPHDeSFwYyRtIkA9eK9Q8Nf8EULD7GreMfilJ9rI+ZdP04CNT6BppST9cD6V5L4P/Zc0f8AZN/4KSfBf4faJr1x4hg1CJtRM9xCkLq0kN3GU2oSCP3ec+9AHj37cPwG1H4P/tjxar8KNRt/EuteLNWTXLDRbLdPqVnevMLjypbdATteTLRHOWXqBjJ9/wD2lvCH7XH/AAUL8Z+C7HT/AIQ6j8PtK8N2zxTT64TbW63N0UNxMWkVXaNdgCKiM2M55OK+Sv2vvBnjTw/+274ouvhF4ifxX4m1XVptTsm0CWS41GyncljbuIQWSWDlcKSAoGccgZOtfHD/AIKMeBbZtX8TeIvHuj2lty897HeJAoH955E2Y+poA/T79sv4CaN+zh/wTOh+E+jXP29tK1bTZ7u7K7ftN5cTs00gXnC5O1R2UDPNct/wRMnA0D4qxMcBbrS3Pp9yYf0rwX4GfHz4pf8ABQDQb39jT40eIo47jWPJ1Kw18Witcg6a4llt5o4zGj74t2x8AqR827NfVem/8E1Pjz8FpfEOlfsw/GoaL4f8W2y2upQ6la4uWQAjIkhRxuAZgroqMASM0AfjdoHhe6+KH7ZUXh3wzH9o/t7xtKYfL5HkNqDSM+R/CsYLE+gzWT8b9Fl+FX7VXi/TvFNimox6H4ouJ5raddyXVsbozKrA9VliYfUNX9IH7HH/AAT88AfsqXEvjC81FvFfje7hMDahJEIoLSN/vpaxZZl39GdmLEcDAyDkftm/8E7vBX7VGqR+PtE1b/hE/HEUSQSXfleda3sUfCC4jBVt6j5VkU528EHAwAdF4X+Gn/BO3xH8NoPi1pHhbwYnhaW3Fy11PDbqIF27mSYSHckidGQjOeMdK+Pf+Cinws+G/wATf2NPBPxn+BOmQ2nhrwdMZ7OO1tTax/2VqL+XKywlVKqJlR+nIJbpXK/CH/gjNd2Pie21H42eNrbUNCtZBI+naPHKr3e05CyTzBfLU9G2oWxwGB5r9ovF/wAMvC3iz4V6v8IHtI7Pw/qeky6OsMSgJBbvD5KBF6DyxgqPagD+ev8A4JYaN4q+Lvxc0bQvEFy0/hD4R2mp6rYQsPkh1HWdluCT3PDOoPQqSK+P/gIl38Jv22vB9h4pja0uNB8YxWV0rjGx/tRgOc9st+Vf0h/sTfsdWf7Ifg3X9BOtr4l1TxDepcz3qWxtgIYY9kUIUs5+Ul2znqx4ry39rn/gnX8LP2hPE0nxP03xC/gHxk6p594io9rdNFgJLNEWRhKAAPMRwSAMgkZoA/N3/gs9fW0vx88H6fGQZ7bw8GkA6gSXU23P12mvgL9pbwPrXw28Z+GfC/iGJob+28L6BNKjDBUzWqylee67tp9wRX7deBP2HvhbB8Vrb4x/tRfHOx+J3iDTWtzBDdXVra27NagCEXHmTu8ipgYQbQT97OTn1v8Aa0/ZT/Zt/bE1nS/FR+JGnaB4p06EWn2uyvbK6S4tgxZY5YvNBLIWOxlYEA4IIxgA/NT/AIKt/Ez4ffEa7+Db+Btfs9ca18PvJcCzmWbyVuPKMYk2k7WO1vlPzDHIFebftXMl1+xH+ylexsGEdlrcBwc4KTx5Ffp5P/wSM/Z41jwP4b8LaZ4i1GOfS7ie6v8AVbf7PJd6kZ0RRGThkiij2ZRVDY3NkknNTa//AMEgfgLqtrYaRp/jHxTp2l2Cki1NzDcI07n55gJItqMwABCKBgCgD471xzL/AMEXdEIP3NdC/lqc3+New/8ABGNSPhb8Wn7fbrQf+SstfRq/8Euvhl/wq1fg3L8RvFsnhVdRGpi0+0W4iE4QpwnlbApJ3Hj73Neq/s6fsM/Dv9lPUtd174feKNfvotXsZILixvriJrN2AykpjjjTMiYIVieAxFTLYHsf/9D9r/HvgrQ/iR4J134f+JVkbSfEVlPYXQicxyeTcIUba46HB4Nfy3/tS/sTap4G+ON38Hf2d/C/iLxSnh/Q4dUv7idUnecSElpYRFHGNigrHtG5i4OB2r+r2qd7PDp9tcam8TSG2idz5a7pWVAW2qOpJxwPWgD+GTxX4B8c+BJLSLxv4e1Dw+9+jSW66hay2rSop2syCVVLAHgkVyVfq7/wUx+O3wH/AGktT8D+MPhTrWqal4lsrSa1v9OntZIo7O3VjKRIHwVnVyQ4Tcu0ZJGBn8oqACiiigA6V+/X/BE+00Eab8U78PGdbMumRlcjzBaBZWBHfaZDz2yBntX4C13Xw8+Jvj/4T+Io/Fnw31+88O6tGpQXFnKY2KN1Vh911P8AdYEUAf3NVy/jXxp4a+HXhPVfHPjC+j03RtEt3ubmeVgiqkYzgE9WY8KOpJAFfgF+yn8Rf+CmX7V2m6vfeA/ipb6bo+hSx21xfapBbLmaRSwSMR2rs7BRljgAZHPNcp+1x8N/iX8NfGnw00j9tX4233jXw34i1Bpb+x0tJQttY2xUSTLGRGhYs4UER7gNxXJAFAHvv7Cn7IHgf9odPHn7Tvx68NLqNp4+1LUG0bT7gMkccFxMzzXa4I+bexjibttZh1GND9iLTIP2Mf2v/iJ+zD46l+yWXjRYLjw3fXBCJepbvIbdAx4LyRyMuP8AnpGV6kV+w/ww1b4daz4B0S6+Et3ZXvhKG2ig09tPdXt0gjUKiLt+6VGAVbDDuM186/tWfs9fAr9pmHS/A/jvXoNB8bWBaTRLu2uoo9Ut3YhiEhZg0sZKglCOoypU80AfY314r8Wf2qLPUNR/4KkfBrT9JuPsl9deHpYreb/nlM8Woqj8f3WINbyfsl/8FKfBMa6b8Pv2i7fUdMtxshGomUzBB0DefBc/+hmvmHw/4P8A2ivBf/BSv4L6Z+0v4stvF/iaaFpre6tSCkdmYbwJGcQwjIcOfu9+tAHzL+y98T9X/YM/aqv774+eGr1JHgutLv3aMm6i86RG+2W5kx5ysU5Kt86McHPX9ePid/wVJ/ZgvfA2qaT4B/tDx9rur2k1tbaRHps6JNLOhRUmMyAbOfmChyRwBX6PeKvAvgnx1arY+NfD+n6/brwI7+0iulA9hKrY/CvhD9oL9jf9lbTrQfECPSNT+Gd/aghtf8HJLbmyUD/WXEFsGAj9XWLjqzAc0AfLH/BLv9ijx/8AD7xTcftFfFjS5NAuJbWa10fSriMx3Ki6x5lzLGeYhsGyNGAYhixAGM/t/KywRtNORFGnJZztUfUnivwX/wCGVv2mfHlmbz9nj9r1fG2kScwrLrl5DcbT2fyZJ8EdDnB9hXiXij/gmj/wUI8RzsviXxLba4rdZLnxDcTKfwmXP6UAfvf4w/aN+APgBX/4TH4i6BpbpnMcmowGXjt5aMzZ9sV8geOv+CrX7Ivg9pYNJ1bUfFdxHkBdMsXEZPp5twYlx7jNfl5o3/BHD9pq+kVta17w1pYY5Ym7nnYevCQcn8a+k/A//BFTSEKzfEr4mT3PTdDpFksQ/Ca4Zz/5DoAzPGX/AAWv5eL4f/C8AchZtU1Dn2Jigj/Tf+NfL+s/8FRf22PiVqEml+ARaaY83CW+iaT9qnAPTDS+e+fcYr9StR/YP/YK/Zq8HTfEL4g+H5NVsNOktopbvWLuW5G+5mSCP9yjRxH5nBI2nAye1fekFn8Jvgp4Ql1XTrLSvCPh7T4wxe0t47eIJ/DtEK5ct/CFBZj0yaAP509I+H//AAVe+PEglu73xfZWtwMmTUL5tFgCnuELQnH+6hr1nRv+CR/7TfjhFuPip8TrKzYkblM15q0g/F/LXP41+jfjX45/tTfEi3muPgH4MsvAPhZck+LPHr/Yg6Z/1lvp5zIqnqrTAZHO0V+e2rRX/wAYPGK+Adc/aL8afGXxXcORJpfw+tUs9KtxnnzbyV47VY1xy+3AHfPFAHpWkf8ABErwjEit4i+KGoXD9xa6XHEM/WSVz+ldlF/wRe+BaIPM8beIi46kC0Ufl5Rr0nwv/wAE1fhzYpbywfE3xtonieOFJ5ktdfR57dnJwSUiXcMgjdgKSDjNeu6JH8ef2bfG/g3w34w8cP8AFTwB4y1OPQ4JNRt0h17TL2aKSWKQyxfJdQYibzCwDIPm6A0AfMlv/wAEk7TwyPO+Gnxu8T+GrleUZFGAe2fIlhNdXpfwg/4KWfAZ0uPBPxK0n4yaNActpuvB4Ll0X+GOaUllY9AfPxnqD0r9WqOtAHxb8Lv2xtP1jVYPBXx98Iaj8HPF0rCOKLWVI0u8kPAFpqO1YWZj0RiCf4S1fY9+M2Nz/wBcpP8A0E1X1nRNG8R6XNoniGwt9U064BWS2uokmhcHsyOCp/KqOm6Bpnhnw5/YOixNBY2kLpDEXdxGm04RS5YhR0UZwBwOOKHswezP/9H93KKKKAPyy/bD/ZX/AGjfijaeKY/gy3hHRLHXXijmisbAWOs6nBI4EyXuoudoRRlmEePNA2kc4r8uv23v2XvgT+yZ8J/AvgS1lu9Z+Lusn7dqGoCZltFtEBSRVgPARpSFi/iIRmY84r+pKviH9p79hj4d/tR/EHwZ4/8AFuqXGnzeF9sNzbxRJLHqNmsvnCByxBT5iw3DPysRjoQAfyE0V+hH/BRn4D/Bz4E/GqXS/hT4gS6k1hp7290KKJRHoYkYGKASox4fLFYyoZEC5zkV+e9ABRRRQB+wX/BPz9uj4Wfsu/Azxz4d8dwXN5rB1OO/0uytY/nvjNCI3Uyn5IxGYwWZuzfKGPFfDv7WH7UPir9q74mj4heJbGLR7aztUsbCwgdpEt7dGZ+XbG53ZizNgA8AAAV8v1678HvEHjOy8RweGPh1oOn6x4l8R3EFnYtd2MN9cJNI21Vt1uQ0UbOxGXKbhjhgM0Afqr/wT3/Zu8QfGD4c6v44+GfjzxZ8Hru2ulsLmSxmE+naopjDPJCrCJldOjZLhSRg9QP0z+FP/BOv9nn4ZeJ7P4g6lFqXjXxlZ3CXi6xrd7JNN9rRtwlEabI8huRuDYPevhnw58Ov+CvfwV0yJ/D+q2Hi22u1Cf2fJc2l2tkW6FUnWFY9p7RMU9QRWxa/Cz/gr54M1BPiavjWy8T3ZYTXHh976KWFkzkxeQ8cduBjj91IpH8JzigD9vTzya/HL9oMf8bavgRjr/Y6/wDoGoV+l/wR8f8Ajb4i+BbXW/iN4JvfAPiOMmK8027KyJ5ij/WW8qkiSJuoJwR0I4yfzS/aBGf+CtfwK/7Aw/8AQNQoA/Yuj2oooA+JvjR/wT9/Zt+NGpy+JbnRpfCXiOYln1Tw/ILGd2PeSMAxOfUlNx/vV8s3X/BOz9pTwVMT8Ff2mNcsLRfuW+otc5HoC8UzKf8Av3X6/wBFAH5E6d+yX/wUeEgivf2m1ii6b1S4nfH0eNcn/gVe/wDgH9kP40WV7Zan8WP2j/F/iVrSVJTaadIum20rIQQsh/eOyHGCOMivveigD+Zz/gqpq3x/8I/Ee2+Gnjr4iSeKPBOtxjWdMsBDDam3CO8QSeOCNA7RncEck7hzgEV95/8ABL6T47/Ez4Xf8LC+JfxHn1nwtZM+k6NpHlW0slu9moj86Wd4TIrRqV8pQx4+ZsjAr9GdW+B3wq8QfERvir4k8O2us+JhZJp8NzfILlbe2QudkMcgZE3GRt7BdzZwTjirvw3+EPw8+EMWsWfw30iPQbDXL06hPZ25K2q3LoqO8UX3Yg4RcqmFyM4FAHz141/YT+DXxQ19fEHxX1XxN43ZG3ra6rrUz2a85wsEAhVR7LgV9L+Afhp8PvhZoa+Gvhx4esfDmmKcmCxhWFWYfxOVGXb3Yk13FFAHOW/hDwvaeKrvxxbaXbxeIL+1isbi+VALiW1gYvHEz9SisxIHqau3GhaPd6vZ69d2kc2oaekiW0zjc0Il4k8vPClgMEjkjjOOK1qKACiiigAqC55tph/sN/I1PUU/+okHqrfyo6MHsz//0v3cooooAKZKrPE6RuY2ZSAwwSpI4IzxkdafRQB/O9+2f+yP8FvhPaeFPhb4O0/V/HHxu+K+pk22s6jfMoUtOolkljXbEd7PtAIOBuctwAfyW8efDDXPA/xU1n4RrJHrOsaPqbaSWsg5Se7STyisQcKxy/yjIGa/tA8d/B74afEzV/Dev+OdBg1XUvCF4t/pVy5dZbW4Uq25WRlJBKqSrZUkAkcV8q/tNfsP+Hfi/wCIND+Kfwrl07wN8S9B1aLVRqxslmS+kjKkC7VcFypQMrc85BznIAP5Yvir8LvGHwY8dal8OPHtvHaa7pIh+0wxSrMsZmiWVVLoSMhXGR2PFeeV/ZD4f/Y1+C6+O7b4yfELQ7Txd8R5LaFdQ1W5i2291dpGEa5WxyYEcgYBC8AD+LJP5y/tH/8ABIbwjb+F/Fnjv4F6zqUuuxLJe2eg3Aikgkw2+S3ikAVwdufKBzyApJzmgD+fitLR9Y1Tw/q1lr2iXUljqOnTJcW88TFZIpomDI6kdCpAIqlPBPazSW1zG0M0TFHRwVZWU4KsDyCDwQelRUAfs18Nf+CxnxzstPttE8X+BdO8aajGoX7TbPNZ3E20feeOJZELepVFHtX3F8E/2p/22P2mtctrTwr8LLD4ceFd6/bde1dbmcxxZ+YWsUwhE0pH3RsZQeWIHXxP/girpvhKTwb8RtWFtA/ieDUbSJpiqmeOxeEmNVY/MqNIJM44JHPQV+4pJJyTk+9AEcalEVGYuVABYgAkgck44yevFfjz8fF3/wDBWz4F+2i5/JNQr9ia/Hr47DP/AAVu+CHtoZ/9F6hQB+wtFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABUc3+qf6H+VSU2T7jD1BoezB7M//0/3cooooAKKKKACiiigAoBxyKKKAPw3/AOCjX/BO288U3Wo/H/4Cab5mpvvuNd0S2T57lvvPd2qDrIeTLGOW+8vzZB/n3likgkeGZDHJGSrKwwykHBBB5BB6iv70QSDkcV+c/wC1f/wTf+EH7Rr3fi7w9t8GeOp/nfULaPdbXjgYH2u3GASeMyJh/Xd0oA/nM/Zp/ab+JH7LXjtvG/w9khlW7i+z31jdBmtryDO4LIFIIZW5RlIKn1BIP6owf8FtdWWxC3Xwlt3vAOWTVnWIn1wbcsB+Nfnt8a/2Af2n/gdLPca74Ul13SIskalooa+tivq4QebH/wADQD3r40nt57SV7e7jaCVOGSRSjA+4ODQB/XJ+yr8U/wBqD9oSzsvip8RdD0z4eeBLlPN0/TYY5LjU9SVvuyySzkCG37qRGHk4IKryfmr44hj/AMFbfgjntoDf+i9Qrvv+Ce/7c/gf42+B9D+EXi67i0f4haBZxWawyERw6nBbKI45LYk4MgRV8yLrnLKCOnD/ABvQ/wDD2r4IN6+H5P0j1CgD9eKKKKACiiigAooooAKKKKACiiigAooooAKKKKACmv8AdP0NOpr/AHT9DQ9mD2Z//9T93KKKKACiiigAooooAKKKKACiiigBQSDlTg+1cT4l+Gvw58ZqV8X+FdK1vdnJvLGCcnPXl0JrtaKAPnaP9kb9l2G9TUYPhV4chuonEiSR6dCjK6nIZSqjBB5BHSvjz4weG5rj/gqf8DtUVSIV8MX7g9v9GW9BH4bxX6mV5Vrvwp0bXfi/4S+ME7BdS8J6fqenxLtzvTUvKyc9tnlnH+8aAPVaKKKACiiigAooooAKKKKACiiigAooooAKKKKACmv90/Q06mv90/Q0PZg9mf/V/dyiiigAooooAKKQkDrSb0/vAfjQA6iovOi7uo+pFNNzbDrMnH+0v+NAE9FVvtlp/wA94/8Avtf8aPtlp/z3j/77X/GgCzRVcXdoek8f/fa/40v2m37Sof8AgQ/xoAnoqLz4ezqfowpRLGejD8xQBJRTfMT+8Pzp1ABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABTX+6foadTX+6foaHswezP/9k=";

  function preloadLogo() {
    const img = new Image();
    img.onload = function () {
      logoImg = img;
    };
    img.onerror = function () {
      const fallback = new Image();
      fallback.onload = function () {
        logoImg = fallback;
      };
      fallback.src = "logo-gbevoun.jpeg";
    };
    img.src = LOGO_DATA_URI;
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

  function loadPendingOrders() {
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function savePendingOrders(orders) {
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify(orders));
    } catch (e) {
      console.warn("Erreur stockage commandes en attente", e);
    }
  }

  // Envoi de la commande et du reçu vers Supabase Cloud
  function syncOrderToCloud(pendingItem) {
    const sb = getSupabase();
    if (!sb) return;
    const record = {
      order_id: pendingItem.id,
      ticket_id: pendingItem.ticketId,
      ticket_name: pendingItem.ticketName,
      name1: pendingItem.name1,
      name2: pendingItem.name2 || null,
      phone: pendingItem.phone || null,
      pay_method: pendingItem.payMethodLabel,
      receipt_data: pendingItem.receiptData || null,
      receipt_name: pendingItem.receiptName || null,
      status: "pending",
      created_at: pendingItem.createdAt || new Date().toISOString()
    };
    sb.from("orders").insert([record]).then(function (res) {
      if (res.error) {
        console.warn("Supabase insert error (table orders):", res.error);
      } else {
        console.log("Commande synchronisée sur Supabase Cloud !");
      }
    }).catch(function (err) {
      console.warn("Erreur envoi Cloud:", err);
    });
  }

  // Chargement en direct depuis Supabase Cloud pour l'administrateur
  function fetchCloudOrders(callback) {
    const sb = getSupabase();
    if (!sb) {
      if (typeof callback === "function") callback(loadPendingOrders());
      return;
    }
    sb.from("orders").select("*").order("created_at", { ascending: false }).limit(60).then(function (res) {
      if (res.data && Array.isArray(res.data)) {
        const mapped = res.data.map(function (row) {
          return {
            id: row.order_id || ("ORD-" + row.id),
            dbId: row.id,
            ticketId: row.ticket_id,
            ticketName: row.ticket_name,
            name1: row.name1,
            name2: row.name2 || "",
            phone: row.phone || "",
            payMethodLabel: row.pay_method,
            receiptData: row.receipt_data,
            receiptName: row.receipt_name,
            createdAt: row.created_at
          };
        });
        savePendingOrders(mapped);
        if (typeof callback === "function") callback(mapped);
      } else {
        if (typeof callback === "function") callback(loadPendingOrders());
      }
    }).catch(function () {
      if (typeof callback === "function") callback(loadPendingOrders());
    });
  }

  // Compression automatique de la capture d écran pour un stockage optimal
  function compressImageFile(file, maxWidth, maxHeight, quality, callback) {
    const reader = new FileReader();
    reader.onload = function (evt) {
      const img = new Image();
      img.onload = function () {
        let w = img.width;
        let h = img.height;
        if (w > maxWidth || h > maxHeight) {
          const ratio = Math.min(maxWidth / w, maxHeight / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality || 0.82);
        callback(null, compressedDataUrl);
      };
      img.onerror = function () {
        callback(new Error("Image illisible"));
      };
      img.src = evt.target.result;
    };
    reader.onerror = function (err) {
      callback(err);
    };
    reader.readAsDataURL(file);
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

    const prevSelectVal = (select && select.value) || selectedTicketId;
    const prevAdmSelectVal = (admSelect && admSelect.value) || "solo";

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

    if (select && prevSelectVal) {
      select.value = prevSelectVal;
      if (!select.value && select.options.length > 0) {
        select.selectedIndex = 0;
      }
      selectedTicketId = select.value;
    }
    if (admSelect && prevAdmSelectVal) {
      admSelect.value = prevAdmSelectVal;
      const admFieldName2 = document.getElementById("adm-field-name-2");
      if (admFieldName2) {
        const curTicket = getTicketById(admSelect.value);
        if (curTicket.persons > 1) admFieldName2.classList.remove("hidden");
        else admFieldName2.classList.add("hidden");
      }
    }

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
  function buildFullUssdCode(methodKey, amount) {
    const payments = CFG.payments || {};
    const p = payments[methodKey] || payments.mixx || {};
    const num = String(p.number || "93895722").replace(/\s+/g, "");
    const amt = String(amount || 3000).replace(/\s+/g, "");
    if (methodKey === "flooz") {
      // Flooz Moov Money Togo syntaxe exacte : *155*1*1*NUMERO*MONTANT#
      return "*155*1*1*" + num + "*" + amt + "#";
    }
    // Mixx by Yas (TMoney Togocom) syntaxe exacte : *145*1*MONTANT*NUMERO#
    return "*145*1*" + amt + "*" + num + "#";
  }

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
    const simpleUssd = pay.ussd || (selectedPayMethod === "flooz" ? "*155#" : "*145#");

    if (elNet) elNet.textContent = pay.label;
    if (elNum) elNum.textContent = pay.number;
    if (elAmt) elAmt.textContent = formatPrice(ticket.price) + " " + (CFG.currency || "FCFA");
    if (elUssd) elUssd.textContent = simpleUssd;
    if (btnUssd) {
      btnUssd.setAttribute("href", "tel:" + encodeURIComponent(simpleUssd));
      btnUssd.textContent = "1. Composer le code USSD (" + simpleUssd + ")";
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

    const btnCopyUssd = document.getElementById("btn-copy-ussd");
    if (btnCopyUssd) {
      btnCopyUssd.addEventListener("click", function () {
        const pay = (CFG.payments && CFG.payments[selectedPayMethod]) || {};
        const code = pay.ussd || (selectedPayMethod === "flooz" ? "*155#" : "*145#");
        copyText(code, "Code USSD");
      });
    }

    const btnUssd = document.getElementById("btn-ussd");
    if (btnUssd) {
      btnUssd.addEventListener("click", function (e) {
        const pay = (CFG.payments && CFG.payments[selectedPayMethod]) || {};
        const code = pay.ussd || (selectedPayMethod === "flooz" ? "*155#" : "*145#");
        const isMobilePhone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
        if (!isMobilePhone || /iPhone|iPad|iPod/i.test(navigator.userAgent || "")) {
          copyText(code, "Code USSD");
          showToast("Code USSD copié (" + code + ") ! Composez-le sur votre téléphone.");
        }
      });
    }

    // Gestion du dépôt de capture d'écran de reçu
    const fileInput = document.getElementById("receipt-file");
    const dropzone = document.getElementById("receipt-dropzone");
    const promptEl = document.getElementById("dropzone-prompt");
    const previewWrap = document.getElementById("dropzone-preview-wrap");
    const previewImg = document.getElementById("receipt-preview-img");
    const filenameEl = document.getElementById("receipt-filename");
    const btnRemoveReceipt = document.getElementById("btn-remove-receipt");

    function handleSelectedReceipt(file) {
      if (!file) return;
      if (!file.type.match(/^image\//i)) {
        showToast("Veuillez sélectionner une image (JPG, PNG ou WEBP).");
        return;
      }
      showToast("Optimisation de la capture en cours...");
      compressImageFile(file, 1280, 1280, 0.82, function (err, compressedDataUrl) {
        if (err || !compressedDataUrl) {
          showToast("Erreur lors de la lecture de l'image.");
          return;
        }
        currentReceiptData = {
          name: file.name || "recu.jpg",
          dataUrl: compressedDataUrl,
          file: file,
          uploadedAt: new Date().toISOString()
        };
        if (previewImg) previewImg.src = compressedDataUrl;
        if (filenameEl) filenameEl.textContent = file.name || "Capture_recu.jpg";
        if (promptEl) promptEl.classList.add("hidden");
        if (previewWrap) previewWrap.classList.remove("hidden");
        showToast("Capture d'écran du reçu enregistrée avec succès !");
      });
    }

    if (fileInput) {
      fileInput.addEventListener("change", function (e) {
        const file = e.target.files && e.target.files[0];
        handleSelectedReceipt(file);
      });
    }

    if (dropzone) {
      ["dragenter", "dragover"].forEach(function (evtName) {
        dropzone.addEventListener(evtName, function (e) {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add("dragover");
        });
      });
      ["dragleave", "drop"].forEach(function (evtName) {
        dropzone.addEventListener(evtName, function (e) {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove("dragover");
        });
      });
      dropzone.addEventListener("drop", function (e) {
        const dt = e.dataTransfer;
        const file = dt && dt.files && dt.files[0];
        handleSelectedReceipt(file);
      });
    }

    if (btnRemoveReceipt) {
      btnRemoveReceipt.addEventListener("click", function (e) {
        e.stopPropagation();
        currentReceiptData = null;
        if (fileInput) fileInput.value = "";
        if (previewImg) previewImg.src = "";
        if (previewWrap) previewWrap.classList.add("hidden");
        if (promptEl) promptEl.classList.remove("hidden");
        showToast("Capture retirée.");
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

        // Enregistrement direct de la commande et de la capture de reçu dans l'espace Admin de la plateforme
        const pendingList = loadPendingOrders();
        const pendingItem = {
          id: "PEND-" + Date.now(),
          ticketId: ticket.id,
          ticketName: ticket.name,
          name1: name1,
          name2: ticket.persons > 1 ? name2 : "",
          phone: phone,
          payMethodLabel: pay.label + " (" + pay.number + ")",
          receiptData: currentReceiptData ? currentReceiptData.dataUrl : null,
          receiptName: currentReceiptData ? currentReceiptData.name : null,
          createdAt: new Date().toISOString()
        };
        pendingList.unshift(pendingItem);
        savePendingOrders(pendingList.slice(0, 50));
        syncOrderToCloud(pendingItem);
        refreshAdminUI();

        // Notification et rappel WhatsApp avec texte clair confirmant le dépôt du reçu
        const waNum = encodeURIComponent(pay.whatsapp || "22893895722");
        const msgLines = [
          "Bonjour *Maison de Production Gbévoun* !",
          "Je viens d'effectuer mon paiement pour la soirée *" + (CFG.name || "Mafia Night") + "* :",
          "",
          "• *Pass :* " + ticket.name + " (" + formatPrice(ticket.price) + " " + (CFG.currency || "FCFA") + ")",
          "• *Participant :* " + name1 + (ticket.persons > 1 && name2 ? " & " + name2 : ""),
          "• *Moyen :* " + pay.label + " (" + pay.number + ")"
        ];
        if (currentReceiptData) {
          msgLines.push("• *Reçu :* ✅ Déposé sur la plateforme (" + currentReceiptData.name + ")");
        } else {
          msgLines.push("• *Reçu :* Ci-joint en capture d'écran");
        }
        msgLines.push("");
        msgLines.push("Merci de valider ma réservation et de m'envoyer mon pass officiel numéroté !");

        const waUrl = "https://wa.me/" + waNum + "?text=" + encodeURIComponent(msgLines.join("\n"));

        showToast("Réservation enregistrée ! Ouverture de WhatsApp...");
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
    // Rafraîchissement automatique toutes les 8 secondes quand l'admin est connecté
    if (!window._cloudPollTimer) {
      window._cloudPollTimer = setInterval(function () {
        if (sessionStorage.getItem(SESSION_AUTH_KEY) === "1") {
          fetchCloudOrders(function () {
            renderPendingOrders();
          });
        }
      }, 8000);
    }
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

    const btnToggle = document.getElementById("btn-toggle-pass");
    const inputPass = document.getElementById("admin-pass");
    if (btnToggle && inputPass) {
      btnToggle.addEventListener("click", function () {
        const isPwd = inputPass.type === "password";
        inputPass.type = isPwd ? "text" : "password";
        btnToggle.textContent = isPwd ? "Masquer" : "Afficher";
      });
    }

    const btnLogout = document.getElementById("btn-admin-logout");
    if (btnLogout) {
      btnLogout.addEventListener("click", function () {
        const loginCard = document.getElementById("admin-login-card");
        const panel = document.getElementById("admin-panel");
        if (inputPass) inputPass.value = "";
        if (panel) panel.classList.add("hidden");
        if (loginCard) loginCard.classList.remove("hidden");
        sessionStorage.removeItem(SESSION_AUTH_KEY);
        showToast("Espace administrateur verrouillé.");
      });
    }

    const btnCopySnippet = document.getElementById("btn-copy-snippet");
    if (btnCopySnippet) {
      btnCopySnippet.addEventListener("click", function () {
        const snip = document.getElementById("adm-config-snippet")?.textContent || "";
        if (snip) copyText(snip, "Bloc stocks");
      });
    }

    const btnGenHash = document.getElementById("btn-gen-hash");
    if (btnGenHash) {
      btnGenHash.addEventListener("click", function () {
        const val = (document.getElementById("adm-new-pass")?.value || "").trim();
        const out = document.getElementById("adm-hash-output");
        if (!val) {
          showToast("Entrez un mot de passe à chiffrer.");
          return;
        }
        const h = sha256Hex(val);
        if (out) {
          out.classList.remove("hidden");
          out.textContent = "adminPasswordHash: \"" + h + "\"";
        }
        copyText(h, "Empreinte SHA-256");
      });
    }

    const btnLogin = document.getElementById("btn-admin-login");
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
        receiptData: window._pendingReceiptToAttach || null,
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
        receiptData: window._pendingReceiptToAttach || null,
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
        receiptData: window._pendingReceiptToAttach || null,
        securityCode: generateSecurityCode(seq2, name2),
        createdAt: nowIso,
        checkedIn: false,
        checkedInAt: null
      };
      passes.push(p1, p2);
      createdPasses.push(p1, p2);
    }

    savePasses(passes);
    window._pendingReceiptToAttach = null;

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
    ctx.font = "700 12px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("DATE & HORAIRE", 68, 472);
    ctx.fillText("LIEU SECRET", 370, 472);
    ctx.fillText("DRESS CODE OBLIGATOIRE", 600, 472);

    ctx.fillStyle = "#f3eee5";
    ctx.font = "600 15px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(CFG.date || "Date bientôt annoncée", 68, 496, 280);
    ctx.fillText("Lomé · Lieu privé", 370, 496, 210);
    ctx.fillText("Gangster Chic 20–30", 600, 496, 240);

    ctx.fillStyle = "#a69c8b";
    ctx.font = "400 13px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(CFG.time || "19h00 – 02h00", 68, 517, 280);
    ctx.fillText("Dévoilé aux détenteurs", 370, 517, 210);
    ctx.fillText("Élégance exigée", 600, 517, 240);

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

  function downloadCanvasAsPng(canvas, pass, onComplete) {
    const cleanName = (pass.holderName || "Invite")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_");
    const filename = pass.passNumber + "_" + cleanName + ".png";

    const triggerDownload = function (url, revokeAfter) {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (revokeAfter) {
        setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 4000);
      }
      showToast("Pass téléchargé : " + filename);
      if (typeof onComplete === "function") onComplete();
    };

    try {
      if (canvas.toBlob) {
        canvas.toBlob(function (blob) {
          if (blob) {
            triggerDownload(URL.createObjectURL(blob), true);
          } else {
            triggerDownload(canvas.toDataURL("image/png"), false);
          }
        }, "image/png");
      } else {
        triggerDownload(canvas.toDataURL("image/png"), false);
      }
    } catch (e) {
      showToast("Erreur lors de la création du PNG : " + (e.message || e));
      if (typeof onComplete === "function") onComplete();
    }
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
        downloadCanvasAsPng(canvas, pass, function () {
          setTimeout(function () {
            sendPassViaWhatsApp(pass);
          }, 300);
        });
      });

      actions.appendChild(btnDl);
      actions.appendChild(btnWa);

      item.appendChild(canvas);
      item.appendChild(actions);
      grid.appendChild(item);
    });
  }

  /* ---- Mise à jour des Statistiques & Liste Complète Admin ---- */
  /* ---- Visionneuse Modale de Reçus ---- */
  function openReceiptModal(imgDataUrl, title) {
    const modal = document.getElementById("receipt-modal");
    const modalImg = document.getElementById("receipt-modal-img");
    const modalTitle = document.getElementById("receipt-modal-title");
    const dlBtn = document.getElementById("btn-download-modal-receipt");
    if (!modal || !modalImg) return;

    modalImg.src = imgDataUrl;
    if (modalTitle) modalTitle.textContent = title || "Capture d'écran du reçu de paiement";
    if (dlBtn) {
      dlBtn.href = imgDataUrl;
      dlBtn.download = (title ? title.replace(/[^a-zA-Z0-9_-]/g, "_") : "recu") + ".jpg";
    }
    modal.classList.remove("hidden");
  }

  function closeReceiptModal() {
    const modal = document.getElementById("receipt-modal");
    if (modal) modal.classList.add("hidden");
  }

  function initReceiptModalEvents() {
    const btnClose = document.getElementById("btn-close-receipt-modal");
    const backdrop = document.getElementById("receipt-modal-backdrop");
    if (btnClose) btnClose.addEventListener("click", closeReceiptModal);
    if (backdrop) backdrop.addEventListener("click", closeReceiptModal);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeReceiptModal();
    });
  }

  /* ---- Rendu des Demandes Reçues (En attente avec Capture de Reçu) ---- */
  function renderPendingOrders() {
    const card = document.getElementById("pending-orders-card");
    const tbody = document.getElementById("pending-orders-body");
    if (!card || !tbody) return;

    const list = loadPendingOrders();
    if (list.length === 0) {
      card.classList.add("hidden");
      tbody.innerHTML = "";
      return;
    }

    card.classList.remove("hidden");
    tbody.innerHTML = "";

    list.forEach(function (ord) {
      const tr = document.createElement("tr");
      const timeStr = ord.createdAt
        ? new Date(ord.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        : "-";
      const names = ord.name2
        ? escapeHtml(ord.name1) + " &amp; " + escapeHtml(ord.name2)
        : escapeHtml(ord.name1);

      let receiptHtml = '<span style="color:var(--muted);font-size:0.8rem;">Aucune capture</span>';
      if (ord.receiptData) {
        receiptHtml =
          '<img src="' +
          ord.receiptData +
          '" class="thumb-receipt" data-view-receipt="' +
          escapeHtml(ord.id) +
          '" title="Cliquer pour agrandir le reçu" alt="Reçu" />';
      }

      tr.innerHTML =
        "<td>" + escapeHtml(timeStr) + "</td>" +
        "<td><strong>" + names + "</strong></td>" +
        "<td>" + escapeHtml(ord.ticketName) + "</td>" +
        "<td>" + escapeHtml(ord.payMethodLabel) + "</td>" +
        "<td>" + escapeHtml(ord.phone || "-") + "</td>" +
        "<td>" + receiptHtml + "</td>" +
        "<td>" +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
        '<button type="button" class="btn btn-sm" data-pending-action="prefill" data-id="' + escapeHtml(ord.id) + '">Valider &amp; Émettre Pass</button>' +
        '<button type="button" class="btn btn-outline btn-sm" style="border-color:var(--danger);color:var(--danger);" data-pending-action="remove" data-id="' + escapeHtml(ord.id) + '">✕</button>' +
        "</div>" +
        "</td>";

      tbody.appendChild(tr);
    });

    tbody.querySelectorAll("[data-view-receipt]").forEach(function (img) {
      img.addEventListener("click", function () {
        const id = img.getAttribute("data-view-receipt");
        const list = loadPendingOrders();
        const found = list.find(function (o) { return o.id === id; });
        if (found && found.receiptData) {
          openReceiptModal(found.receiptData, "Reçu - " + (found.name1 || "Client"));
        }
      });
    });

    tbody.querySelectorAll("button[data-pending-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const act = btn.getAttribute("data-pending-action");
        const id = btn.getAttribute("data-id");
        const list = loadPendingOrders();
        const idx = list.findIndex(function (o) { return o.id === id; });
        if (idx === -1) return;
        const ord = list[idx];

        if (act === "prefill") {
          const admTicket = document.getElementById("adm-ticket");
          const admMethod = document.getElementById("adm-method");
          const admPhone = document.getElementById("adm-phone");
          const admName1 = document.getElementById("adm-name-1");
          const admName2 = document.getElementById("adm-name-2");
          const admRef = document.getElementById("adm-ref");

          if (admTicket) admTicket.value = ord.ticketId;
          if (admMethod && ord.payMethodLabel) {
            admMethod.value = ord.payMethodLabel.includes("Flooz") ? "Flooz (79864336)" : "Mixx by Yas (93895722)";
          }
          if (admPhone) admPhone.value = ord.phone || "";
          if (admName1) admName1.value = ord.name1 || "";
          if (admName2) admName2.value = ord.name2 || "";
          if (admRef) admRef.value = "Reçu vérifié sur plateforme";

          const curTicket = getTicketById(ord.ticketId);
          const admFieldName2 = document.getElementById("adm-field-name-2");
          if (admFieldName2) {
            if (curTicket.persons > 1) admFieldName2.classList.remove("hidden");
            else admFieldName2.classList.add("hidden");
          }

          window._pendingReceiptToAttach = ord.receiptData || null;

          list.splice(idx, 1);
          savePendingOrders(list);
          fetchCloudOrders(function () {
      renderPendingOrders();
    });

          handleAdminGeneratePass();
        } else if (act === "remove") {
          list.splice(idx, 1);
          savePendingOrders(list);
          renderPendingOrders();
          showToast("Demande retirée.");
        }
      });
    });
  }

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

    renderPendingOrders();

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
        '<td colspan="10" style="text-align:center;color:var(--muted);padding:22px;">Aucun pass enregistré pour le moment.</td>';
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
        "<td>" +
        (pass.receiptData
          ? '<img src="' + pass.receiptData + '" class="thumb-receipt" data-view-pass-receipt="' + escapeHtml(pass.id) + '" title="Voir la capture du reçu" alt="Reçu" />'
          : '<span style="color:var(--muted);font-size:0.8rem;">-</span>') +
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

    tbody.querySelectorAll("[data-view-pass-receipt]").forEach(function (img) {
      img.addEventListener("click", function () {
        const id = img.getAttribute("data-view-pass-receipt");
        const list = loadPasses();
        const found = list.find(function (p) { return p.id === id; });
        if (found && found.receiptData) {
          openReceiptModal(found.receiptData, "Reçu de " + (found.holderName || "Participant") + " (" + found.passNumber + ")");
        }
      });
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
    initReceiptModalEvents();
  });
})();

