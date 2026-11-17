/* YGN Studio — Bilingual FR/EN Switcher, Certified Preview Gallery & VIP Brief Persistence */
(function () {
  var STORAGE_LANG_KEY = 'ygn_studio_lang';
  var STORAGE_VIP_KEY = 'ygn_vip_song_brief_v1';

  window.setLang = function (lang) {
    var isEn = (lang === 'en');
    document.body.classList.toggle('en', isEn);
    document.documentElement.lang = isEn ? 'en' : 'fr';
    var btnFr = document.getElementById('btn-fr');
    var btnEn = document.getElementById('btn-en');
    if (btnFr) btnFr.classList.toggle('active', !isEn);
    if (btnEn) btnEn.classList.toggle('active', isEn);
    try { localStorage.setItem(STORAGE_LANG_KEY, isEn ? 'en' : 'fr'); } catch (e) {}
  };

  window.switchPreview = function (btnEl, imgSrc, altText) {
    var mainImg = document.getElementById('main-preview-img');
    if (mainImg) {
      mainImg.src = imgSrc;
      if (altText) mainImg.alt = altText;
    }
    var thumbs = document.querySelectorAll('.thumb-btn');
    for (var i = 0; i < thumbs.length; i++) {
      thumbs[i].classList.remove('active');
    }
    if (btnEl) btnEl.classList.add('active');
  };

  window.openLightbox = function () {
    var mainImg = document.getElementById('main-preview-img');
    var lb = document.getElementById('studio-lightbox');
    var lbImg = document.getElementById('lightbox-img');
    if (mainImg && lb && lbImg) {
      lbImg.src = mainImg.src;
      lbImg.alt = mainImg.alt;
      lb.classList.add('open');
    }
  };

  window.closeLightbox = function () {
    var lb = document.getElementById('studio-lightbox');
    if (lb) lb.classList.remove('open');
  };

  /* Configurateur Pré-Checkout / Post-Checkout Chanson VIP */
  function buildVipPayloadFromPreForm() {
    var occEl = document.getElementById('vip-occasion');
    var recEl = document.getElementById('vip-recipient');
    var relEl = document.getElementById('vip-relationship');
    var m1El = document.getElementById('vip-mem-1');
    var m2El = document.getElementById('vip-mem-2');
    var m3El = document.getElementById('vip-mem-3');
    var styEl = document.getElementById('vip-style');
    var lngEl = document.getElementById('vip-song-lang');
    var titEl = document.getElementById('vip-song-title');
    var emlEl = document.getElementById('vip-email');
    if (!occEl || !recEl) return null;

    var recipient = (recEl.value || '').trim() || 'Destinataire';
    var occasion = occEl.value || 'noel';
    var lang = (lngEl && lngEl.value) ? lngEl.value : 'FR';
    var customTitle = (titEl && titEl.value.trim()) ? titEl.value.trim() : ('Pour ' + recipient);
    var draftId = 'VIP-2026-' + new Date().toISOString().slice(5, 10).replace('-', '') + '-DRAFT';

    return {
      order_id: draftId,
      created_at: new Date().toISOString(),
      lang: lang,
      occasion: occasion,
      recipient: recipient,
      sender: 'Famille & Proches',
      relationship: (relEl && relEl.value.trim()) || occasion,
      memories: [
        (m1El && m1El.value.trim()) || '',
        (m2El && m2El.value.trim()) || '',
        (m3El && m3El.value.trim()) || ''
      ],
      musical_style: (styEl && styEl.value) || 'Acoustique Folk-Pop & Guitare',
      song_title: customTitle,
      duration: '3:12',
      customer_email: (emlEl && emlEl.value.trim()) || '',
      player_url: 'https://yannabadie.github.io/cozy-festive-studio-2026/vip-player/' + draftId + '/'
    };
  }

  window.syncVipConfigurator = function (showToast) {
    var payload = buildVipPayloadFromPreForm();
    if (!payload) return;
    var jsonStr = JSON.stringify(payload, null, 2);
    var outPre = document.getElementById('vip-json-preview');
    if (outPre) outPre.textContent = jsonStr;
    try { localStorage.setItem(STORAGE_VIP_KEY, jsonStr); } catch (e) {}
    if (showToast) {
      var st = document.getElementById('vip-config-status');
      if (st) {
        var isEn = document.body.classList.contains('en');
        st.textContent = isEn
          ? '✓ Brief saved locally in your browser & ready for post-checkout!'
          : '✓ Brief sauvegardé dans votre navigateur et prêt pour l’après-paiement !';
      }
    }
  };

  window.copyVipBriefJson = function () {
    window.syncVipConfigurator(false);
    var outPre = document.getElementById('vip-json-preview');
    if (!outPre) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(outPre.textContent);
    }
    var st = document.getElementById('vip-config-status');
    if (st) {
      var isEn = document.body.classList.contains('en');
      st.textContent = isEn ? '✓ Structured JSON brief copied to clipboard!' : '✓ Brief JSON structuré copié dans le presse-papiers !';
    }
  };

  window.downloadVipBriefJson = function () {
    window.syncVipConfigurator(false);
    var outPre = document.getElementById('vip-json-preview');
    if (!outPre) return;
    var blob = new Blob([outPre.textContent], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'brief_chanson_vip.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  document.addEventListener('DOMContentLoaded', function () {
    try {
      var params = new URLSearchParams(window.location.search);
      var qLang = params.get('lang');
      var savedLang = localStorage.getItem(STORAGE_LANG_KEY);
      if (qLang === 'en' || qLang === 'fr') {
        window.setLang(qLang);
      } else if (savedLang === 'en' || savedLang === 'fr') {
        window.setLang(savedLang);
      }
    } catch (e) {}

    /* Restauration automatique du brouillon VIP si présent sur la page Chanson */
    var occEl = document.getElementById('vip-occasion');
    if (occEl) {
      try {
        var raw = localStorage.getItem(STORAGE_VIP_KEY);
        if (raw) {
          var data = JSON.parse(raw);
          if (data.occasion) occEl.value = data.occasion;
          if (data.recipient && data.recipient !== 'Destinataire') document.getElementById('vip-recipient').value = data.recipient;
          if (data.relationship) document.getElementById('vip-relationship').value = data.relationship;
          if (Array.isArray(data.memories)) {
            if (data.memories[0]) document.getElementById('vip-mem-1').value = data.memories[0];
            if (data.memories[1]) document.getElementById('vip-mem-2').value = data.memories[1];
            if (data.memories[2]) document.getElementById('vip-mem-3').value = data.memories[2];
          }
          if (data.musical_style) document.getElementById('vip-style').value = data.musical_style;
          if (data.lang) document.getElementById('vip-song-lang').value = data.lang;
          if (data.song_title) document.getElementById('vip-song-title').value = data.song_title;
          if (data.customer_email) document.getElementById('vip-email').value = data.customer_email;
        }
      } catch (e) {}
      window.syncVipConfigurator(false);
    }

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') window.closeLightbox();
    });
  });
})();
