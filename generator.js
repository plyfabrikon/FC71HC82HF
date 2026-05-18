/* ── THEME SWITCHER ── */
var html = document.documentElement;
var THEME_KEY = 'gpp-theme';

function applyTheme(t) {
    html.setAttribute('data-theme', t);
    localStorage.setItem(THEME_KEY, t);
    document.querySelectorAll('.theme-btn').forEach(function(b) {
        b.classList.toggle('active', b.dataset.themeTarget === t);
    });
}

var saved = localStorage.getItem(THEME_KEY);
if (saved) applyTheme(saved);

document.querySelectorAll('.theme-btn').forEach(function(b) {
    b.addEventListener('click', function() { applyTheme(b.dataset.themeTarget); });
});

/* ── FILTER BUTTONS ── */
function setFilter(filter) {
    document.querySelectorAll('.filter-btn').forEach(function(b) {
        b.classList.toggle('active', b.dataset.filter === filter);
    });
    document.querySelectorAll('.prompt-card').forEach(function(card) {
        var tags = (card.dataset.tags || '').split(' ');
        card.hidden = !(filter === 'all' || tags.indexOf(filter) !== -1);
    });
}

/* ── TILE HELPERS ── */
function selectTile(btn, hiddenId) {
    var group = btn.parentElement;
    group.querySelectorAll('.tile').forEach(function(t) { t.classList.remove('on'); });
    btn.classList.add('on');
    var hidden = document.getElementById(hiddenId);
    if (hidden) hidden.value = btn.dataset.val;
    buildPrompt();
}

function toggleAdv(toggle) {
    var body = toggle.nextElementSibling;
    var icon = toggle.querySelector('.gen-adv-icon');
    body.classList.toggle('open');
    icon.textContent = body.classList.contains('open') ? '−' : '+';
}

/* ── PRESETS ── */
var presets = {
    nocny:  { 'n-subject': 'portret kobiety', 'n-subject-type': 'woman', 'n-scene': 'na mokrej ulicy nocą z neonami i odbiciami w kałużach', 'n-style': 'editorial-photo', 'n-light': 'w chłodnych neonowych odbiciach' },
    studio: { 'n-subject': 'portret kobiety', 'n-subject-type': 'woman', 'n-scene': 'w studiu fotograficznym z białym tłem', 'n-style': 'beauty-photo', 'n-light': 'w miękkim świetle beauty' },
    natura: { 'n-subject': 'portret kobiety', 'n-subject-type': 'woman', 'n-scene': 'w ogrodzie pełnym zieleni po deszczu', 'n-style': 'lifestyle-photo', 'n-light': 'w ciepłym świetle złotej godziny' },
    luksus: { 'n-subject': 'elegancki produkt', 'n-subject-type': 'object', 'n-scene': 'w hotel lobby z marmurem', 'n-style': 'luxury-campaign', 'n-light': 'w miękkim równomiernym świetle studyjnym' }
};

function applyPreset(key, btn) {
    document.querySelectorAll('.preset-card').forEach(function(c) { c.classList.remove('sel'); });
    btn.classList.add('sel');
    var p = presets[key];
    if (!p) return;
    Object.keys(p).forEach(function(id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.value = p[id];
        // sync tiles if this field has a tile group
        var group = document.getElementById('tiles-' + id);
        if (group) {
            group.querySelectorAll('.tile').forEach(function(t) {
                t.classList.toggle('on', t.dataset.val === p[id]);
            });
        }
    });
    buildPrompt();
}


function copyText(text, btn) {
    var orig = btn.innerHTML;
    var fallback = function() {
        var t = document.createElement('textarea');
        t.value = text;
        t.style.cssText = 'position:fixed;left:-9999px;opacity:0';
        document.body.appendChild(t);
        t.focus(); t.select();
        try { document.execCommand('copy'); } catch(e) {}
        t.remove();
    };
    try {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).catch(fallback);
        } else { fallback(); }
    } catch(e) { fallback(); }
    btn.innerHTML = '<i class="fas fa-check"></i> Skopiowano';
    setTimeout(function() { btn.innerHTML = orig; }, 1800);
}

document.querySelectorAll('.copy-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        var box = btn.closest('.prompt-card').querySelector('.prompt-box');
        copyText(box.textContent.trim(), btn);
    });
});

/* ── GENERATOR ── */
var currentMode = 'new';

function switchGenMode(mode) {
    currentMode = mode;
    var fn = document.getElementById('form-new');
    var fe = document.getElementById('form-edit');
    var fq = document.getElementById('form-quality');
    var tn = document.getElementById('tab-new');
    var te = document.getElementById('tab-edit');
    var tq = document.getElementById('tab-quality');
    if (fn) fn.hidden = (mode !== 'new');
    if (fe) fe.hidden = (mode !== 'edit');
    if (fq) fq.hidden = (mode !== 'quality');
    if (tn) tn.classList.toggle('active', mode === 'new');
    if (te) te.classList.toggle('active', mode === 'edit');
    if (tq) tq.classList.toggle('active', mode === 'quality');
    buildPrompt();
}

function updateQualitySections() {
    var map = {
        'q-sharpness':   'qs-sharpness',
        'q-noise':       'qs-noise',
        'q-exposure':    'qs-exposure',
        'q-shadows':     'qs-shadows',
        'q-highlights':  'qs-highlights',
        'q-colorcast':   'qs-colorcast',
        'q-whitebal':    'qs-whitebal',
        'q-skintone':    'qs-skintone',
        'q-skinretuch':  'qs-skinretuch',
        'q-horizon':     'qs-horizon',
        'q-perspective': 'qs-perspective'
    };
    var checked = [];
    document.querySelectorAll('#form-quality .edit-checks input:checked').forEach(function(i) {
        checked.push(i.value);
    });
    Object.keys(map).forEach(function(key) {
        var el = document.getElementById(map[key]);
        if (el) el.hidden = (checked.indexOf(key) === -1);
    });
    buildPrompt();
}


function updateEditSections() {
    var checked = [];
    document.querySelectorAll('.edit-checks input:checked').forEach(function(i) {
        checked.push(i.value);
    });
    var map = {
        bg:'es-bg', light:'es-light', lens:'es-lens', weather:'es-weather',
        outfit:'es-outfit', hair:'es-hair', makeup:'es-makeup',
        style:'es-style', colorgrade:'es-colorgrade',
        refresh:'es-refresh', remove:'es-remove',
        cropchange:'es-cropchange', outfitseq:'es-outfitseq'
    };
    Object.keys(map).forEach(function(key) {
        var el = document.getElementById(map[key]);
        if (el) el.hidden = (checked.indexOf(key) === -1);
    });
    buildPrompt();
}

function gv(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() || null : null;
}

function sentences() {
    var args = Array.prototype.slice.call(arguments);
    return args.filter(Boolean).join(' ');
}

/* ── NOWY OBRAZ — helpers ── */
function getProfile() {
    var t = gv('n-subject-type');
    if (t === 'woman')  return {isPerson:true,  isScene:false, gen:'kobiety'};
    if (t === 'man')    return {isPerson:true,  isScene:false, gen:'mężczyzny'};
    if (t === 'person') return {isPerson:true,  isScene:false, gen:'osoby'};
    if (t === 'scene')  return {isPerson:false, isScene:true,  gen:'sceny'};
    return {isPerson:false, isScene:false, gen:'obiektu'};
}

function getStyleLabel(p) {
    var s = gv('n-style');
    var tbl = {
        'editorial-photo':  p.isPerson ? 'fotografia editorial, naturalna skóra' : 'fotografia editorial',
        'studio-photo':     p.isPerson ? 'fotografia studyjna' : 'fotografia studyjna, kontrolowane tło',
        'fashion-photo':    p.isPerson ? 'fotografia modowa' : 'fotografia lifestyle',
        'beauty-photo':     p.isPerson ? 'fotografia beauty, naturalna skóra' : 'fotografia beauty',
        'product-photo':    p.isScene  ? 'fotografia wnętrza' : 'fotografia produktowa',
        'street-photo':     'fotografia uliczna',
        'lifestyle-photo':  'fotografia lifestyle, naturalna',
        'food-photo':       'fotografia kulinarna',
        'luxury-campaign':  p.isPerson ? 'luksusowa kampania modowa' : 'luksusowa kampania produktowa',
        'dark-moody':       'dark & moody, dramatyczna',
        'light-airy':       'light & airy, jasna i zwiewna',
        'vintage-film':     'vintage, analogowy film',
        'fine-art':         'fine art',
        'concept-art':      'concept art'
    };
    return tbl[s] || 'fotografia realistyczna';
}

function buildPrompt() {
    var out = document.getElementById('prompt-output');
    if (!out) return;
    var result = '';

    if (currentMode === 'new') {
        var p       = getProfile();
        var subject = gv('n-subject') || 'elegancki produkt';
        var scene   = gv('n-scene');
        var light   = gv('n-light');
        var style   = getStyleLabel(p);
        var crop    = gv('n-crop');
        var frame   = gv('n-frame');
        var effect  = gv('n-effect');
        var avoid   = gv('n-avoid');

        if (!p.isPerson && crop && (crop.indexOf('twarz') !== -1 || crop.indexOf('postać') !== -1)) crop = null;
        if (!p.isPerson && frame && frame.indexOf('85') !== -1) frame = null;

        /* ── Narracyjny akapit ── */
        var parts = [];

        /* Otwierające zdanie: temat + scena */
        if (p.isPerson) {
            parts.push('Stwórz fotografię ' + subject + ', ' + scene + '.');
        } else if (p.isScene) {
            parts.push('Stwórz fotografię wnętrza — ' + subject + ', ' + scene + '.');
        } else {
            parts.push('Stwórz fotografię produktu — ' + subject + ', ' + scene + '.');
        }

        /* Oświetlenie i atmosfera */
        if (light) {
            parts.push('Zdjęcie wykonane ' + light + ', nadając scenie autentyczny, naturalny nastrój.');
        }

        /* Kadr i optyka */
        var optics = [];
        if (crop) optics.push(crop);
        if (frame) optics.push(frame);
        if (optics.length > 0) {
            parts.push('Kompozycja: ' + optics.join(', ') + '.');
        }

        /* Efekt */
        if (effect) {
            parts.push('Efekt wizualny: ' + effect + ', dodający głębi i charakteru zdjęciu.');
        }

        /* Styl i realizm */
        parts.push('Estetyka: ' + style + '. Realizm fotograficzny, naturalna tekstura i szczegóły.');

        /* Unikaj */
        if (avoid) {
            parts.push('Unikaj: ' + avoid + '.');
        }

        result = parts.join(' ');

    } else if (currentMode === 'edit') {
        var checked = [];
        document.querySelectorAll('.edit-checks input:checked').forEach(function(i) {
            checked.push(i.value);
        });

        if (checked.length === 0) {
            out.value = 'Zaznacz co chcesz zmienić — pojawią się opcje.';
            return;
        }

        var preserv = gv('e-preserve-all') || 'twarz, rysy, proporcje ciała';
        var avoid   = gv('e-avoid-all');
        var changes = [];

        /* Zbierz wszystkie zmiany jako naturalne frazy */
        if (checked.indexOf('bg') !== -1) {
            var indoor  = gv('e-bg-indoor');
            var outdoor = gv('e-bg-outdoor');
            var bgParts = [indoor, outdoor].filter(Boolean);
            if (bgParts.length > 0) changes.push('tło zmień na ' + bgParts.join(' lub '));
        }
        if (checked.indexOf('light') !== -1) {
            var src  = gv('e-light-source');
            var mood = gv('e-light-mood');
            var lparts = [src, mood].filter(Boolean);
            if (lparts.length > 0) changes.push('oświetlenie na ' + lparts.join(', '));
        }
        if (checked.indexOf('lens') !== -1) {
            var focal = gv('e-lens-focal');
            var dof   = gv('e-lens-dof');
            var lensP = [focal, dof].filter(Boolean);
            if (lensP.length > 0) changes.push('optykę na ' + lensP.join(', '));
        }
        if (checked.indexOf('weather') !== -1) {
            var wx = gv('e-weather-type');
            var fx = gv('e-film-effect');
            if (wx) changes.push('dodaj efekt atmosferyczny: ' + wx);
            if (fx) changes.push('efekt filmowy: ' + fx);
        }
        if (checked.indexOf('outfit') !== -1) {
            var otype  = gv('e-outfit-type');
            var ocolor = gv('e-outfit-color');
            var oparts = [otype, ocolor].filter(Boolean);
            if (oparts.length > 0) changes.push('strój zmień na ' + oparts.join(' '));
            else changes.push('zmień strój');
        }
        if (checked.indexOf('hair') !== -1) {
            var hs = gv('e-hair-style');
            var hc = gv('e-hair-color');
            var hparts = [];
            if (hs) hparts.push('fryzura: ' + hs);
            if (hc) hparts.push('kolor włosów: ' + hc);
            if (hparts.length > 0) changes.push(hparts.join(', '));
        }
        if (checked.indexOf('makeup') !== -1) {
            var mt = gv('e-makeup-type');
            var ml = gv('e-makeup-lips');
            var mparts = [];
            if (mt) mparts.push('makijaż: ' + mt);
            if (ml) mparts.push('usta: ' + ml);
            if (mparts.length > 0) changes.push(mparts.join(', '));
            else changes.push('zmień makijaż');
        }
        if (checked.indexOf('style') !== -1) {
            var st = gv('e-style-target');
            var si = gv('e-style-intensity');
            var sparts = [st, si].filter(Boolean);
            if (sparts.length > 0) changes.push('styl estetyczny na ' + sparts.join(', '));
        }
        if (checked.indexOf('colorgrade') !== -1) {
            var ct = gv('e-color-target');
            var ci = gv('e-color-intensity');
            var cparts = [ct, ci].filter(Boolean);
            if (cparts.length > 0) changes.push('paletę kolorów na ' + cparts.join(', '));
        }
        if (checked.indexOf('refresh') !== -1) {
            var qlist = [];
            var qs2 = gv('e-q-sharpness');  if (qs2) qlist.push(qs2);
            var qn2 = gv('e-q-noise');      if (qn2) qlist.push(qn2);
            var qe2 = gv('e-q-exposure');   if (qe2) qlist.push(qe2);
            var qsh2= gv('e-q-shadows');    if (qsh2) qlist.push(qsh2);
            var qhl2= gv('e-q-highlights'); if (qhl2) qlist.push(qhl2);
            var qc2 = gv('e-q-colorcast');  if (qc2) qlist.push(qc2);
            var qw2 = gv('e-q-whitebal');   if (qw2) qlist.push(qw2);
            var qsk2= gv('e-q-skintone');   if (qsk2) qlist.push(qsk2);
            var qr2 = gv('e-q-skinretuch'); if (qr2) qlist.push(qr2);
            if (qlist.length > 0) changes.push('popraw jakość: ' + qlist.join(', '));
            else changes.push('popraw ogólną jakość i ostrość');
        }
        if (checked.indexOf('remove') !== -1) {
            var rw = gv('e-remove-what');
            var rf = gv('e-remove-fill');
            if (rw) changes.push('usuń z tła: ' + rw + (rf ? ', uzupełniając ' + rf : ''));
        }
        if (checked.indexOf('cropchange') !== -1) {
            var cf = gv('e-crop-from');
            var ct2 = gv('e-crop-to');
            var dof = gv('e-crop-dof');
            if (cf && ct2) {
                changes.push('zmień kadr z "' + cf + '" na "' + ct2 + '"' + (dof ? ' — ' + dof : ''));
            } else if (ct2) {
                changes.push('zmień kadr na ' + ct2 + (dof ? ', ' + dof : ''));
            }
        }
        if (checked.indexOf('outfitseq') !== -1) {
            var count = gv('e-outfitseq-count') || '2';
            var s1 = gv('e-outfitseq-1');
            var s2 = gv('e-outfitseq-2');
            var s3 = gv('e-outfitseq-3');
            var s4 = gv('e-outfitseq-4');
            var sp = gv('e-outfitseq-preserve') || 'twarz, fryzura, tło, poza';
            var outfits = [s1, s2, s3, s4].filter(Boolean).slice(0, parseInt(count));
            if (outfits.length > 0) {
                changes.push('stwórz ' + outfits.length + ' wersje z różnymi strojami: ' + outfits.map(function(o, i) { return 'wersja ' + (i+1) + ': ' + o; }).join('; ') + ' — w każdej wersji zachowaj identyczne: ' + sp);
            }
        }

        /* Złóż w naturalny akapit */
        if (changes.length === 0) {
            result = 'Wybierz opcje które chcesz zmienić.';
        } else if (changes.length === 1) {
            result = 'Użyj przesłanego zdjęcia jako punktu odniesienia. Zachowaj dokładnie bez zmian: ' + preserv + '. ' + changes[0].charAt(0).toUpperCase() + changes[0].slice(1) + '. Wszystkie przejścia muszą wyglądać naturalnie i fotorealistycznie.' + (avoid ? ' Unikaj: ' + avoid + '.' : '');
        } else {
            var last = changes.pop();
            result = 'Użyj przesłanego zdjęcia jako punktu odniesienia. Zachowaj dokładnie bez zmian: ' + preserv + '. Zmień następujące elementy: ' + changes.join(', ') + ' oraz ' + last + '. Wszystkie przejścia i zmiany muszą wyglądać naturalnie — fotorealistyczna spójność oświetlenia, cieni i detali.' + (avoid ? ' Unikaj: ' + avoid + '.' : '');
        }

    } else if (currentMode === 'quality') {
        var qlist2 = [];
        var qs3  = gv('q-sharpness');   if (qs3)  qlist2.push(qs3);
        var qn3  = gv('q-noise');       if (qn3)  qlist2.push(qn3);
        var qe3  = gv('q-exposure');    if (qe3)  qlist2.push(qe3);
        var qsh3 = gv('q-shadows');     if (qsh3) qlist2.push(qsh3);
        var qhl3 = gv('q-highlights');  if (qhl3) qlist2.push(qhl3);
        var qc3  = gv('q-colorcast');   if (qc3)  qlist2.push(qc3);
        var qw3  = gv('q-whitebal');    if (qw3)  qlist2.push(qw3);
        var qsk3 = gv('q-skintone');    if (qsk3) qlist2.push(qsk3);
        var qr3  = gv('q-skinretuch');  if (qr3)  qlist2.push(qr3);
        var qh3  = gv('q-horizon');     if (qh3)  qlist2.push('wyprostowanie horyzontu');
        var qp3  = gv('q-perspective'); if (qp3)  qlist2.push(qp3);
        var av   = gv('q-avoid');

        if (qlist2.length === 0) {
            result = 'Wybierz parametry które chcesz poprawić.';
        } else {
            var last2 = qlist2.pop();
            var listStr = qlist2.length > 0 ? qlist2.join(', ') + ' oraz ' + last2 : last2;
            result = 'Popraw to zdjęcie dbając szczególnie o: ' + listStr + '. Zachowaj naturalny wygląd — skóra powinna mieć widoczną teksturę i pory, żadnego efektu plastiku ani przesadnego wygładzenia.' + (av ? ' Unikaj: ' + av + '.' : '');
        }
    }

    out.value = result;
}

/* ── event listeners ── */
['form-new', 'form-edit', 'form-quality'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
        el.addEventListener('input',  buildPrompt);
        el.addEventListener('change', buildPrompt);
    }
});

var bp = document.getElementById('build-prompt');
if (bp) bp.addEventListener('click', buildPrompt);

var cg = document.getElementById('copy-generated');
if (cg) cg.addEventListener('click', function() {
    var out = document.getElementById('prompt-output');
    if (out) copyText(out.value, cg);
});

/* ── expose to global scope for onclick handlers ── */
window.switchGenMode         = switchGenMode;
window.updateEditSections    = updateEditSections;
window.updateQualitySections = updateQualitySections;
window.setFilter             = setFilter;
window.buildPrompt           = buildPrompt;
window.selectTile            = selectTile;
window.toggleAdv             = toggleAdv;
window.applyPreset           = applyPreset;

/* ── init ── */
switchGenMode('new');
setFilter('all');
