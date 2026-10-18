// Page de prompts : copie, filtres, progression, et dépôt d'images quand le serveur de dev tourne (npm run dev).
(function () {
  var D = window.__DATA__;
  var ART = '../src/assets/art/';
  var state = { cat: 'all', q: '', missing: false, dev: false };
  var okCount = {};

  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }

  var toastEl = h('div', { class: 'toast' });
  document.body.appendChild(toastEl);
  var toastT = 0;
  function toast(msg, bad) {
    toastEl.textContent = msg;
    toastEl.className = 'toast on' + (bad ? ' bad' : '');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.className = 'toast'; }, 2200);
  }

  function copy(text, msg) {
    var done = function () { toast(msg || 'Copié dans le presse-papiers'); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Copie impossible : sélectionnez le texte à la main', true); }
      ta.remove();
    }
  }

  // ——— dépôt d'images (serveur de dev uniquement) ———
  function upload(file, name, card) {
    toast('Envoi de ' + name + '…');
    return fetch('/__art/upload?file=' + encodeURIComponent(name), { method: 'POST', body: file })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (!r.ok) throw new Error(r.error || 'échec');
        toast(name + ' traité ✓');
        if (card) refreshThumbs(card);
      })
      .catch(function (e) { toast('Erreur : ' + e.message, true); });
  }

  function makeDrop(name, card) {
    var d = h('label', { class: 'drop', text: '⬆ Déposer l\'image (' + name + ')' });
    var input = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
    input.addEventListener('change', function () { if (input.files[0]) upload(input.files[0], name, card); });
    d.appendChild(input);
    d.addEventListener('dragover', function (e) { e.preventDefault(); d.classList.add('drag'); });
    d.addEventListener('dragleave', function () { d.classList.remove('drag'); });
    d.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      d.classList.remove('drag');
      if (e.dataTransfer.files[0]) upload(e.dataTransfer.files[0], name, card);
    });
    return d;
  }

  // ——— aperçus ———
  function thumbs(it) {
    var wide = it.cat === 'arena' || it.cat === 'event' || it.cat === 'title' || it.cat === 'terrain';
    var box = h('div', { class: 'thumbs' + (it.previews.length === 1 ? ' single' : '') + (wide ? ' wide' : '') });
    var loaded = 0;
    var ph = h('div', { class: 'ph', text: 'Aucune image traitée pour l\'instant' });
    it.previews.forEach(function (p) {
      var img = h('img', { alt: '' });
      img.style.display = 'none';
      img.addEventListener('load', function () {
        img.style.display = '';
        loaded++;
        ph.style.display = 'none';
        box.__loaded = loaded;
        setState(box.closest('.card'), loaded, it.previews.length);
      });
      img.src = ART + p + '?t=' + (box.__bust || 0);
      box.appendChild(img);
    });
    box.appendChild(ph);
    return box;
  }

  function setState(card, n, total) {
    if (!card) return;
    var s = card.querySelector('.state');
    s.className = 'state ' + (n === 0 ? 'todo' : n === total ? 'ok' : 'part');
    s.textContent = n === 0 ? 'à générer' : n === total ? 'prêt ✓' : n + '/' + total;
    okCount[card.dataset.id] = n === total ? 1 : 0;
    updateProgress();
  }

  function refreshThumbs(card) {
    var it = D.items.filter(function (i) { return i.id === card.dataset.id; })[0];
    var old = card.querySelector('.thumbs');
    var neu = thumbs(it);
    neu.__bust = Date.now();
    old.replaceWith(neu);
    neu.querySelectorAll('img').forEach(function (img) { img.src = img.src.split('?')[0] + '?t=' + neu.__bust; });
  }

  function chip(text, cls, onclick) {
    return h('span', { class: 'chip ' + (cls || ''), text: text, onclick: onclick || null });
  }

  function card(it) {
    var c = h('article', { class: 'card', 'data-id': it.id });
    c.appendChild(thumbs(it));
    var b = h('div', { class: 'cbody' });
    b.appendChild(h('h3', null, [it.title, h('span', { class: 'state ' + (it.have === 0 ? 'todo' : it.have === it.previews.length ? 'ok' : 'part'), text: it.have === 0 ? 'à générer' : it.have === it.previews.length ? 'prêt ✓' : it.have + '/' + it.previews.length })]));
    b.appendChild(h('p', { class: 'note', text: it.note }));
    var chips = h('div', { class: 'chips' }, [
      chip('Format ' + it.ratio),
      chip(it.size),
      chip(it.bg === 'white' ? 'Fond blanc uni' : 'Image pleine (pas de détourage)'),
      chip('📄 ' + it.file, 'file', function () { copy(it.file, 'Nom de fichier copié'); }),
    ].concat((it.chips || []).map(function (t) { return chip(t); })));
    b.appendChild(chips);
    b.appendChild(h('pre', { class: 'prompt', text: it.prompt }));
    b.appendChild(h('div', { class: 'actions' }, [
      h('button', { class: 'copy primary', text: 'Copier le prompt', onclick: function () { copy(it.prompt); } }),
      h('button', { class: 'copy', text: 'Copier le nom du fichier', onclick: function () { copy(it.file, 'Nom de fichier copié'); } }),
      makeDrop(it.file, c),
    ]));
    if (it.variants && it.variants.length) {
      var det = h('details', { class: 'variants' }, [h('summary', { text: 'Ou une forme à la fois (si votre IA ne sait pas faire de planche de 3)' })]);
      it.variants.forEach(function (v) {
        det.appendChild(h('div', { class: 'variant' }, [
          h('div', { class: 'vt', text: v.label }),
          h('pre', { class: 'prompt', text: v.prompt }),
          h('div', { class: 'actions' }, [
            h('button', { class: 'copy primary', text: 'Copier le prompt', onclick: function () { copy(v.prompt); } }),
            chip('📄 ' + v.file, 'file', function () { copy(v.file, 'Nom de fichier copié'); }),
            makeDrop(v.file, c),
          ]),
        ]));
      });
      b.appendChild(det);
    }
    c.appendChild(b);
    // dépôt sur toute la carte
    c.addEventListener('dragover', function (e) { if (state.dev) { e.preventDefault(); c.classList.add('drag'); } });
    c.addEventListener('dragleave', function () { c.classList.remove('drag'); });
    c.addEventListener('drop', function (e) {
      c.classList.remove('drag');
      if (!state.dev || !e.dataTransfer.files[0]) return;
      e.preventDefault();
      upload(e.dataTransfer.files[0], it.file, c);
    });
    return c;
  }

  // ——— rendu ———
  var main = document.getElementById('main');
  function visible(it) {
    if (state.cat !== 'all' && it.cat !== state.cat) return false;
    if (state.missing && okCount[it.id]) return false;
    if (state.q) {
      var hay = (it.title + ' ' + it.note + ' ' + it.file + ' ' + it.prompt + ' ' + (it.chips || []).join(' ')).toLowerCase();
      if (hay.indexOf(state.q.toLowerCase()) < 0) return false;
    }
    return true;
  }

  function render() {
    main.innerHTML = '';
    var any = false;
    Object.keys(D.catLabels).forEach(function (cat) {
      var list = D.items.filter(function (i) { return i.cat === cat && visible(i); });
      if (!list.length) return;
      any = true;
      var sec = h('section', { class: 'cat' }, [h('h2', null, [D.catLabels[cat], h('small', { text: list.length + ' image(s)' })])]);
      var grid = h('div', { class: 'grid' });
      list.forEach(function (it) { grid.appendChild(card(it)); });
      sec.appendChild(grid);
      main.appendChild(sec);
    });
    if (!any) main.appendChild(h('p', { class: 'note', text: 'Aucun résultat.' }));
  }

  function updateProgress() {
    var total = D.items.length;
    var ok = D.items.filter(function (i) { return okCount[i.id]; }).length;
    document.getElementById('pcount').textContent = ok + ' / ' + total + ' prêtes';
    document.getElementById('pbar').style.width = (100 * ok) / total + '%';
  }

  function toolbar() {
    var cats = document.getElementById('cats');
    var mk = function (cat, label) {
      var n = cat === 'all' ? D.items.length : D.items.filter(function (i) { return i.cat === cat; }).length;
      var b = h('button', { class: 'chip-btn' + (state.cat === cat ? ' on' : ''), text: label + ' (' + n + ')', onclick: function () {
        state.cat = cat;
        cats.querySelectorAll('.chip-btn').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        render();
      } });
      return b;
    };
    cats.appendChild(mk('all', 'Tout'));
    Object.keys(D.catLabels).forEach(function (c) { cats.appendChild(mk(c, D.catLabels[c].split(' (')[0])); });
    document.getElementById('q').addEventListener('input', function (e) { state.q = e.target.value; render(); });
    document.getElementById('missing').addEventListener('click', function (e) {
      state.missing = !state.missing;
      e.target.classList.toggle('on', state.missing);
      render();
    });
    document.getElementById('copyall').addEventListener('click', function () {
      var text = D.items.filter(visible).map(function (it) { return '### ' + it.title + '  →  ' + it.file + '  (' + it.ratio + ')\n' + it.prompt; }).join('\n\n');
      copy(text, 'Tous les prompts affichés ont été copiés');
    });
  }

  // ——— détection du serveur de dev + dépôt global par nom de fichier ———
  function detectDev() {
    if (location.protocol.indexOf('http') !== 0) return;
    fetch('/__art/ping').then(function (r) { return r.json(); }).then(function (r) {
      if (!r.ok) return;
      state.dev = true;
      document.body.classList.add('dev');
      var bar = document.getElementById('devbar');
      bar.classList.add('on');
      bar.addEventListener('dragover', function (e) { e.preventDefault(); bar.classList.add('drag'); });
      bar.addEventListener('dragleave', function () { bar.classList.remove('drag'); });
      bar.addEventListener('drop', function (e) {
        e.preventDefault();
        bar.classList.remove('drag');
        var known = {};
        D.items.forEach(function (it) {
          known[it.file.toLowerCase()] = it;
          (it.variants || []).forEach(function (v) { known[v.file.toLowerCase()] = it; });
        });
        Array.prototype.forEach.call(e.dataTransfer.files, function (f) {
          var base = f.name.toLowerCase().replace(/\.(png|jpe?g|webp)$/, '') + '.png';
          var it = known[base];
          if (!it) { toast('Nom inconnu : ' + f.name, true); return; }
          var cardEl = document.querySelector('[data-id="' + it.id + '"]');
          upload(f, base, cardEl);
        });
      });
    }).catch(function () {});
  }

  D.items.forEach(function (it) { okCount[it.id] = it.have === it.previews.length ? 1 : 0; });
  toolbar();
  render();
  updateProgress();
  detectDev();
})();
