/* EducAlvator: swaps a game's built-in questions for AI-generated ones.

   A batch for every topic is fetched when the game opens. Pressing Start or Play
   Again waits for that batch when it is still on its way, and fetches a fresh set
   when the current one has already been played, so a round never silently starts
   on stale questions. If the service can't answer in time the round runs on the
   built-in questions and the player is told. Questions that arrive late are kept
   for the next round. */
window.EduAI = (function () {
  var WAIT_MS = 30000;   // the server tries a backup model when its first choice is overloaded

  function toast(text) {
    var el = document.createElement("div");
    el.textContent = text;
    el.setAttribute("role", "status");
    el.style.cssText =
      "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9999;max-width:90vw;" +
      "padding:10px 16px;border-radius:10px;background:rgba(15,23,42,.92);color:#fff;" +
      "font:600 13px/1.4 system-ui,sans-serif;text-align:center;pointer-events:none";
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 5000);
  }

  function reasonFor(status) {
    if (status === 401) return "Sign in to EducAlvator to get fresh AI questions. Using built-in questions for this round.";
    if (status === 429) return "Too many requests right now. Using built-in questions for this round.";
    return "AI questions aren't available right now. Using built-in questions for this round.";
  }

  /* cfg: subject, grade, keys[] (topic keys for this grade), label(key),
     apply(key, questions), selected() (topic keys the menu points at), buttons[]
     (ids of the buttons that begin a round). */
  function attach(cfg) {
    var fresh = {};        // topic key -> an unplayed AI set is loaded
    var lastStatus = 0;    // HTTP status of the latest attempt (0 = network failure)
    var startup = null;    // the opening batch, while it is on its way

    // Resolves true when every requested topic now has an unplayed AI set.
    function fetchTopics(keys) {
      var topics = keys.map(function (k) { return { key: k, label: cfg.label(k) }; });
      var nonce = Date.now() + "-" + Math.random().toString(36).slice(2);
      return fetch("/api/game-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: cfg.subject, grade: Number(cfg.grade), count: 10, topics: topics, nonce: nonce })
      })
        .then(function (r) {
          lastStatus = r.status;
          return r.ok ? r.json() : null;
        })
        .then(function (d) {
          var Q = (d && d.questions) || {};
          Object.keys(Q).forEach(function (k) {
            if (keys.indexOf(k) < 0 || !Array.isArray(Q[k]) || !Q[k].length) return;
            cfg.apply(k, Q[k].map(function (it) {
              var opts = (it.options || []).slice(0, 3).map(String);
              return { q: it.question, options: opts, correctIndex: Math.max(0, opts.indexOf(it.correct_answer)) };
            }));
            fresh[k] = true;
          });
          return keys.every(function (k) { return fresh[k]; });
        })
        .catch(function () {
          lastStatus = 0;
          return false;
        });
    }

    // A transient empty reply gets one retry; a refusal or rate limit won't change.
    function fetchWithRetry(keys) {
      return fetchTopics(keys).then(function (ok) {
        return ok || lastStatus === 401 || lastStatus === 429 ? ok : fetchTopics(keys);
      });
    }

    function questionsFor(keys) {
      var wait = startup
        ? startup.then(function () { return keys.every(function (k) { return fresh[k]; }); })
        : Promise.resolve(false);
      return wait.then(function (ok) { return ok || fetchWithRetry(keys); });
    }

    function hook(btn) {
      var passThrough = false;
      btn.addEventListener("click", function (e) {
        if (passThrough) { passThrough = false; return; } // our own click: let the game start
        var keys = cfg.selected();
        function markPlayed() { keys.forEach(function (k) { fresh[k] = false; }); }

        if (keys.length && keys.every(function (k) { return fresh[k]; })) {
          markPlayed();
          return; // questions are ready: start straight away
        }
        e.stopImmediatePropagation();
        e.preventDefault();
        if (btn.disabled) return;
        var label = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Getting questions…";

        var timedOut = new Promise(function (res) { setTimeout(function () { res(false); }, WAIT_MS); });
        Promise.race([keys.length ? questionsFor(keys) : Promise.resolve(false), timedOut]).then(function (ok) {
          if (ok) markPlayed();
          else toast(reasonFor(lastStatus));
          btn.disabled = false;
          btn.textContent = label;
          passThrough = true;
          btn.click();
        });
      }, true); // capture: runs before the game's own click handler
    }

    cfg.buttons.forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn) hook(btn);
    });

    startup = fetchTopics(cfg.keys).then(function (ok) { startup = null; return ok; });
  }

  return { attach: attach };
})();
