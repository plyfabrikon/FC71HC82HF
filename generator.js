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
        refresh:'es-refresh', remove:'es-remove'
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
        var level   = gv('n-detail') || 'medium';
        var avoid   = gv('n-avoid');

        if (!p.isPerson && crop && (crop.indexOf('twarz') !== -1 || crop.indexOf('postać') !== -1)) crop = null;
        if (!p.isPerson && frame && frame.indexOf('85') !== -1) frame = null;

        var kadrowaInfo = [crop, frame].filter(Boolean).join(', ');

        if (level === 'short') {
            result = sentences(
                'Wygeneruj: ' + subject + ', ' + scene + '.',
                kadrowaInfo ? 'Kadr: ' + kadrowaInfo + '.' : null,
                'Oświetlenie: ' + light + '. Styl: ' + style + '.',
                avoid ? 'Unikaj: ' + avoid + '.' : null
            );
        } else {
            result = sentences(
                'Wygeneruj: ' + subject + '.',
                'Lokacja: ' + scene + '.',
                kadrowaInfo ? 'Kadr: ' + kadrowaInfo + '.' : null,
                'Oświetlenie: ' + light + '.',
                'Styl: ' + style + '.',
                effect ? 'Efekt: ' + effect + '.' : null,
                avoid ? 'Unikaj: ' + avoid + '.' : null
            );
        }

    } else if (currentMode === 'edit') {
        var checked = [];
        document.querySelectorAll('.edit-checks input:checked').forEach(function(i) {
            checked.push(i.value);
        });

        if (checked.length === 0) {
            out.value = 'Zaznacz co chcesz zmienić — pojawią się opcje.';
            return;
        }

        var level   = gv('e-detail') || 'medium';
        var preserv = gv('e-preserve-all') || 'twarz, rysy, proporcje';
        var avoid   = gv('e-avoid-all');
        var parts   = [];

        if (checked.indexOf('bg') !== -1) {
            var indoor  = gv('e-bg-indoor');
            var outdoor = gv('e-bg-outdoor');
            var scene   = [indoor, outdoor].filter(Boolean).join(' + ');
            if (scene) parts.push('Nowe tło: ' + scene + '.');
        }
        if (checked.indexOf('light') !== -1) {
            var src  = gv('e-light-source');
            var mood = gv('e-light-mood');
            var ld   = [src, mood].filter(Boolean).join(', ');
            if (ld) parts.push('Oświetlenie: ' + ld + '.');
        }
        if (checked.indexOf('lens') !== -1) {
            var focal = gv('e-lens-focal');
            var dof   = gv('e-lens-dof');
            var od    = [focal, dof].filter(Boolean).join(', ');
            if (od) parts.push('Optyka: ' + od + '.');
        }
        if (checked.indexOf('weather') !== -1) {
            var wx = gv('e-weather-type');
            var fx = gv('e-film-effect');
            if (wx) parts.push('Efekt atmosferyczny: ' + wx + '.');
            if (fx) parts.push('Efekt filmowy: ' + fx + '.');
        }
        if (checked.indexOf('outfit') !== -1) {
            var type  = gv('e-outfit-type');
            var color = gv('e-outfit-color');
            var od    = [type, color].filter(Boolean).join(' ');
            parts.push(od ? 'Zmień strój na: ' + od + '.' : 'Zmień strój.');
        }
        if (checked.indexOf('hair') !== -1) {
            var hs = gv('e-hair-style');
            var hc = gv('e-hair-color');
            if (hs) parts.push('Fryzura: ' + hs + '.');
            if (hc) parts.push('Kolor włosów: ' + hc + '.');
            if (!hs && !hc) parts.push('Zmień fryzurę.');
        }
        if (checked.indexOf('makeup') !== -1) {
            var mt = gv('e-makeup-type');
            var ml = gv('e-makeup-lips');
            if (mt) parts.push('Makijaż: ' + mt + '.');
            if (ml) parts.push('Usta: ' + ml + '.');
            if (!mt && !ml) parts.push('Zmień makijaż.');
        }
        if (checked.indexOf('style') !== -1) {
            var st = gv('e-style-target');
            var si = gv('e-style-intensity');
            var sd = [st, si].filter(Boolean).join(', ');
            if (sd) parts.push('Styl: ' + sd + '.');
        }
        if (checked.indexOf('colorgrade') !== -1) {
            var ct = gv('e-color-target');
            var ci = gv('e-color-intensity');
            var cd = [ct, ci].filter(Boolean).join(', ');
            if (cd) parts.push('Paleta kolorów: ' + cd + '.');
        }
        if (checked.indexOf('refresh') !== -1) {
            var qparts = [];
            var qs = gv('e-q-sharpness');   if (qs) qparts.push('wyostrzenie — ' + qs);
            var qn = gv('e-q-noise');       if (qn) qparts.push('redukcja szumów — ' + qn);
            var qe = gv('e-q-exposure');    if (qe) qparts.push('ekspozycja — ' + qe);
            var qsh= gv('e-q-shadows');     if (qsh) qparts.push('cienie — ' + qsh);
            var qhl= gv('e-q-highlights');  if (qhl) qparts.push('światła — ' + qhl);
            var qc = gv('e-q-colorcast');   if (qc) qparts.push('dominanta — ' + qc);
            var qw = gv('e-q-whitebal');    if (qw) qparts.push('balans bieli — ' + qw);
            var qsk= gv('e-q-skintone');    if (qsk) qparts.push('kolor skóry — ' + qsk);
            var qr = gv('e-q-skinretuch');  if (qr) qparts.push('retusz — ' + qr);
            var qh = gv('e-q-horizon');     if (qh) qparts.push('horyzont');
            var qp = gv('e-q-perspective'); if (qp) qparts.push('perspektywa — ' + qp);
            if (qparts.length > 0) {
                parts.push('Popraw jakość: ' + qparts.join('; ') + '.');
                parts.push('Zachowaj naturalny wygląd — bez efektu plastiku.');
            } else {
                parts.push('Popraw ogólną jakość i ostrość.');
            }
        }
        if (checked.indexOf('remove') !== -1) {
            var rw = gv('e-remove-what');
            var rf = gv('e-remove-fill');
            if (rw) parts.push('Usuń: ' + rw + '.');
            if (rf) parts.push('Uzupełnij: ' + rf + '.');
        }

        result = sentences.apply(null,
            ['Zachowaj: ' + preserv + '.']
            .concat(parts)
            .concat([avoid ? 'Unikaj: ' + avoid + '.' : null])
        );

    } else if (currentMode === 'quality') {
        var qparts = [];
        var qs  = gv('q-sharpness');   if (qs)  qparts.push('wyostrzenie — ' + qs);
        var qn  = gv('q-noise');       if (qn)  qparts.push('redukcja szumów — ' + qn);
        var qe  = gv('q-exposure');    if (qe)  qparts.push('ekspozycja — ' + qe);
        var qsh = gv('q-shadows');     if (qsh) qparts.push('cienie — ' + qsh);
        var qhl = gv('q-highlights');  if (qhl) qparts.push('światła — ' + qhl);
        var qc  = gv('q-colorcast');   if (qc)  qparts.push('dominanta — ' + qc);
        var qw  = gv('q-whitebal');    if (qw)  qparts.push('balans bieli — ' + qw);
        var qsk = gv('q-skintone');    if (qsk) qparts.push('kolor skóry — ' + qsk);
        var qr  = gv('q-skinretuch');  if (qr)  qparts.push('retusz — ' + qr);
        var qh  = gv('q-horizon');     if (qh)  qparts.push('wyprostowanie horyzontu');
        var qp  = gv('q-perspective'); if (qp)  qparts.push('perspektywa — ' + qp);
        var av  = gv('q-avoid');

        if (qparts.length === 0) {
            result = 'Wybierz parametry które chcesz poprawić.';
        } else {
            result = sentences(
                'Popraw jakość zdjęcia: ' + qparts.join('; ') + '.',
                'Zachowaj naturalny wygląd — bez efektu plastiku i przesadnej obróbki.',
                av ? 'Unikaj: ' + av + '.' : null
            );
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
