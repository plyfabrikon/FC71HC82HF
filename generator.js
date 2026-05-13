


    /* ── THEME SWITCHER ─────────────────────────────────── */
    const html = document.documentElement;
    const themeBtns = document.querySelectorAll('.theme-btn');
    const THEME_KEY = 'gemini-theme';

    function applyTheme(theme) {
      html.setAttribute('data-theme', theme);
      localStorage.setItem(THEME_KEY, theme);
      themeBtns.forEach(b => b.classList.toggle('active', b.dataset.themeTarget === theme));
    }

    // restore saved theme
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) applyTheme(savedTheme);

    themeBtns.forEach(b => b.addEventListener('click', () => applyTheme(b.dataset.themeTarget)));

    /* ── NAVBAR SCROLL ──────────────────────────────────── */

    /* ── FILTER BUTTONS ─────────────────────────────────── */
    const filterBtns = document.querySelectorAll('.filter-btn');
    const promptCards = document.querySelectorAll('.prompt-card');

    function setFilter(filter) {
      filterBtns.forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
      promptCards.forEach(card => {
        const tags = card.dataset.tags.split(' ');
        card.hidden = !(filter === 'all' || tags.includes(filter));
      });
    }

    filterBtns.forEach(b => b.addEventListener('click', () => setFilter(b.dataset.filter)));

    /* ── COPY UTILITY ───────────────────────────────────── */
    async function copyText(text, btn) {
      const orig = btn.innerHTML;
      const fallback = () => {
        const t = document.createElement('textarea');
        t.value = text;
        t.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
        document.body.appendChild(t);
        t.focus(); t.select();
        try { document.execCommand('copy'); } catch(e) {}
        t.remove();
      };
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(text).catch(fallback);
        } else {
          fallback();
        }
        btn.classList.add('copied');
        btn.innerHTML = '<i class="fas fa-check"></i> Skopiowano';
        setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = orig; }, 1800);
      } catch {
        fallback();
        btn.classList.add('copied');
        btn.innerHTML = '<i class="fas fa-check"></i> Skopiowano';
        setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = orig; }, 1800);
      }
    }

    document.querySelectorAll('.prompt-card .copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        copyText(btn.closest('.prompt-card').querySelector('.prompt-box').textContent.trim(), btn);
      });
    });

    document.getElementById('copy-generated').addEventListener('click', function() {
      copyText(document.getElementById('prompt-output').value, this);
    });

    /* ══ GENERATOR — nowy dual-mode ══════════════════════════ */

    const output = document.getElementById('prompt-output');
    let currentMode = 'new';

    /* ── przełączanie zakładek ── */
    function switchGenMode(mode) {
      currentMode = mode;
      document.getElementById('form-new').hidden     = (mode !== 'new');
      document.getElementById('form-edit').hidden    = (mode !== 'edit');
      document.getElementById('form-quality').hidden = (mode !== 'quality');
      document.getElementById('tab-new').classList.toggle('active',     mode === 'new');
      document.getElementById('tab-edit').classList.toggle('active',    mode === 'edit');
      document.getElementById('tab-quality').classList.toggle('active', mode === 'quality');
      buildPrompt();
    }

    /* ── pokaż sekcje edycji odpowiadające zaznaczonym checkboxom ── */
    function updateEditSections() {
      const checked = new Set(
        [...document.querySelectorAll('.edit-checks input:checked')].map(i => i.value)
      );
      const map = {
        bg: 'es-bg', light: 'es-light', lens: 'es-lens', weather: 'es-weather',
        outfit: 'es-outfit', hair: 'es-hair', makeup: 'es-makeup',
        style: 'es-style', painting: 'es-painting', colorgrade: 'es-colorgrade',
        refresh: 'es-refresh', remove: 'es-remove',
      };
      Object.entries(map).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (el) el.hidden = !checked.has(key);
      });
      buildPrompt();
    }

    /* ── helper: pobierz wartość, zwróć null jeśli puste ── */
    const v = id => { const el = document.getElementById(id); return el ? el.value.trim() || null : null; };

    /* ── NOWY OBRAZ — profil tematu ── */
    function getNewSubjectProfile() {
      switch (v('n-subject-type')) {
        case 'woman':  return { isPerson:true,  isScene:false, gen:'kobiety' };
        case 'man':    return { isPerson:true,  isScene:false, gen:'mężczyzny' };
        case 'person': return { isPerson:true,  isScene:false, gen:'osoby' };
        case 'scene':  return { isPerson:false, isScene:true,  gen:'sceny' };
        default:       return { isPerson:false, isScene:false, gen:'obiektu' };
      }
    }

    function getNewStyleLabel(p) {
      const s = v('n-style');
      const tbl = {
        'editorial-photo':  p.isPerson ? 'fotografia editorial, naturalna skóra' : 'fotografia editorial',
        'studio-photo':     p.isPerson ? 'fotografia studyjna' : 'fotografia studyjna, kontrolowane tło',
        'fashion-photo':    p.isPerson ? 'fotografia modowa high fashion' : 'fotografia lifestyle',
        'beauty-photo':     p.isPerson ? 'fotografia beauty, naturalna skóra' : 'fotografia beauty',
        'product-photo':    p.isScene  ? 'fotografia wnętrza' : 'fotografia produktowa',
        'street-photo':     'fotografia uliczna, dokumentalna',
        'lifestyle-photo':  p.isPerson ? 'fotografia lifestyle, naturalna' : 'fotografia lifestyle',
        'sport-photo':      'fotografia sportowa, dynamiczna',
        'food-photo':       'fotografia kulinarna premium',
        'arch-photo':       'fotografia architektoniczna',
        'portrait-photo':   'fotografia portretowa klasyczna',
        'luxury-campaign':  p.isPerson ? 'luksusowa kampania modowa' : 'luksusowa kampania produktowa',
        'fine-art':         'fine art fotografia artystyczna',
        'dark-moody':       'dark & moody, dramatyczna, głęboki kontrast',
        'light-airy':       'light & airy, jasna i zwiewna, miękka',
        'vintage-film':     'vintage, analogowy film, ziarno i ciepłe tony',
        'cyberpunk':        'cyberpunk, neonowy klimat, chłodne kolory',
        'minimalist':       'minimalistyczna, czysta kompozycja',
        'paper-cut':        'ilustracja paper-cut, warstwowy kolaż',
        'concept-art':      'filmowy concept art',
        'watercolor':       'akwarela, miękkie przejścia, ilustracja',
        'oil-painting':     'obraz olejny, klasyczna technika malarska',
      };
      return tbl[s] || 'fotografia realistyczna';
    }

    function getNewCrop(p) {
      const cv = v('n-crop'); if (!cv) return null;
      if (!p.isPerson && (cv.includes('twarz')||cv.includes('ramion')||cv.includes('pasa')||cv.includes('kolan')||cv.includes('postać'))) return null;
      if (p.isPerson && cv.includes('produkt')) return null;
      return cv;
    }
    function getNewFrame(p) { const fv = v('n-frame'); if (!fv) return null; if (!p.isPerson && fv.includes('85 mm')) return null; return fv; }
    function getNewEffect(p) { const ev = v('n-effect'); if (!ev) return null; if (!p.isPerson && ev.includes('kremowym')) return null; return ev; }

    function getNewConstraint(p) {
      switch (v('n-constraint')) {
        case 'clean':    return p.isPerson ? 'Naturalna skóra i proporcje. Kompozycja czysta.' : 'Kompozycja czysta, wysoka szczegółowość materiałów.';
        case 'identity': return p.isPerson ? `Rysy twarzy i charakter ${p.gen}: spójne.` : 'Kształt i proporcje obiektu: bez zmian.';
        case 'text':     return 'Tekst w kadrze: czytelny, zapisany dokładnie jak podano.';
        case 'pose':     return p.isPerson ? `Poza ${p.gen}: naturalna.` : 'Układ obiektu: stabilny.';
        default: return null;
      }
    }

    /* ══ BUILD PROMPT ════════════════════════════════════════ */
    function buildPrompt() {
      const join = (...pts) => pts.filter(Boolean).join(', ');
      const sentences = (...pts) => pts.filter(Boolean).join(' ');
      let result = '';

      if (currentMode === 'new') {
        const p       = getNewSubjectProfile();
        const subject = v('n-subject') || 'elegancki produkt';
        const scene   = v('n-scene');
        const light   = v('n-light');
        const style   = getNewStyleLabel(p);
        const crop    = getNewCrop(p);
        const frame   = getNewFrame(p);
        const effect  = getNewEffect(p);
        const constr  = getNewConstraint(p);
        const level   = v('n-detail') || 'medium';
        const avoid   = v('n-avoid');
        const kadrowaInfo = join(crop, frame);

        if (level === 'short') {
          result = sentences(
            `Wygeneruj: ${subject}, ${scene}.`,
            kadrowaInfo ? `Kadr: ${kadrowaInfo}.` : null,
            `Oświetlenie: ${light}. Styl: ${style}.`,
            avoid ? `Unikaj: ${avoid}.` : null
          );
        } else {
          const quality = p.isPerson ? 'Realizm: naturalna skóra, włosy, spójne proporcje.'
            : p.isScene ? 'Realizm: wiarygodne światło i głębia planów.'
            : 'Realizm: wiarygodne materiały i detale.';
          result = sentences(
            `Wygeneruj: ${subject}.`,
            `Lokacja: ${scene}.`,
            kadrowaInfo ? `Kadr: ${kadrowaInfo}.` : null,
            `Oświetlenie: ${light}.`,
            `Styl: ${style}.`,
            effect ? `Efekt: ${effect}.` : null,
            constr,
            level === 'detailed' ? quality : null,
            avoid ? `Unikaj: ${avoid}.` : null
          );
        }

      } else {
        /* ── EDYCJA — zbierz zaznaczone sekcje ── */
        const checked = new Set(
          [...document.querySelectorAll('.edit-checks input:checked')].map(i => i.value)
        );

        if (checked.size === 0) {
          output.value = 'Zaznacz co chcesz zmienić — pojawią się opcje do wyboru.';
          return;
        }

        const level   = v('e-detail') || 'medium';
        const preserv = v('e-preserve-all') || 'twarz, rysy, proporcje sylwetki';
        const avoid   = v('e-avoid-all');
        const parts   = [];

        /* TŁO */
        if (checked.has('bg')) {
          const indoor  = v('e-bg-indoor');
          const outdoor = v('e-bg-outdoor');
          const scene   = [indoor, outdoor].filter(Boolean).join(' + ');
          if (scene) parts.push(`Nowe tło: ${scene}.`);
        }

        /* OŚWIETLENIE */
        if (checked.has('light')) {
          const src  = v('e-light-source');
          const mood = v('e-light-mood');
          const ld   = [src, mood].filter(Boolean).join(', ');
          if (ld) parts.push(`Oświetlenie: ${ld}.`);
        }

        /* OBIEKTYW */
        if (checked.has('lens')) {
          const focal = v('e-lens-focal');
          const dof   = v('e-lens-dof');
          const od    = [focal, dof].filter(Boolean).join(', ');
          if (od) parts.push(`Optyka: ${od}.`);
        }

        /* EFEKTY ATMOSFERYCZNE */
        if (checked.has('weather')) {
          const wx  = v('e-weather-type');
          const fx  = v('e-film-effect');
          if (wx) parts.push(`Efekt atmosferyczny: ${wx}.`);
          if (fx) parts.push(`Efekt filmowy: ${fx}.`);
        }

        /* STRÓJ */
        if (checked.has('outfit')) {
          const type  = v('e-outfit-type');
          const color = v('e-outfit-color');
          const od    = [type, color].filter(Boolean).join(' ');
          if (od) parts.push(`Zmień strój na: ${od}.`);
          else    parts.push('Zmień strój / ubranie.');
        }

        /* WŁOSY */
        if (checked.has('hair')) {
          const hs = v('e-hair-style');
          const hc = v('e-hair-color');
          if (hs) parts.push(`Fryzura: ${hs}.`);
          if (hc) parts.push(`Kolor włosów: ${hc}.`);
          if (!hs && !hc) parts.push('Zmień fryzurę / kolor włosów.');
        }

        /* MAKIJAŻ */
        if (checked.has('makeup')) {
          const mt = v('e-makeup-type');
          const ml = v('e-makeup-lips');
          if (mt) parts.push(`Makijaż: ${mt}.`);
          if (ml) parts.push(`Usta: ${ml}.`);
          if (!mt && !ml) parts.push('Zmień makijaż.');
        }

        /* STYL */
        if (checked.has('style')) {
          const st = v('e-style-target');
          const si = v('e-style-intensity');
          const sd = [st, si].filter(Boolean).join(', ');
          if (sd) parts.push(`Styl zdjęcia: ${sd}.`);
        }

        /* OBRAZ / ILUSTRACJA */
        if (checked.has('painting')) {
          const pt = v('e-paint-style');
          const pp = v('e-paint-palette');
          if (pt) parts.push(`Przerenderuj jako: ${pt}.`);
          if (pp) parts.push(`Paleta: ${pp}.`);
          if (!pt) parts.push('Przerenderuj jako obraz / ilustrację.');
        }

        /* PALETA KOLORÓW */
        if (checked.has('colorgrade')) {
          const ct = v('e-color-target');
          const ci = v('e-color-intensity');
          const cd = [ct, ci].filter(Boolean).join(', ');
          if (cd) parts.push(`Paleta kolorów: ${cd}.`);
        }

        /* POPRAWA JAKOŚCI */
        if (checked.has('refresh')) {
          const sharpness   = v('e-q-sharpness');
          const noise       = v('e-q-noise');
          const exposure    = v('e-q-exposure');
          const shadows     = v('e-q-shadows');
          const highlights  = v('e-q-highlights');
          const colorcast   = v('e-q-colorcast');
          const whitebal    = v('e-q-whitebal');
          const skintone    = v('e-q-skintone');
          const skinretuch  = v('e-q-skinretuch');
          const horizon     = v('e-q-horizon');
          const perspective = v('e-q-perspective');

          const qparts = [];
          if (sharpness)   qparts.push(`wyostrzenie — ${sharpness}`);
          if (noise)       qparts.push(`redukcja szumów — ${noise}`);
          if (exposure)    qparts.push(`korekcja ekspozycji — ${exposure}`);
          if (shadows)     qparts.push(`odzyskanie detali w cieniach — ${shadows}`);
          if (highlights)  qparts.push(`odzyskanie detali w światłach — ${highlights}`);
          if (colorcast)   qparts.push(`korekcja dominanty kolorystycznej — ${colorcast}`);
          if (whitebal)    qparts.push(`wyważenie bieli — ${whitebal}`);
          if (skintone)    qparts.push(`naturalny kolor skóry — ${skintone}`);
          if (skinretuch)  qparts.push(`retusz skóry — ${skinretuch}`);
          if (horizon)     qparts.push('wyprostowanie horyzontu');
          if (perspective) qparts.push(`korekcja perspektywy — ${perspective}`);

          if (qparts.length > 0) {
            parts.push(`Popraw jakość zdjęcia: ${qparts.join('; ')}.`);
            parts.push('Zachowaj naturalny wygląd — bez efektu plastiku i przesadnej obróbki.');
          } else {
            parts.push('Popraw ogólną jakość i ostrość zdjęcia. Zachowaj naturalny wygląd.');
          }
        }

        /* USUŃ ELEMENTY */
        if (checked.has('remove')) {
          const rw = v('e-remove-what');
          const rf = v('e-remove-fill');
          if (rw) parts.push(`Usuń: ${rw}.`);
          if (rf) parts.push(`Uzupełnij: ${rf}.`);
        }

        const detailLine = level === 'detailed'
          ? 'Przejścia i spójność wszystkich zmian: naturalne, jednolite oświetlenie i cienie w całym kadrze.' : null;

        result = sentences(
          `Zachowaj: ${preserv}.`,
          ...parts,
          detailLine,
          avoid ? `Unikaj: ${avoid}.` : null
        );

      } else if (currentMode === 'quality') {
        /* ── POPRAWA JAKOŚCI — osobna zakładka ── */
        const qv = id => { const el = document.getElementById(id); return el ? el.value.trim() || null : null; };

        const sharpness   = qv('q-sharpness');
        const noise       = qv('q-noise');
        const exposure    = qv('q-exposure');
        const shadows     = qv('q-shadows');
        const highlights  = qv('q-highlights');
        const colorcast   = qv('q-colorcast');
        const whitebal    = qv('q-whitebal');
        const skintone    = qv('q-skintone');
        const skinretuch  = qv('q-skinretuch');
        const horizon     = qv('q-horizon');
        const perspective = qv('q-perspective');
        const level       = qv('q-detail') || 'medium';
        const avoid       = qv('q-avoid');

        const qparts = [];
        if (sharpness)   qparts.push(`wyostrzenie — ${sharpness}`);
        if (noise)       qparts.push(`redukcja szumów — ${noise}`);
        if (exposure)    qparts.push(`korekcja ekspozycji — ${exposure}`);
        if (shadows)     qparts.push(`odzyskanie detali w cieniach — ${shadows}`);
        if (highlights)  qparts.push(`odzyskanie detali w światłach — ${highlights}`);
        if (colorcast)   qparts.push(`korekcja dominanty — ${colorcast}`);
        if (whitebal)    qparts.push(`wyważenie bieli — ${whitebal}`);
        if (skintone)    qparts.push(`kolor skóry — ${skintone}`);
        if (skinretuch)  qparts.push(`retusz skóry — ${skinretuch}`);
        if (horizon)     qparts.push('wyprostowanie horyzontu');
        if (perspective) qparts.push(`korekcja perspektywy — ${perspective}`);

        if (qparts.length === 0) {
          result = 'Wybierz parametry które chcesz poprawić.';
        } else {
          const detailLine = level === 'detailed'
            ? 'Zachowaj naturalną teksturę skóry i szczegóły materiałów. Żaden efekt nie może wyglądać sztucznie.' : null;
          result = sentences(
            `Popraw jakość zdjęcia: ${qparts.join('; ')}.`,
            'Zachowaj naturalny wygląd — bez efektu plastiku i przesadnej obróbki.',
            detailLine,
            avoid ? `Unikaj: ${avoid}.` : null
          );
        }
      }

      output.value = result;
    }

    /* ── auto-update ── */
    document.getElementById('form-new').addEventListener('input',     buildPrompt);
    document.getElementById('form-new').addEventListener('change',    buildPrompt);
    document.getElementById('form-edit').addEventListener('input',    buildPrompt);
    document.getElementById('form-edit').addEventListener('change',   buildPrompt);
    document.getElementById('form-quality').addEventListener('input',  buildPrompt);
    document.getElementById('form-quality').addEventListener('change', buildPrompt);
    document.getElementById('build-prompt').addEventListener('click', buildPrompt);

    /* ── init ── */
    switchGenMode('new');
    setFilter('all');

    /* ── NAVBAR SCROLL ── */
    window.addEventListener('scroll', function() {
      var header = document.getElementById('header');
      if (header) {
        if (window.scrollY > 50) {
          header.style.background = 'rgba(23,18,35,0.95)';
        } else {
          header.style.background = '';
        }
      }
    });

    async function copyText(text, btn) {
      const orig = btn.innerHTML;
      const fallback = () => {
        const t = document.createElement('textarea');
        t.value = text;
        t.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
        document.body.appendChild(t);
        t.focus(); t.select();
        try { document.execCommand('copy'); } catch(e) {}
        t.remove();
      };
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(text).catch(fallback);
        } else {
          fallback();
        }
        btn.classList.add('copied');
        btn.innerHTML = '<i class="fas fa-check"></i> Skopiowano';
        setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = orig; }, 1800);
      } catch {
        fallback();
        btn.classList.add('copied');
        btn.innerHTML = '<i class="fas fa-check"></i> Skopiowano';
        setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = orig; }, 1800);
      }
    }

    document.querySelectorAll('.prompt-card .copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        copyText(btn.closest('.prompt-card').querySelector('.prompt-box').textContent.trim(), btn);
      });
    });

    document.getElementById('copy-generated').addEventListener('click', function() {
      copyText(document.getElementById('prompt-output').value, this);
    });

    /* ══ GENERATOR — nowy dual-mode ══════════════════════════ */

    const output = document.getElementById('prompt-output');
    let currentMode = 'new';

    /* ── przełączanie zakładek ── */
    function switchGenMode(mode) {
      currentMode = mode;
      document.getElementById('form-new').hidden     = (mode !== 'new');
      document.getElementById('form-edit').hidden    = (mode !== 'edit');
      document.getElementById('form-quality').hidden = (mode !== 'quality');
      document.getElementById('tab-new').classList.toggle('active',     mode === 'new');
      document.getElementById('tab-edit').classList.toggle('active',    mode === 'edit');
      document.getElementById('tab-quality').classList.toggle('active', mode === 'quality');
      buildPrompt();
    }

    /* ── pokaż sekcje edycji odpowiadające zaznaczonym checkboxom ── */
    function updateEditSections() {
      const checked = new Set(
        [...document.querySelectorAll('.edit-checks input:checked')].map(i => i.value)
      );
      const map = {
        bg: 'es-bg', light: 'es-light', lens: 'es-lens', weather: 'es-weather',
        outfit: 'es-outfit', hair: 'es-hair', makeup: 'es-makeup',
        style: 'es-style', painting: 'es-painting', colorgrade: 'es-colorgrade',
        refresh: 'es-refresh', remove: 'es-remove',
      };
      Object.entries(map).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (el) el.hidden = !checked.has(key);
      });
      buildPrompt();
    }

    /* ── helper: pobierz wartość, zwróć null jeśli puste ── */
    const v = id => { const el = document.getElementById(id); return el ? el.value.trim() || null : null; };

    /* ── NOWY OBRAZ — profil tematu ── */
    function getNewSubjectProfile() {
      switch (v('n-subject-type')) {
        case 'woman':  return { isPerson:true,  isScene:false, gen:'kobiety' };
        case 'man':    return { isPerson:true,  isScene:false, gen:'mężczyzny' };
        case 'person': return { isPerson:true,  isScene:false, gen:'osoby' };
        case 'scene':  return { isPerson:false, isScene:true,  gen:'sceny' };
        default:       return { isPerson:false, isScene:false, gen:'obiektu' };
      }
    }

    function getNewStyleLabel(p) {
      const s = v('n-style');
      const tbl = {
        'editorial-photo':  p.isPerson ? 'fotografia editorial, naturalna skóra' : 'fotografia editorial',
        'studio-photo':     p.isPerson ? 'fotografia studyjna' : 'fotografia studyjna, kontrolowane tło',
        'fashion-photo':    p.isPerson ? 'fotografia modowa high fashion' : 'fotografia lifestyle',
        'beauty-photo':     p.isPerson ? 'fotografia beauty, naturalna skóra' : 'fotografia beauty',
        'product-photo':    p.isScene  ? 'fotografia wnętrza' : 'fotografia produktowa',
        'street-photo':     'fotografia uliczna, dokumentalna',
        'lifestyle-photo':  p.isPerson ? 'fotografia lifestyle, naturalna' : 'fotografia lifestyle',
        'sport-photo':      'fotografia sportowa, dynamiczna',
        'food-photo':       'fotografia kulinarna premium',
        'arch-photo':       'fotografia architektoniczna',
        'portrait-photo':   'fotografia portretowa klasyczna',
        'luxury-campaign':  p.isPerson ? 'luksusowa kampania modowa' : 'luksusowa kampania produktowa',
        'fine-art':         'fine art fotografia artystyczna',
        'dark-moody':       'dark & moody, dramatyczna, głęboki kontrast',
        'light-airy':       'light & airy, jasna i zwiewna, miękka',
        'vintage-film':     'vintage, analogowy film, ziarno i ciepłe tony',
        'cyberpunk':        'cyberpunk, neonowy klimat, chłodne kolory',
        'minimalist':       'minimalistyczna, czysta kompozycja',
        'paper-cut':        'ilustracja paper-cut, warstwowy kolaż',
        'concept-art':      'filmowy concept art',
        'watercolor':       'akwarela, miękkie przejścia, ilustracja',
        'oil-painting':     'obraz olejny, klasyczna technika malarska',
      };
      return tbl[s] || 'fotografia realistyczna';
    }

    function getNewCrop(p) {
      const cv = v('n-crop'); if (!cv) return null;
      if (!p.isPerson && (cv.includes('twarz')||cv.includes('ramion')||cv.includes('pasa')||cv.includes('kolan')||cv.includes('postać'))) return null;
      if (p.isPerson && cv.includes('produkt')) return null;
      return cv;
    }
    function getNewFrame(p) { const fv = v('n-frame'); if (!fv) return null; if (!p.isPerson && fv.includes('85 mm')) return null; return fv; }
    function getNewEffect(p) { const ev = v('n-effect'); if (!ev) return null; if (!p.isPerson && ev.includes('kremowym')) return null; return ev; }

    function getNewConstraint(p) {
      switch (v('n-constraint')) {
        case 'clean':    return p.isPerson ? 'Naturalna skóra i proporcje. Kompozycja czysta.' : 'Kompozycja czysta, wysoka szczegółowość materiałów.';
        case 'identity': return p.isPerson ? `Rysy twarzy i charakter ${p.gen}: spójne.` : 'Kształt i proporcje obiektu: bez zmian.';
        case 'text':     return 'Tekst w kadrze: czytelny, zapisany dokładnie jak podano.';
        case 'pose':     return p.isPerson ? `Poza ${p.gen}: naturalna.` : 'Układ obiektu: stabilny.';
        default: return null;
      }
    }

    /* ══ BUILD PROMPT ════════════════════════════════════════ */
    function buildPrompt() {
      const join = (...pts) => pts.filter(Boolean).join(', ');
      const sentences = (...pts) => pts.filter(Boolean).join(' ');
      let result = '';

      if (currentMode === 'new') {
        const p       = getNewSubjectProfile();
        const subject = v('n-subject') || 'elegancki produkt';
        const scene   = v('n-scene');
        const light   = v('n-light');
        const style   = getNewStyleLabel(p);
        const crop    = getNewCrop(p);
        const frame   = getNewFrame(p);
        const effect  = getNewEffect(p);
        const constr  = getNewConstraint(p);
        const level   = v('n-detail') || 'medium';
        const avoid   = v('n-avoid');
        const kadrowaInfo = join(crop, frame);

        if (level === 'short') {
          result = sentences(
            `Wygeneruj: ${subject}, ${scene}.`,
            kadrowaInfo ? `Kadr: ${kadrowaInfo}.` : null,
            `Oświetlenie: ${light}. Styl: ${style}.`,
            avoid ? `Unikaj: ${avoid}.` : null
          );
        } else {
          const quality = p.isPerson ? 'Realizm: naturalna skóra, włosy, spójne proporcje.'
            : p.isScene ? 'Realizm: wiarygodne światło i głębia planów.'
            : 'Realizm: wiarygodne materiały i detale.';
          result = sentences(
            `Wygeneruj: ${subject}.`,
            `Lokacja: ${scene}.`,
            kadrowaInfo ? `Kadr: ${kadrowaInfo}.` : null,
            `Oświetlenie: ${light}.`,
            `Styl: ${style}.`,
            effect ? `Efekt: ${effect}.` : null,
            constr,
            level === 'detailed' ? quality : null,
            avoid ? `Unikaj: ${avoid}.` : null
          );
        }

      } else {
        /* ── EDYCJA — zbierz zaznaczone sekcje ── */
        const checked = new Set(
          [...document.querySelectorAll('.edit-checks input:checked')].map(i => i.value)
        );

        if (checked.size === 0) {
          output.value = 'Zaznacz co chcesz zmienić — pojawią się opcje do wyboru.';
          return;
        }

        const level   = v('e-detail') || 'medium';
        const preserv = v('e-preserve-all') || 'twarz, rysy, proporcje sylwetki';
        const avoid   = v('e-avoid-all');
        const parts   = [];

        /* TŁO */
        if (checked.has('bg')) {
          const indoor  = v('e-bg-indoor');
          const outdoor = v('e-bg-outdoor');
          const scene   = [indoor, outdoor].filter(Boolean).join(' + ');
          if (scene) parts.push(`Nowe tło: ${scene}.`);
        }

        /* OŚWIETLENIE */
        if (checked.has('light')) {
          const src  = v('e-light-source');
          const mood = v('e-light-mood');
          const ld   = [src, mood].filter(Boolean).join(', ');
          if (ld) parts.push(`Oświetlenie: ${ld}.`);
        }

        /* OBIEKTYW */
        if (checked.has('lens')) {
          const focal = v('e-lens-focal');
          const dof   = v('e-lens-dof');
          const od    = [focal, dof].filter(Boolean).join(', ');
          if (od) parts.push(`Optyka: ${od}.`);
        }

        /* EFEKTY ATMOSFERYCZNE */
        if (checked.has('weather')) {
          const wx  = v('e-weather-type');
          const fx  = v('e-film-effect');
          if (wx) parts.push(`Efekt atmosferyczny: ${wx}.`);
          if (fx) parts.push(`Efekt filmowy: ${fx}.`);
        }

        /* STRÓJ */
        if (checked.has('outfit')) {
          const type  = v('e-outfit-type');
          const color = v('e-outfit-color');
          const od    = [type, color].filter(Boolean).join(' ');
          if (od) parts.push(`Zmień strój na: ${od}.`);
          else    parts.push('Zmień strój / ubranie.');
        }

        /* WŁOSY */
        if (checked.has('hair')) {
          const hs = v('e-hair-style');
          const hc = v('e-hair-color');
          if (hs) parts.push(`Fryzura: ${hs}.`);
          if (hc) parts.push(`Kolor włosów: ${hc}.`);
          if (!hs && !hc) parts.push('Zmień fryzurę / kolor włosów.');
        }

        /* MAKIJAŻ */
        if (checked.has('makeup')) {
          const mt = v('e-makeup-type');
          const ml = v('e-makeup-lips');
          if (mt) parts.push(`Makijaż: ${mt}.`);
          if (ml) parts.push(`Usta: ${ml}.`);
          if (!mt && !ml) parts.push('Zmień makijaż.');
        }

        /* STYL */
        if (checked.has('style')) {
          const st = v('e-style-target');
          const si = v('e-style-intensity');
          const sd = [st, si].filter(Boolean).join(', ');
          if (sd) parts.push(`Styl zdjęcia: ${sd}.`);
        }

        /* OBRAZ / ILUSTRACJA */
        if (checked.has('painting')) {
          const pt = v('e-paint-style');
          const pp = v('e-paint-palette');
          if (pt) parts.push(`Przerenderuj jako: ${pt}.`);
          if (pp) parts.push(`Paleta: ${pp}.`);
          if (!pt) parts.push('Przerenderuj jako obraz / ilustrację.');
        }

        /* PALETA KOLORÓW */
        if (checked.has('colorgrade')) {
          const ct = v('e-color-target');
          const ci = v('e-color-intensity');
          const cd = [ct, ci].filter(Boolean).join(', ');
          if (cd) parts.push(`Paleta kolorów: ${cd}.`);
        }

        /* POPRAWA JAKOŚCI */
        if (checked.has('refresh')) {
          const sharpness   = v('e-q-sharpness');
          const noise       = v('e-q-noise');
          const exposure    = v('e-q-exposure');
          const shadows     = v('e-q-shadows');
          const highlights  = v('e-q-highlights');
          const colorcast   = v('e-q-colorcast');
          const whitebal    = v('e-q-whitebal');
          const skintone    = v('e-q-skintone');
          const skinretuch  = v('e-q-skinretuch');
          const horizon     = v('e-q-horizon');
          const perspective = v('e-q-perspective');

          const qparts = [];
          if (sharpness)   qparts.push(`wyostrzenie — ${sharpness}`);
          if (noise)       qparts.push(`redukcja szumów — ${noise}`);
          if (exposure)    qparts.push(`korekcja ekspozycji — ${exposure}`);
          if (shadows)     qparts.push(`odzyskanie detali w cieniach — ${shadows}`);
          if (highlights)  qparts.push(`odzyskanie detali w światłach — ${highlights}`);
          if (colorcast)   qparts.push(`korekcja dominanty kolorystycznej — ${colorcast}`);
          if (whitebal)    qparts.push(`wyważenie bieli — ${whitebal}`);
          if (skintone)    qparts.push(`naturalny kolor skóry — ${skintone}`);
          if (skinretuch)  qparts.push(`retusz skóry — ${skinretuch}`);
          if (horizon)     qparts.push('wyprostowanie horyzontu');
          if (perspective) qparts.push(`korekcja perspektywy — ${perspective}`);

          if (qparts.length > 0) {
            parts.push(`Popraw jakość zdjęcia: ${qparts.join('; ')}.`);
            parts.push('Zachowaj naturalny wygląd — bez efektu plastiku i przesadnej obróbki.');
          } else {
            parts.push('Popraw ogólną jakość i ostrość zdjęcia. Zachowaj naturalny wygląd.');
          }
        }

        /* USUŃ ELEMENTY */
        if (checked.has('remove')) {
          const rw = v('e-remove-what');
          const rf = v('e-remove-fill');
          if (rw) parts.push(`Usuń: ${rw}.`);
          if (rf) parts.push(`Uzupełnij: ${rf}.`);
        }

        const detailLine = level === 'detailed'
          ? 'Przejścia i spójność wszystkich zmian: naturalne, jednolite oświetlenie i cienie w całym kadrze.' : null;

        result = sentences(
          `Zachowaj: ${preserv}.`,
          ...parts,
          detailLine,
          avoid ? `Unikaj: ${avoid}.` : null
        );

      } else if (currentMode === 'quality') {
        /* ── POPRAWA JAKOŚCI — osobna zakładka ── */
        const qv = id => { const el = document.getElementById(id); return el ? el.value.trim() || null : null; };

        const sharpness   = qv('q-sharpness');
        const noise       = qv('q-noise');
        const exposure    = qv('q-exposure');
        const shadows     = qv('q-shadows');
        const highlights  = qv('q-highlights');
        const colorcast   = qv('q-colorcast');
        const whitebal    = qv('q-whitebal');
        const skintone    = qv('q-skintone');
        const skinretuch  = qv('q-skinretuch');
        const horizon     = qv('q-horizon');
        const perspective = qv('q-perspective');
        const level       = qv('q-detail') || 'medium';
        const avoid       = qv('q-avoid');

        const qparts = [];
        if (sharpness)   qparts.push(`wyostrzenie — ${sharpness}`);
        if (noise)       qparts.push(`redukcja szumów — ${noise}`);
        if (exposure)    qparts.push(`korekcja ekspozycji — ${exposure}`);
        if (shadows)     qparts.push(`odzyskanie detali w cieniach — ${shadows}`);
        if (highlights)  qparts.push(`odzyskanie detali w światłach — ${highlights}`);
        if (colorcast)   qparts.push(`korekcja dominanty — ${colorcast}`);
        if (whitebal)    qparts.push(`wyważenie bieli — ${whitebal}`);
        if (skintone)    qparts.push(`kolor skóry — ${skintone}`);
        if (skinretuch)  qparts.push(`retusz skóry — ${skinretuch}`);
        if (horizon)     qparts.push('wyprostowanie horyzontu');
        if (perspective) qparts.push(`korekcja perspektywy — ${perspective}`);

        if (qparts.length === 0) {
          result = 'Wybierz parametry które chcesz poprawić.';
        } else {
          const detailLine = level === 'detailed'
            ? 'Zachowaj naturalną teksturę skóry i szczegóły materiałów. Żaden efekt nie może wyglądać sztucznie.' : null;
          result = sentences(
            `Popraw jakość zdjęcia: ${qparts.join('; ')}.`,
            'Zachowaj naturalny wygląd — bez efektu plastiku i przesadnej obróbki.',
            detailLine,
            avoid ? `Unikaj: ${avoid}.` : null
          );
        }
      }

      output.value = result;
    }

    /* ── auto-update ── */
    document.getElementById('form-new').addEventListener('input',     buildPrompt);
    document.getElementById('form-new').addEventListener('change',    buildPrompt);
    document.getElementById('form-edit').addEventListener('input',    buildPrompt);
    document.getElementById('form-edit').addEventListener('change',   buildPrompt);
    document.getElementById('form-quality').addEventListener('input',  buildPrompt);
    document.getElementById('form-quality').addEventListener('change', buildPrompt);
    document.getElementById('build-prompt').addEventListener('click', buildPrompt);

    /* ── init ── */
    switchGenMode('new');
    setFilter('all');

    /* ── NAVBAR SCROLL ── */
    window.addEventListener('scroll', function() {
      var header = document.getElementById('header');
      if (header) {
        if (window.scrollY > 50) {
          header.style.background = 'rgba(23,18,35,0.95)';
        } else {
          header.style.background = '';
        }
      }
    });
    async function copyText(text, btn) {
      const orig = btn.innerHTML;
      const fallback = () => {
        const t = document.createElement('textarea');
        t.value = text;
        t.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
        document.body.appendChild(t);
        t.focus(); t.select();
        try { document.execCommand('copy'); } catch(e) {}
        t.remove();
      };
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(text).catch(fallback);
        } else {
          fallback();
        }
        btn.classList.add('copied');
        btn.innerHTML = '<i class="fas fa-check"></i> Skopiowano';
        setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = orig; }, 1800);
      } catch {
        fallback();
        btn.classList.add('copied');
        btn.innerHTML = '<i class="fas fa-check"></i> Skopiowano';
        setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = orig; }, 1800);
      }
    }

    document.querySelectorAll('.prompt-card .copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        copyText(btn.closest('.prompt-card').querySelector('.prompt-box').textContent.trim(), btn);
      });
    });

    document.getElementById('copy-generated').addEventListener('click', function() {
      copyText(document.getElementById('prompt-output').value, this);
    });

    /* ══ GENERATOR — nowy dual-mode ══════════════════════════ */

    const output = document.getElementById('prompt-output');
    let currentMode = 'new';

    /* ── przełączanie zakładek ── */
    function switchGenMode(mode) {
      currentMode = mode;
      document.getElementById('form-new').hidden     = (mode !== 'new');
      document.getElementById('form-edit').hidden    = (mode !== 'edit');
      document.getElementById('form-quality').hidden = (mode !== 'quality');
      document.getElementById('tab-new').classList.toggle('active',     mode === 'new');
      document.getElementById('tab-edit').classList.toggle('active',    mode === 'edit');
      document.getElementById('tab-quality').classList.toggle('active', mode === 'quality');
      buildPrompt();
    }

    /* ── pokaż sekcje edycji odpowiadające zaznaczonym checkboxom ── */
    function updateEditSections() {
      const checked = new Set(
        [...document.querySelectorAll('.edit-checks input:checked')].map(i => i.value)
      );
      const map = {
        bg: 'es-bg', light: 'es-light', lens: 'es-lens', weather: 'es-weather',
        outfit: 'es-outfit', hair: 'es-hair', makeup: 'es-makeup',
        style: 'es-style', painting: 'es-painting', colorgrade: 'es-colorgrade',
        refresh: 'es-refresh', remove: 'es-remove',
      };
      Object.entries(map).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (el) el.hidden = !checked.has(key);
      });
      buildPrompt();
    }

    /* ── helper: pobierz wartość, zwróć null jeśli puste ── */
    const v = id => { const el = document.getElementById(id); return el ? el.value.trim() || null : null; };

    /* ── NOWY OBRAZ — profil tematu ── */
    function getNewSubjectProfile() {
      switch (v('n-subject-type')) {
        case 'woman':  return { isPerson:true,  isScene:false, gen:'kobiety' };
        case 'man':    return { isPerson:true,  isScene:false, gen:'mężczyzny' };
        case 'person': return { isPerson:true,  isScene:false, gen:'osoby' };
        case 'scene':  return { isPerson:false, isScene:true,  gen:'sceny' };
        default:       return { isPerson:false, isScene:false, gen:'obiektu' };
      }
    }

    function getNewStyleLabel(p) {
      const s = v('n-style');
      const tbl = {
        'editorial-photo':  p.isPerson ? 'fotografia editorial, naturalna skóra' : 'fotografia editorial',
        'studio-photo':     p.isPerson ? 'fotografia studyjna' : 'fotografia studyjna, kontrolowane tło',
        'fashion-photo':    p.isPerson ? 'fotografia modowa high fashion' : 'fotografia lifestyle',
        'beauty-photo':     p.isPerson ? 'fotografia beauty, naturalna skóra' : 'fotografia beauty',
        'product-photo':    p.isScene  ? 'fotografia wnętrza' : 'fotografia produktowa',
        'street-photo':     'fotografia uliczna, dokumentalna',
        'lifestyle-photo':  p.isPerson ? 'fotografia lifestyle, naturalna' : 'fotografia lifestyle',
        'sport-photo':      'fotografia sportowa, dynamiczna',
        'food-photo':       'fotografia kulinarna premium',
        'arch-photo':       'fotografia architektoniczna',
        'portrait-photo':   'fotografia portretowa klasyczna',
        'luxury-campaign':  p.isPerson ? 'luksusowa kampania modowa' : 'luksusowa kampania produktowa',
        'fine-art':         'fine art fotografia artystyczna',
        'dark-moody':       'dark & moody, dramatyczna, głęboki kontrast',
        'light-airy':       'light & airy, jasna i zwiewna, miękka',
        'vintage-film':     'vintage, analogowy film, ziarno i ciepłe tony',
        'cyberpunk':        'cyberpunk, neonowy klimat, chłodne kolory',
        'minimalist':       'minimalistyczna, czysta kompozycja',
        'paper-cut':        'ilustracja paper-cut, warstwowy kolaż',
        'concept-art':      'filmowy concept art',
        'watercolor':       'akwarela, miękkie przejścia, ilustracja',
        'oil-painting':     'obraz olejny, klasyczna technika malarska',
      };
      return tbl[s] || 'fotografia realistyczna';
    }

    function getNewCrop(p) {
      const cv = v('n-crop'); if (!cv) return null;
      if (!p.isPerson && (cv.includes('twarz')||cv.includes('ramion')||cv.includes('pasa')||cv.includes('kolan')||cv.includes('postać'))) return null;
      if (p.isPerson && cv.includes('produkt')) return null;
      return cv;
    }
    function getNewFrame(p) { const fv = v('n-frame'); if (!fv) return null; if (!p.isPerson && fv.includes('85 mm')) return null; return fv; }
    function getNewEffect(p) { const ev = v('n-effect'); if (!ev) return null; if (!p.isPerson && ev.includes('kremowym')) return null; return ev; }

    function getNewConstraint(p) {
      switch (v('n-constraint')) {
        case 'clean':    return p.isPerson ? 'Naturalna skóra i proporcje. Kompozycja czysta.' : 'Kompozycja czysta, wysoka szczegółowość materiałów.';
        case 'identity': return p.isPerson ? `Rysy twarzy i charakter ${p.gen}: spójne.` : 'Kształt i proporcje obiektu: bez zmian.';
        case 'text':     return 'Tekst w kadrze: czytelny, zapisany dokładnie jak podano.';
        case 'pose':     return p.isPerson ? `Poza ${p.gen}: naturalna.` : 'Układ obiektu: stabilny.';
        default: return null;
      }
    }

    /* ══ BUILD PROMPT ════════════════════════════════════════ */
    function buildPrompt() {
      const join = (...pts) => pts.filter(Boolean).join(', ');
      const sentences = (...pts) => pts.filter(Boolean).join(' ');
      let result = '';

      if (currentMode === 'new') {
        const p       = getNewSubjectProfile();
        const subject = v('n-subject') || 'elegancki produkt';
        const scene   = v('n-scene');
        const light   = v('n-light');
        const style   = getNewStyleLabel(p);
        const crop    = getNewCrop(p);
        const frame   = getNewFrame(p);
        const effect  = getNewEffect(p);
        const constr  = getNewConstraint(p);
        const level   = v('n-detail') || 'medium';
        const avoid   = v('n-avoid');
        const kadrowaInfo = join(crop, frame);

        if (level === 'short') {
          result = sentences(
            `Wygeneruj: ${subject}, ${scene}.`,
            kadrowaInfo ? `Kadr: ${kadrowaInfo}.` : null,
            `Oświetlenie: ${light}. Styl: ${style}.`,
            avoid ? `Unikaj: ${avoid}.` : null
          );
        } else {
          const quality = p.isPerson ? 'Realizm: naturalna skóra, włosy, spójne proporcje.'
            : p.isScene ? 'Realizm: wiarygodne światło i głębia planów.'
            : 'Realizm: wiarygodne materiały i detale.';
          result = sentences(
            `Wygeneruj: ${subject}.`,
            `Lokacja: ${scene}.`,
            kadrowaInfo ? `Kadr: ${kadrowaInfo}.` : null,
            `Oświetlenie: ${light}.`,
            `Styl: ${style}.`,
            effect ? `Efekt: ${effect}.` : null,
            constr,
            level === 'detailed' ? quality : null,
            avoid ? `Unikaj: ${avoid}.` : null
          );
        }

      } else {
        /* ── EDYCJA — zbierz zaznaczone sekcje ── */
        const checked = new Set(
          [...document.querySelectorAll('.edit-checks input:checked')].map(i => i.value)
        );

        if (checked.size === 0) {
          output.value = 'Zaznacz co chcesz zmienić — pojawią się opcje do wyboru.';
          return;
        }

        const level   = v('e-detail') || 'medium';
        const preserv = v('e-preserve-all') || 'twarz, rysy, proporcje sylwetki';
        const avoid   = v('e-avoid-all');
        const parts   = [];

        /* TŁO */
        if (checked.has('bg')) {
          const indoor  = v('e-bg-indoor');
          const outdoor = v('e-bg-outdoor');
          const scene   = [indoor, outdoor].filter(Boolean).join(' + ');
          if (scene) parts.push(`Nowe tło: ${scene}.`);
        }

        /* OŚWIETLENIE */
        if (checked.has('light')) {
          const src  = v('e-light-source');
          const mood = v('e-light-mood');
          const ld   = [src, mood].filter(Boolean).join(', ');
          if (ld) parts.push(`Oświetlenie: ${ld}.`);
        }

        /* OBIEKTYW */
        if (checked.has('lens')) {
          const focal = v('e-lens-focal');
          const dof   = v('e-lens-dof');
          const od    = [focal, dof].filter(Boolean).join(', ');
          if (od) parts.push(`Optyka: ${od}.`);
        }

        /* EFEKTY ATMOSFERYCZNE */
        if (checked.has('weather')) {
          const wx  = v('e-weather-type');
          const fx  = v('e-film-effect');
          if (wx) parts.push(`Efekt atmosferyczny: ${wx}.`);
          if (fx) parts.push(`Efekt filmowy: ${fx}.`);
        }

        /* STRÓJ */
        if (checked.has('outfit')) {
          const type  = v('e-outfit-type');
          const color = v('e-outfit-color');
          const od    = [type, color].filter(Boolean).join(' ');
          if (od) parts.push(`Zmień strój na: ${od}.`);
          else    parts.push('Zmień strój / ubranie.');
        }

        /* WŁOSY */
        if (checked.has('hair')) {
          const hs = v('e-hair-style');
          const hc = v('e-hair-color');
          if (hs) parts.push(`Fryzura: ${hs}.`);
          if (hc) parts.push(`Kolor włosów: ${hc}.`);
          if (!hs && !hc) parts.push('Zmień fryzurę / kolor włosów.');
        }

        /* MAKIJAŻ */
        if (checked.has('makeup')) {
          const mt = v('e-makeup-type');
          const ml = v('e-makeup-lips');
          if (mt) parts.push(`Makijaż: ${mt}.`);
          if (ml) parts.push(`Usta: ${ml}.`);
          if (!mt && !ml) parts.push('Zmień makijaż.');
        }

        /* STYL */
        if (checked.has('style')) {
          const st = v('e-style-target');
          const si = v('e-style-intensity');
          const sd = [st, si].filter(Boolean).join(', ');
          if (sd) parts.push(`Styl zdjęcia: ${sd}.`);
        }

        /* OBRAZ / ILUSTRACJA */
        if (checked.has('painting')) {
          const pt = v('e-paint-style');
          const pp = v('e-paint-palette');
          if (pt) parts.push(`Przerenderuj jako: ${pt}.`);
          if (pp) parts.push(`Paleta: ${pp}.`);
          if (!pt) parts.push('Przerenderuj jako obraz / ilustrację.');
        }

        /* PALETA KOLORÓW */
        if (checked.has('colorgrade')) {
          const ct = v('e-color-target');
          const ci = v('e-color-intensity');
          const cd = [ct, ci].filter(Boolean).join(', ');
          if (cd) parts.push(`Paleta kolorów: ${cd}.`);
        }

        /* POPRAWA JAKOŚCI */
        if (checked.has('refresh')) {
          const sharpness   = v('e-q-sharpness');
          const noise       = v('e-q-noise');
          const exposure    = v('e-q-exposure');
          const shadows     = v('e-q-shadows');
          const highlights  = v('e-q-highlights');
          const colorcast   = v('e-q-colorcast');
          const whitebal    = v('e-q-whitebal');
          const skintone    = v('e-q-skintone');
          const skinretuch  = v('e-q-skinretuch');
          const horizon     = v('e-q-horizon');
          const perspective = v('e-q-perspective');

          const qparts = [];
          if (sharpness)   qparts.push(`wyostrzenie — ${sharpness}`);
          if (noise)       qparts.push(`redukcja szumów — ${noise}`);
          if (exposure)    qparts.push(`korekcja ekspozycji — ${exposure}`);
          if (shadows)     qparts.push(`odzyskanie detali w cieniach — ${shadows}`);
          if (highlights)  qparts.push(`odzyskanie detali w światłach — ${highlights}`);
          if (colorcast)   qparts.push(`korekcja dominanty kolorystycznej — ${colorcast}`);
          if (whitebal)    qparts.push(`wyważenie bieli — ${whitebal}`);
          if (skintone)    qparts.push(`naturalny kolor skóry — ${skintone}`);
          if (skinretuch)  qparts.push(`retusz skóry — ${skinretuch}`);
          if (horizon)     qparts.push('wyprostowanie horyzontu');
          if (perspective) qparts.push(`korekcja perspektywy — ${perspective}`);

          if (qparts.length > 0) {
            parts.push(`Popraw jakość zdjęcia: ${qparts.join('; ')}.`);
            parts.push('Zachowaj naturalny wygląd — bez efektu plastiku i przesadnej obróbki.');
          } else {
            parts.push('Popraw ogólną jakość i ostrość zdjęcia. Zachowaj naturalny wygląd.');
          }
        }

        /* USUŃ ELEMENTY */
        if (checked.has('remove')) {
          const rw = v('e-remove-what');
          const rf = v('e-remove-fill');
          if (rw) parts.push(`Usuń: ${rw}.`);
          if (rf) parts.push(`Uzupełnij: ${rf}.`);
        }

        const detailLine = level === 'detailed'
          ? 'Przejścia i spójność wszystkich zmian: naturalne, jednolite oświetlenie i cienie w całym kadrze.' : null;

        result = sentences(
          `Zachowaj: ${preserv}.`,
          ...parts,
          detailLine,
          avoid ? `Unikaj: ${avoid}.` : null
        );

      } else if (currentMode === 'quality') {
        /* ── POPRAWA JAKOŚCI — osobna zakładka ── */
        const qv = id => { const el = document.getElementById(id); return el ? el.value.trim() || null : null; };

        const sharpness   = qv('q-sharpness');
        const noise       = qv('q-noise');
        const exposure    = qv('q-exposure');
        const shadows     = qv('q-shadows');
        const highlights  = qv('q-highlights');
        const colorcast   = qv('q-colorcast');
        const whitebal    = qv('q-whitebal');
        const skintone    = qv('q-skintone');
        const skinretuch  = qv('q-skinretuch');
        const horizon     = qv('q-horizon');
        const perspective = qv('q-perspective');
        const level       = qv('q-detail') || 'medium';
        const avoid       = qv('q-avoid');

        const qparts = [];
        if (sharpness)   qparts.push(`wyostrzenie — ${sharpness}`);
        if (noise)       qparts.push(`redukcja szumów — ${noise}`);
        if (exposure)    qparts.push(`korekcja ekspozycji — ${exposure}`);
        if (shadows)     qparts.push(`odzyskanie detali w cieniach — ${shadows}`);
        if (highlights)  qparts.push(`odzyskanie detali w światłach — ${highlights}`);
        if (colorcast)   qparts.push(`korekcja dominanty — ${colorcast}`);
        if (whitebal)    qparts.push(`wyważenie bieli — ${whitebal}`);
        if (skintone)    qparts.push(`kolor skóry — ${skintone}`);
        if (skinretuch)  qparts.push(`retusz skóry — ${skinretuch}`);
        if (horizon)     qparts.push('wyprostowanie horyzontu');
        if (perspective) qparts.push(`korekcja perspektywy — ${perspective}`);

        if (qparts.length === 0) {
          result = 'Wybierz parametry które chcesz poprawić.';
        } else {
          const detailLine = level === 'detailed'
            ? 'Zachowaj naturalną teksturę skóry i szczegóły materiałów. Żaden efekt nie może wyglądać sztucznie.' : null;
          result = sentences(
            `Popraw jakość zdjęcia: ${qparts.join('; ')}.`,
            'Zachowaj naturalny wygląd — bez efektu plastiku i przesadnej obróbki.',
            detailLine,
            avoid ? `Unikaj: ${avoid}.` : null
          );
        }
      }

      output.value = result;
    }

    /* ── auto-update ── */
    document.getElementById('form-new').addEventListener('input',     buildPrompt);
    document.getElementById('form-new').addEventListener('change',    buildPrompt);
    document.getElementById('form-edit').addEventListener('input',    buildPrompt);
    document.getElementById('form-edit').addEventListener('change',   buildPrompt);
    document.getElementById('form-quality').addEventListener('input',  buildPrompt);
    document.getElementById('form-quality').addEventListener('change', buildPrompt);
    document.getElementById('build-prompt').addEventListener('click', buildPrompt);

    /* ── init ── */
    switchGenMode('new');
    setFilter('all');

    /* ── NAVBAR SCROLL ── */
    window.addEventListener('scroll', function() {
      var header = document.getElementById('header');
      if (header) {
        if (window.scrollY > 50) {
          header.style.background = 'rgba(23,18,35,0.95)';
        } else {
          header.style.background = '';
        }
      }
    });
    async function copyText(text, btn) {
      const orig = btn.innerHTML;
      const fallback = () => {
        const t = document.createElement('textarea');
        t.value = text;
        t.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
        document.body.appendChild(t);
        t.focus(); t.select();
        try { document.execCommand('copy'); } catch(e) {}
        t.remove();
      };
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(text).catch(fallback);
        } else {
          fallback();
        }
        btn.classList.add('copied');
        btn.innerHTML = '<i class="fas fa-check"></i> Skopiowano';
        setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = orig; }, 1800);
      } catch {
        fallback();
        btn.classList.add('copied');
        btn.innerHTML = '<i class="fas fa-check"></i> Skopiowano';
        setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = orig; }, 1800);
      }
    }

    document.querySelectorAll('.prompt-card .copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        copyText(btn.closest('.prompt-card').querySelector('.prompt-box').textContent.trim(), btn);
      });
    });

    document.getElementById('copy-generated').addEventListener('click', function() {
      copyText(document.getElementById('prompt-output').value, this);
    });

    /* ══ GENERATOR — nowy dual-mode ══════════════════════════ */

    const output = document.getElementById('prompt-output');
    let currentMode = 'new';

    /* ── przełączanie zakładek ── */
    function switchGenMode(mode) {
      currentMode = mode;
      document.getElementById('form-new').hidden  = (mode !== 'new');
      document.getElementById('form-edit').hidden = (mode !== 'edit');
      document.getElementById('tab-new').classList.toggle('active',  mode === 'new');
      document.getElementById('tab-edit').classList.toggle('active', mode === 'edit');
      buildPrompt();
    }

    /* ── pokaż sekcje edycji odpowiadające zaznaczonym checkboxom ── */
    function updateEditSections() {
      const checked = new Set(
        [...document.querySelectorAll('.edit-checks input:checked')].map(i => i.value)
      );
      const map = {
        bg: 'es-bg', light: 'es-light', lens: 'es-lens', weather: 'es-weather',
        outfit: 'es-outfit', hair: 'es-hair', makeup: 'es-makeup',
        style: 'es-style', painting: 'es-painting', colorgrade: 'es-colorgrade',
        refresh: 'es-refresh', remove: 'es-remove',
      };
      Object.entries(map).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (el) el.hidden = !checked.has(key);
      });
      buildPrompt();
    }

    /* ── helper: pobierz wartość, zwróć null jeśli puste ── */
    const v = id => { const el = document.getElementById(id); return el ? el.value.trim() || null : null; };

    /* ── NOWY OBRAZ — profil tematu ── */
    function getNewSubjectProfile() {
      switch (v('n-subject-type')) {
        case 'woman':  return { isPerson:true,  isScene:false, gen:'kobiety' };
        case 'man':    return { isPerson:true,  isScene:false, gen:'mężczyzny' };
        case 'person': return { isPerson:true,  isScene:false, gen:'osoby' };
        case 'scene':  return { isPerson:false, isScene:true,  gen:'sceny' };
        default:       return { isPerson:false, isScene:false, gen:'obiektu' };
      }
    }

    function getNewStyleLabel(p) {
      const s = v('n-style');
      const tbl = {
        'editorial-photo':  p.isPerson ? 'fotografia editorial, naturalna skóra' : 'fotografia editorial',
        'studio-photo':     p.isPerson ? 'fotografia studyjna' : 'fotografia studyjna, kontrolowane tło',
        'fashion-photo':    p.isPerson ? 'fotografia modowa high fashion' : 'fotografia lifestyle',
        'beauty-photo':     p.isPerson ? 'fotografia beauty, naturalna skóra' : 'fotografia beauty',
        'product-photo':    p.isScene  ? 'fotografia wnętrza' : 'fotografia produktowa',
        'street-photo':     'fotografia uliczna, dokumentalna',
        'lifestyle-photo':  p.isPerson ? 'fotografia lifestyle, naturalna' : 'fotografia lifestyle',
        'sport-photo':      'fotografia sportowa, dynamiczna',
        'food-photo':       'fotografia kulinarna premium',
        'arch-photo':       'fotografia architektoniczna',
        'portrait-photo':   'fotografia portretowa klasyczna',
        'luxury-campaign':  p.isPerson ? 'luksusowa kampania modowa' : 'luksusowa kampania produktowa',
        'fine-art':         'fine art fotografia artystyczna',
        'dark-moody':       'dark & moody, dramatyczna, głęboki kontrast',
        'light-airy':       'light & airy, jasna i zwiewna, miękka',
        'vintage-film':     'vintage, analogowy film, ziarno i ciepłe tony',
        'cyberpunk':        'cyberpunk, neonowy klimat, chłodne kolory',
        'minimalist':       'minimalistyczna, czysta kompozycja',
        'paper-cut':        'ilustracja paper-cut, warstwowy kolaż',
        'concept-art':      'filmowy concept art',
        'watercolor':       'akwarela, miękkie przejścia, ilustracja',
        'oil-painting':     'obraz olejny, klasyczna technika malarska',
      };
      return tbl[s] || 'fotografia realistyczna';
    }

    function getNewCrop(p) {
      const cv = v('n-crop'); if (!cv) return null;
      if (!p.isPerson && (cv.includes('twarz')||cv.includes('ramion')||cv.includes('pasa')||cv.includes('kolan')||cv.includes('postać'))) return null;
      if (p.isPerson && cv.includes('produkt')) return null;
      return cv;
    }
    function getNewFrame(p) { const fv = v('n-frame'); if (!fv) return null; if (!p.isPerson && fv.includes('85 mm')) return null; return fv; }
    function getNewEffect(p) { const ev = v('n-effect'); if (!ev) return null; if (!p.isPerson && ev.includes('kremowym')) return null; return ev; }

    function getNewConstraint(p) {
      switch (v('n-constraint')) {
        case 'clean':    return p.isPerson ? 'Naturalna skóra i proporcje. Kompozycja czysta.' : 'Kompozycja czysta, wysoka szczegółowość materiałów.';
        case 'identity': return p.isPerson ? `Rysy twarzy i charakter ${p.gen}: spójne.` : 'Kształt i proporcje obiektu: bez zmian.';
        case 'text':     return 'Tekst w kadrze: czytelny, zapisany dokładnie jak podano.';
        case 'pose':     return p.isPerson ? `Poza ${p.gen}: naturalna.` : 'Układ obiektu: stabilny.';
        default: return null;
      }
    }

    /* ══ BUILD PROMPT ════════════════════════════════════════ */
    function buildPrompt() {
      const join = (...pts) => pts.filter(Boolean).join(', ');
      const sentences = (...pts) => pts.filter(Boolean).join(' ');
      let result = '';

      if (currentMode === 'new') {
        const p       = getNewSubjectProfile();
        const subject = v('n-subject') || 'elegancki produkt';
        const scene   = v('n-scene');
        const light   = v('n-light');
        const style   = getNewStyleLabel(p);
        const crop    = getNewCrop(p);
        const frame   = getNewFrame(p);
        const effect  = getNewEffect(p);
        const constr  = getNewConstraint(p);
        const level   = v('n-detail') || 'medium';
        const avoid   = v('n-avoid');
        const kadrowaInfo = join(crop, frame);

        if (level === 'short') {
          result = sentences(
            `Wygeneruj: ${subject}, ${scene}.`,
            kadrowaInfo ? `Kadr: ${kadrowaInfo}.` : null,
            `Oświetlenie: ${light}. Styl: ${style}.`,
            avoid ? `Unikaj: ${avoid}.` : null
          );
        } else {
          const quality = p.isPerson ? 'Realizm: naturalna skóra, włosy, spójne proporcje.'
            : p.isScene ? 'Realizm: wiarygodne światło i głębia planów.'
            : 'Realizm: wiarygodne materiały i detale.';
          result = sentences(
            `Wygeneruj: ${subject}.`,
            `Lokacja: ${scene}.`,
            kadrowaInfo ? `Kadr: ${kadrowaInfo}.` : null,
            `Oświetlenie: ${light}.`,
            `Styl: ${style}.`,
            effect ? `Efekt: ${effect}.` : null,
            constr,
            level === 'detailed' ? quality : null,
            avoid ? `Unikaj: ${avoid}.` : null
          );
        }

      } else {
        /* ── EDYCJA — zbierz zaznaczone sekcje ── */
        const checked = new Set(
          [...document.querySelectorAll('.edit-checks input:checked')].map(i => i.value)
        );

        if (checked.size === 0) {
          output.value = 'Zaznacz co chcesz zmienić — pojawią się opcje do wyboru.';
          return;
        }

        const level   = v('e-detail') || 'medium';
        const preserv = v('e-preserve-all') || 'twarz, rysy, proporcje sylwetki';
        const avoid   = v('e-avoid-all');
        const parts   = [];

        /* TŁO */
        if (checked.has('bg')) {
          const indoor  = v('e-bg-indoor');
          const outdoor = v('e-bg-outdoor');
          const scene   = [indoor, outdoor].filter(Boolean).join(' + ');
          if (scene) parts.push(`Nowe tło: ${scene}.`);
        }

        /* OŚWIETLENIE */
        if (checked.has('light')) {
          const src  = v('e-light-source');
          const mood = v('e-light-mood');
          const ld   = [src, mood].filter(Boolean).join(', ');
          if (ld) parts.push(`Oświetlenie: ${ld}.`);
        }

        /* OBIEKTYW */
        if (checked.has('lens')) {
          const focal = v('e-lens-focal');
          const dof   = v('e-lens-dof');
          const od    = [focal, dof].filter(Boolean).join(', ');
          if (od) parts.push(`Optyka: ${od}.`);
        }

        /* EFEKTY ATMOSFERYCZNE */
        if (checked.has('weather')) {
          const wx  = v('e-weather-type');
          const fx  = v('e-film-effect');
          if (wx) parts.push(`Efekt atmosferyczny: ${wx}.`);
          if (fx) parts.push(`Efekt filmowy: ${fx}.`);
        }

        /* STRÓJ */
        if (checked.has('outfit')) {
          const type  = v('e-outfit-type');
          const color = v('e-outfit-color');
          const od    = [type, color].filter(Boolean).join(' ');
          if (od) parts.push(`Zmień strój na: ${od}.`);
          else    parts.push('Zmień strój / ubranie.');
        }

        /* WŁOSY */
        if (checked.has('hair')) {
          const hs = v('e-hair-style');
          const hc = v('e-hair-color');
          if (hs) parts.push(`Fryzura: ${hs}.`);
          if (hc) parts.push(`Kolor włosów: ${hc}.`);
          if (!hs && !hc) parts.push('Zmień fryzurę / kolor włosów.');
        }

        /* MAKIJAŻ */
        if (checked.has('makeup')) {
          const mt = v('e-makeup-type');
          const ml = v('e-makeup-lips');
          if (mt) parts.push(`Makijaż: ${mt}.`);
          if (ml) parts.push(`Usta: ${ml}.`);
          if (!mt && !ml) parts.push('Zmień makijaż.');
        }

        /* STYL */
        if (checked.has('style')) {
          const st = v('e-style-target');
          const si = v('e-style-intensity');
          const sd = [st, si].filter(Boolean).join(', ');
          if (sd) parts.push(`Styl zdjęcia: ${sd}.`);
        }

        /* OBRAZ / ILUSTRACJA */
        if (checked.has('painting')) {
          const pt = v('e-paint-style');
          const pp = v('e-paint-palette');
          if (pt) parts.push(`Przerenderuj jako: ${pt}.`);
          if (pp) parts.push(`Paleta: ${pp}.`);
          if (!pt) parts.push('Przerenderuj jako obraz / ilustrację.');
        }

        /* PALETA KOLORÓW */
        if (checked.has('colorgrade')) {
          const ct = v('e-color-target');
          const ci = v('e-color-intensity');
          const cd = [ct, ci].filter(Boolean).join(', ');
          if (cd) parts.push(`Paleta kolorów: ${cd}.`);
        }

        /* POPRAWA JAKOŚCI */
        if (checked.has('refresh')) {
          const rs = v('e-refresh-scope');
          if (rs) parts.push(`Popraw: ${rs}.`);
          else    parts.push('Popraw jakość i ostrość zdjęcia.');
        }

        /* USUŃ ELEMENTY */
        if (checked.has('remove')) {
          const rw = v('e-remove-what');
          const rf = v('e-remove-fill');
          if (rw) parts.push(`Usuń: ${rw}.`);
          if (rf) parts.push(`Uzupełnij: ${rf}.`);
        }

        const detailLine = level === 'detailed'
          ? 'Przejścia i spójność wszystkich zmian: naturalne, jednolite oświetlenie i cienie w całym kadrze.' : null;

        result = sentences(
          `Zachowaj: ${preserv}.`,
          ...parts,
          detailLine,
          avoid ? `Unikaj: ${avoid}.` : null
        );
      }

      output.value = result;
    }

    /* ── auto-update ── */
    document.getElementById('form-new').addEventListener('input',  buildPrompt);
    document.getElementById('form-new').addEventListener('change', buildPrompt);
    document.getElementById('form-edit').addEventListener('input',  buildPrompt);
    document.getElementById('form-edit').addEventListener('change', buildPrompt);

    document.getElementById('build-prompt').addEventListener('click', buildPrompt);

    /* ── init ── */
    switchGenMode('new');
    setFilter('all');

    /* ── auto-update ── */
    document.getElementById('form-new').addEventListener('input',  buildPrompt);
    document.getElementById('form-new').addEventListener('change', buildPrompt);
    document.getElementById('form-edit').addEventListener('input',  buildPrompt);
    document.getElementById('form-edit').addEventListener('change', buildPrompt);

    document.getElementById('build-prompt').addEventListener('click', buildPrompt);

    /* ── init ── */
    switchGenMode('new');
    setFilter('all');

  


    /* ── NAVBAR SCROLL (Landed uses #header) ── */
    window.addEventListener('scroll', function() {
      var header = document.getElementById('header');
      if (header) {
        if (window.scrollY > 50) {
          header.style.background = 'rgba(23,18,35,0.95)';
        } else {
          header.style.background = '';
        }
      }
    });
