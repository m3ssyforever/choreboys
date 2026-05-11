/* =============================================================
   CHORE BOYS — IMAGE MANIFEST
   Single source of truth for all photo URLs used across the site.

   HOW TO ADD MORE IMAGES LATER
   ----------------------------
   1. Drop the new file(s) into /images/ in the choreboys repo.
   2. Name each one {NUMBER}.jpg where NUMBER continues from `last`
      below (e.g. if last = 10425, the next file is 10426.jpg).
   3. After adding, update the `last` value below to the highest
      number you added.
   4. Commit & push. All pages (index, chorecloud, xhasizzle) will
      automatically pick them up — no other code changes needed.

   If you ever need to put a non-jpg in the set (rare), add an
   entry to `overrides` mapping the id to its actual filename.
   ============================================================= */

window.CB_IMAGES = (function () {
    var base = 'https://raw.githubusercontent.com/m3ssyforever/choreboys/main/images/';
    var first = 10047;
    var last = 10355;

    // ids whose file uses a non-jpg extension
    var overrides = {
        10102: '10102.png'
    };

    function url(id) {
        if (overrides[id]) return base + overrides[id];
        return base + id + '.jpg';
    }

    function all() {
        var list = [];
        for (var i = first; i <= last; i++) list.push(url(i));
        return list;
    }

    function setRandomBackground(el) {
        var list = all();
        var pick = list[Math.floor(Math.random() * list.length)];
        (el || document.body).style.backgroundImage = 'url(' + pick + ')';
    }

    return {
        base: base,
        first: first,
        last: last,
        url: url,
        all: all,
        setRandomBackground: setRandomBackground
    };
})();
