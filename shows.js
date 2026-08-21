/* ============================================================================
   CHORE BOYS — show list renderer

   Reads the published "Public" tab of the show calendar and rebuilds the show
   listings from it, so adding a date means editing the spreadsheet and nothing
   else. index.html renders as month accordions; shows.html renders as a flat
   list. Both share this file.

   IMPORTANT — the HTML in each page is the fallback. If the fetch fails
   (Google down, offline, ad blocker), the hard-coded shows already in the page
   stay exactly as they are. Nothing is cleared until a good response arrives.

   TO CHANGE THE SOURCE: edit FEED_URL below. It must be a published-to-web CSV
   of a tab containing ONLY public columns — never the tab with fees or notes.
   Columns, in order: date, venue, city, support, headliner, featured, tickets
   ========================================================================== */

(function () {
  'use strict';

  var FEED_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQhZgE9RimEd6-BIydyOT7LdF4xoUYql7OhW724IWY_8k0sm9gVwqfZsWinfQntIByDl3wRgyQJVJgS/pub?gid=710446499&single=true&output=csv';

  var MONTH_FULL  = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY',
                     'AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  var MONTH_SHORT = ['JAN','FEB','MAR','APR','MAY','JUNE','JULY',
                     'AUG','SEPT','OCT','NOV','DEC'];

  var container = document.getElementById('showsList');
  if (!container) return;

  /* ---------- tiny CSV parser (handles quoted fields containing commas) ---- */
  function parseCSV(text) {
    var rows = [], row = [], field = '', inQuotes = false, i = 0;
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    while (i < text.length) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += ch; i++; continue;
      }
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === ',')  { row.push(field); field = ''; i++; continue; }
      if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
      field += ch; i++;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function toObjects(rows) {
    if (!rows.length) return [];
    var head = rows[0].map(function (h) { return String(h).trim().toLowerCase(); });
    var out = [];
    for (var r = 1; r < rows.length; r++) {
      if (!rows[r].length) continue;
      var o = {}, blank = true;
      for (var c = 0; c < head.length; c++) {
        var v = (rows[r][c] === undefined ? '' : String(rows[r][c]).trim());
        o[head[c]] = v;
        if (v) blank = false;
      }
      if (!blank) out.push(o);
    }
    return out;
  }

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function isTrue(v) { return String(v).trim().toUpperCase() === 'TRUE'; }
  function validDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s).trim()); }

  /* ---------- markup builders ------------------------------------------- */
  function dateChip(iso) {
    var p = iso.split('-');
    return MONTH_SHORT[parseInt(p[1], 10) - 1] + ' ' + parseInt(p[2], 10);
  }

  function showRow(s) {
    var featured = isTrue(s.featured) && s.headliner;
    var tickets = s.tickets
      ? '<a href="' + esc(s.tickets) + '" target="_blank" rel="noopener" class="ticket-btn">Buy Tickets Now!</a>'
      : '';

    if (featured) {
      var venueLine = s.venue + (s.city ? ' · ' + s.city : '');
      return '<li class="show-list-item featured" data-date="' + esc(s.date) + '">' +
               '<span class="show-date">' + esc(dateChip(s.date)) + '</span>' +
               '<span class="featured-body">' +
                 '<span class="featured-tag">Special Guest</span>' +
                 '<span class="featured-headliner">' + esc(s.headliner) + '</span>' +
                 (s.support ? '<span class="featured-support">' + esc(s.support) + '</span>' : '') +
                 '<span class="featured-venue">' + esc(venueLine) + '</span>' +
               '</span>' + tickets +
             '</li>';
    }
    return '<li class="show-list-item" data-date="' + esc(s.date) + '">' +
             '<span class="show-date">' + esc(dateChip(s.date)) + '</span>' +
             '<span>' +
               (s.support ? '<span class="show-info">' + esc(s.support) + '</span>' : '') +
               '<span class="show-venue">' + esc(s.venue) + '</span>' +
               (s.city ? '<span class="show-city">' + esc(s.city) + '</span>' : '') +
             '</span>' + tickets +
           '</li>';
  }

  /* Group into months, preserving date order */
  function groupByMonth(shows) {
    var groups = [], seen = {};
    shows.forEach(function (s) {
      var key = s.date.slice(0, 7);              // YYYY-MM
      if (!seen[key]) {
        seen[key] = { key: key, id: 'm' + key.replace('-', ''), shows: [] };
        groups.push(seen[key]);
      }
      seen[key].shows.push(s);
    });
    var thisYear = String(new Date().getFullYear());
    groups.forEach(function (g) {
      var y = g.key.slice(0, 4), m = parseInt(g.key.slice(5), 10) - 1;
      g.label = MONTH_FULL[m] + (y === thisYear ? '' : ' ' + y);
      var cities = [];
      g.shows.forEach(function (s) {
        if (s.city && cities.indexOf(s.city) === -1) cities.push(s.city);
      });
      g.cities = cities.join(' + ');
    });
    return groups;
  }

  function renderAccordion(groups) {
    return groups.map(function (g, i) {
      var color = (i % 2 === 0) ? 'bg-palette-blue' : 'bg-palette-pink';
      var n = g.shows.length;
      return '<div class="tour-group" data-month="' + g.id + '">' +
        '<button type="button" class="month-bar ' + color + ' w-full text-left" ' +
                'aria-expanded="false" aria-controls="' + g.id + '" ' +
                'onclick="toggleGroup(\'' + g.id + '\')">' +
          '<span class="month-bar-left">' +
            '<span class="font-display text-xl tracking-widest">' + esc(g.label) + '</span>' +
            '<span class="text-sm font-light uppercase tracking-wider opacity-90">' + esc(g.cities) + '</span>' +
          '</span>' +
          '<span class="month-bar-right">' +
            '<span class="text-sm opacity-75">' + n + ' show' + (n === 1 ? '' : 's') + '</span>' +
            '<span id="' + g.id + '-arrow" class="month-arrow">&#9660;</span>' +
          '</span>' +
        '</button>' +
        '<div id="' + g.id + '" class="tour-group-body">' +
          '<ul class="list-none p-0 m-0">' + g.shows.map(showRow).join('') + '</ul>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderFlat(groups) {
    return groups.map(function (g, i) {
      var color = (i % 2 === 0) ? 'bg-palette-blue' : 'bg-palette-pink';
      return '<div data-month="' + g.id + '" class="month-bar ' + color + '">' +
               '<span class="font-display text-xl tracking-widest">' + esc(g.label) + '</span>' +
               '<span class="text-sm font-light uppercase tracking-wider opacity-90">' + esc(g.cities) + '</span>' +
             '</div>' +
             '<ul data-month="' + g.id + '" class="list-none p-0 m-0">' +
               g.shows.map(showRow).join('') +
             '</ul>';
    }).join('');
  }

  /* ---------- go --------------------------------------------------------- */
  fetch(FEED_URL, { cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) throw new Error('feed HTTP ' + res.status);
      return res.text();
    })
    .then(function (text) {
      var shows = toObjects(parseCSV(text)).filter(function (s) {
        return validDate(s.date) && s.venue;
      });
      if (!shows.length) throw new Error('feed had no usable rows');

      shows.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });

      var groups = groupByMonth(shows);
      container.innerHTML = (container.getAttribute('data-mode') === 'accordion')
        ? renderAccordion(groups)
        : renderFlat(groups);

      // hand off to the existing date logic (strike past, NEXT UP, hide months)
      if (typeof window.updateShowStatus === 'function') window.updateShowStatus();
      if (typeof window.measureOpenGroups === 'function') window.measureOpenGroups();
    })
    .catch(function (err) {
      // Deliberately silent for visitors: the hard-coded shows in the page are
      // still on screen and still correct-ish, which beats an error message.
      if (window.console && console.warn) {
        console.warn('[shows] falling back to the show list in the HTML:', err.message);
      }
    });
})();
