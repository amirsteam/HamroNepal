// Runs before the app (a file, not inline: the CSP allows scripts from the site only).
// 1. The site's colours (Dashboard → साइट सेटिङ), cached from the last visit.
// 2. On the home page, start loading the home stories now instead of after the
//    app's JavaScript has downloaded; getHomeData() picks the result up.
(function () {
  try {
    var hn = JSON.parse(localStorage.getItem("hn_site_settings") || "null");
    if (hn && hn.colors) {
      var dk = function (h, a) {
        var n = parseInt(h.slice(1), 16);
        return "#" + [n >> 16, (n >> 8) & 255, n & 255].map(function (c) { return Math.round(c * (1 - a)).toString(16).padStart(2, "0"); }).join("");
      };
      var st = document.documentElement.style, c = hn.colors;
      st.setProperty("--color-primary", c.primary);
      st.setProperty("--color-primary-dark", dk(c.primary, 0.2));
      st.setProperty("--color-secondary", c.secondary);
      st.setProperty("--color-secondary-dark", dk(c.secondary, 0.25));
      st.setProperty("--color-ink", c.ink);
    }
  } catch (e) {}

  try {
    var p = location.pathname.replace(/\/+$/, "") || "/";
    var lang = p === "/" ? "ne" : p === "/en" ? "en" : null;
    if (lang && window.fetch) {
      window.__hnHome = {
        lang: lang,
        data: fetch(lang === "en" ? "/api/home?lang=en" : "/api/home", { credentials: "include" })
          .then(function (r) { return r.ok ? r.json() : null; })
          .catch(function () { return null; }),
      };
    }
  } catch (e) {}
})();
