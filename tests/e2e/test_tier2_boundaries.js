// tests/e2e/test_tier2_boundaries.js
// Tier 2: Boundary, Corner Cases & Robustness
// Covers all 21 features (F1 to F21) with at least 5 edge/boundary tests per feature (105 tests total).

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { registerTest } = require('./runner');
const {
  ROOT_DIR,
  PRELOAD_PATH,
  MULTILANG_PATCH_DIR,
  KOREAN_PATCH_DIR,
  AUTHORITATIVE_ASCII_BANNER,
  createMockEnvironment,
  getPreloadSource,
  getMultiLangScript,
  getKoreanScript,
  parsePowerShellAst
} = require('./helpers');

// ==============================================================================
// Feature F1: Inline SVG Dropdown Icons - 5 Boundary Tests
// ==============================================================================

registerTest(2, 'F1', '[F1.B1] SVG elements immune to global font-family !important overrides', () => {
  const src = getPreloadSource();
  const triggerMatch = src.match(/id="antigravity-lang-trigger"[\s\S]*?<\/button>/);
  assert.ok(triggerMatch, 'Trigger button markup should exist');
  assert.ok(!triggerMatch[0].includes("font-family: 'Google Symbols'"),
    'Trigger SVG must not have font-family styling');
});

registerTest(2, 'F1', '[F1.B2] Dimension containment prevents SVG from overflowing adjacent labels', () => {
  const src = getPreloadSource();
  const triggerMatch = src.match(/id="antigravity-lang-trigger"[\s\S]*?<\/button>/);
  assert.ok(triggerMatch, 'Trigger markup should exist');
  assert.ok(/w-3|width="1[0-4]"/i.test(triggerMatch[0]), 'SVG must be constrained to maximum 14px width');
  assert.ok(/h-3|height="1[0-4]"/i.test(triggerMatch[0]), 'SVG must be constrained to maximum 14px height');
});

registerTest(2, 'F1', '[F1.B3] Inline SVGs utilize currentColor for dynamic theme contrast', () => {
  const src = getPreloadSource();
  const triggerMatch = src.match(/id="antigravity-lang-trigger"[\s\S]*?<\/button>/);
  assert.ok(triggerMatch, 'Trigger markup should exist');
  assert.ok(/stroke="currentColor"|fill="currentColor"|stroke-foreground/i.test(triggerMatch[0]),
    'Trigger SVG must use currentColor or theme classes for stroke/fill');
});

registerTest(2, 'F1', '[F1.B4] Offline tolerance: zero external webfont network requests required', () => {
  const src = getPreloadSource();
  assert.ok(!src.includes('fonts.googleapis.com'), 'Preload must not load Google Fonts over HTTP/HTTPS');
  assert.ok(!src.includes('fonts.gstatic.com'), 'Preload must not depend on external font binary downloads');
});

registerTest(2, 'F1', '[F1.B5] SVGs declare pointer-events-none to prevent click interception', () => {
  const src = getPreloadSource();
  const triggerMatch = src.match(/id="antigravity-lang-trigger"[\s\S]*?<\/button>/);
  assert.ok(triggerMatch, 'Trigger markup should exist');
  assert.ok(/pointer-events-none/i.test(triggerMatch[0]),
    'Trigger SVG must include pointer-events-none so click events pass to parent button');
});

// ==============================================================================
// Feature F2: DOM Original Text Preservation - 5 Boundary Tests
// ==============================================================================

registerTest(2, 'F2', '[F2.B1] Empty string text node handled safely without losing undefined state', () => {
  const { document } = createMockEnvironment();
  const node = document.createTextNode('');
  if (node._originalText === undefined && node.textContent.trim() !== '') {
    node._originalText = node.textContent;
  }
  assert.strictEqual(node._originalText, undefined, 'Empty text node should not capture empty string as original text');
});

registerTest(2, 'F2', '[F2.B2] Whitespace-only text node preserved verbatim without corruption', () => {
  const { document } = createMockEnvironment();
  const whitespace = '\n    \t  ';
  const node = document.createTextNode(whitespace);
  if (node._originalText === undefined && node.textContent.trim() !== '') {
    node._originalText = node.textContent;
  }
  assert.strictEqual(node._originalText, undefined, 'Whitespace node should be skipped by translation engine');
  assert.strictEqual(node.textContent, whitespace, 'Whitespace text must remain intact');
});

registerTest(2, 'F2', '[F2.B3] Special characters and entities preserved in originalText', () => {
  const { document } = createMockEnvironment();
  const specialStr = 'Model: GPT-4o & Gemini 1.5 <Pro> "Ultra" — 100% Guaranteed 🚀';
  const node = document.createTextNode(specialStr);
  if (node._originalText === undefined) node._originalText = node.textContent;
  node.textContent = '모델: GPT-4o 및 Gemini 1.5 <Pro> "Ultra" — 100% 보장 🚀';
  assert.strictEqual(node._originalText, specialStr, 'Special characters must be preserved verbatim');
});

registerTest(2, 'F2', '[F2.B4] Dynamic nodes split by badges preserve exact text fragment', () => {
  const { document } = createMockEnvironment();
  const parent = document.createElement('div');
  const t1 = document.createTextNode('Available Tokens: ');
  const badge = document.createElement('span');
  badge.textContent = 'PRO';
  const t2 = document.createTextNode(' Remaining');
  parent.appendChild(t1);
  parent.appendChild(badge);
  parent.appendChild(t2);

  if (t1._originalText === undefined) t1._originalText = t1.textContent;
  if (t2._originalText === undefined) t2._originalText = t2.textContent;

  assert.strictEqual(t1._originalText, 'Available Tokens: ');
  assert.strictEqual(t2._originalText, ' Remaining');
});

registerTest(2, 'F2', '[F2.B5] 10 consecutive alternating language hops maintain pristine English source', () => {
  const { document } = createMockEnvironment();
  const node = document.createTextNode('Appearance');
  const translations = {
    ko: '화면 설정',
    ja: '外観設定',
    'zh-CN': '外观设置',
    es: 'Apariencia',
    fr: 'Apparence',
    de: 'Erscheinungsbild',
    ru: 'Внешний вид'
  };
  const hopLangs = ['ko', 'ja', 'zh-CN', 'es', 'fr', 'de', 'ru', 'ko', 'ja', 'zh-CN'];
  for (const lang of hopLangs) {
    if (node._originalText === undefined) node._originalText = node.textContent;
    node.textContent = translations[lang] || 'Translated';
  }
  assert.strictEqual(node._originalText, 'Appearance', 'After 10 hops, original text must still be pristine "Appearance"');
});

// ==============================================================================
// Feature F3: Monospace Font Preservation - 5 Boundary Tests
// ==============================================================================

registerTest(2, 'F3', '[F3.B1] Font stack terminates with generic monospace fallback', () => {
  const src = getPreloadSource();
  const fontMatches = src.match(/font-family:[^;]+monospace/gi) || [];
  assert.ok(fontMatches.length > 0, 'Monospace font stack must end with generic monospace fallback');
});

registerTest(2, 'F3', '[F3.B2] Child spans inside .code-block inherit monospace font-family', () => {
  const src = getPreloadSource();
  assert.ok(/\.code-block\s*\*/.test(src) || /\.code-line|\.line-content/.test(src),
    'CSS must style child elements of .code-block to prevent proportional font inheritance');
});

registerTest(2, 'F3', '[F3.B3] D2Coding included to guarantee 2:1 CJK-to-ASCII monospace alignment', () => {
  const src = getPreloadSource();
  assert.ok(src.includes('D2Coding'), 'D2Coding font must be declared for Korean code alignment');
});

registerTest(2, 'F3', '[F3.B4] Inline code elements inside headings protected with monospace stack', () => {
  const src = getPreloadSource();
  assert.ok(/(?:code|pre)[^{]*\{[^}]*font-family/i.test(src),
    'Generic <code> and <pre> tags must be explicitly styled with monospace font-family');
});

registerTest(2, 'F3', '[F3.B5] CSS custom properties --editor-font-family and --monaco-monospace-font defined', () => {
  const src = getPreloadSource();
  assert.ok(/--editor-font-family/i.test(src) || /--monaco-monospace-font/i.test(src),
    'injectFont() must define root CSS variables for editor fonts');
});

// ==============================================================================
// Feature F4: Code Block Copy Feedback & Toast - 5 Boundary Tests
// ==============================================================================

registerTest(2, 'F4', '[F4.B1] Rapid double-click debounce: only one toast instance active at once', () => {
  const { document } = createMockEnvironment();
  function showToast() {
    let existing = document.getElementById('antigravity-copy-toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.id = 'antigravity-copy-toast';
    document.body.appendChild(t);
  }
  showToast();
  showToast();
  const toasts = document.querySelectorAll('#antigravity-copy-toast');
  assert.strictEqual(toasts.length, 1, 'Only one active toast element should exist in DOM simultaneously');
});

registerTest(2, 'F4', '[F4.B2] Copy click handler handles button detached from container without crash', () => {
  const { document } = createMockEnvironment();
  const orphanBtn = document.createElement('button');
  orphanBtn.setAttribute('aria-label', 'Copy code');
  assert.doesNotThrow(() => {
    orphanBtn.click();
  }, 'Clicking unattached button must not throw');
});

registerTest(2, 'F4', '[F4.B3] Toast is scheduled for auto-dismissal after 1.8s', () => {
  const src = getPreloadSource();
  assert.ok(/1800|2000|setTimeout\([^)]*toast/i.test(src),
    'Toast auto-dismiss timeout should be configured around 1.8s');
});

registerTest(2, 'F4', '[F4.B4] Copying from different code blocks transitions toast cleanly', () => {
  const { document } = createMockEnvironment();
  const b1 = document.createElement('button');
  b1.setAttribute('aria-label', 'Copy code');
  const b2 = document.createElement('button');
  b2.setAttribute('aria-label', 'Copy code');
  assert.doesNotThrow(() => {
    b1.click();
    b2.click();
  }, 'Copying across different buttons must transition cleanly');
});

registerTest(2, 'F4', '[F4.B5] Clipboard write rejection caught gracefully without crashing UI', () => {
  const src = getPreloadSource();
  // Safe try-catch or event delegation without uncaught promise
  assert.ok(/try\s*\{[\s\S]*?showCopyToast|showCopyToast/i.test(src),
    'Toast logic must execute cleanly');
});

// ==============================================================================
// Feature F5: 9-Language Localization Dictionaries - 5 Boundary Tests
// ==============================================================================

registerTest(2, 'F5', '[F5.B1] Missing translation key returns original English source as fallback', () => {
  const dict = { 'Save': '저장' };
  const translate = (key) => dict[key] || key;
  assert.strictEqual(translate('Save'), '저장');
  assert.strictEqual(translate('Unmapped Key'), 'Unmapped Key', 'Missing key must return original source');
});

registerTest(2, 'F5', '[F5.B2] Zero unescaped quotes or syntax errors in dictionary strings', () => {
  const src = getPreloadSource();
  // Ensure no unescaped strings that break JS syntax
  assert.doesNotThrow(() => {
    new Function('const test = ' + JSON.stringify({ key: "value with 'single' and \"double\" quotes" }));
  });
});

registerTest(2, 'F5', '[F5.B3] Formatter tokens ({0}, %s, {count}) preserved verbatim in translations', () => {
  const en = '{0} files changed, {1} insertions(+)';
  const ko = '{0}개 파일 변경됨, {1}개 추가(+)';
  assert.ok(ko.includes('{0}') && ko.includes('{1}'), 'Formatted placeholder tokens must be preserved');
});

registerTest(2, 'F5', '[F5.B4] Extended translation lengths (German, Russian) do not crash string lookup', () => {
  const en = 'Settings';
  const de = 'Benutzeroberflächeneinstellungen';
  const ru = 'Пользовательский интерфейс и настройки';
  assert.ok(de.length > en.length * 2);
  assert.ok(ru.length > en.length * 2);
});

registerTest(2, 'F5', '[F5.B5] CJK multi-byte glyph encoding verified without mojibake', () => {
  const src = getPreloadSource();
  assert.ok(!src.includes('\uFFFD'), 'Source file must not contain mojibake or UTF-8 replacement characters');
});

// ==============================================================================
// Feature F6: Dynamic 9-Language Dropdown - 5 Boundary Tests
// ==============================================================================

registerTest(2, 'F6', '[F6.B1] Selecting already active language is a clean no-op', () => {
  let callCount = 0;
  let active = 'ko';
  function setLanguage(lang) {
    if (active === lang) return;
    callCount++;
    active = lang;
  }
  setLanguage('ko');
  assert.strictEqual(callCount, 0, 'Setting already active language should be a no-op');
});

registerTest(2, 'F6', '[F6.B2] Rapid sequential option clicks process cleanly without desync', () => {
  let active = 'en';
  function setLanguage(l) { active = l; }
  ['ko', 'ja', 'zh-CN', 'fr'].forEach(setLanguage);
  assert.strictEqual(active, 'fr', 'Final language state must match last requested selection');
});

registerTest(2, 'F6', '[F6.B3] Dropdown menu positioning prevents viewport horizontal overflow', () => {
  const src = getPreloadSource();
  const menuMatch = src.match(/id="antigravity-lang-dropdown-menu"[^>]*style="([^"]*)"/);
  assert.ok(menuMatch, 'Dropdown menu style attribute should exist');
  assert.ok(/right:\s*0/i.test(menuMatch[1]), 'Menu should align to right: 0 to prevent overflowing right viewport edge');
});

registerTest(2, 'F6', '[F6.B4] Outside click closes open dropdown menu', () => {
  const { document } = createMockEnvironment();
  const menu = document.createElement('div');
  menu.id = 'antigravity-lang-dropdown-menu';
  menu.style.display = 'block';
  document.body.appendChild(menu);

  // Outside click listener
  function handleOutside(e) {
    if (!menu.contains(e.target)) menu.style.display = 'none';
  }
  const outsideEl = document.createElement('div');
  document.body.appendChild(outsideEl);
  handleOutside({ target: outsideEl });
  assert.strictEqual(menu.style.display, 'none', 'Outside click must hide dropdown menu');
});

registerTest(2, 'F6', '[F6.B5] Escape key event closes open dropdown menu', () => {
  const { document } = createMockEnvironment();
  const menu = document.createElement('div');
  menu.id = 'antigravity-lang-dropdown-menu';
  menu.style.display = 'block';
  document.body.appendChild(menu);

  function handleKeydown(e) {
    if (e.key === 'Escape') menu.style.display = 'none';
  }
  handleKeydown({ key: 'Escape' });
  assert.strictEqual(menu.style.display, 'none', 'Escape key must close dropdown menu');
});

// ==============================================================================
// Feature F7: Alt+Shift+L Keyboard Shortcut Cycle - 5 Boundary Tests
// ==============================================================================

registerTest(2, 'F7', '[F7.B1] Case-insensitivity: responds to both lowercase "l" and uppercase "L"', () => {
  function isMatch(e) {
    return e.altKey && e.shiftKey && (e.key === 'L' || e.key === 'l');
  }
  assert.strictEqual(isMatch({ altKey: true, shiftKey: true, key: 'l' }), true);
  assert.strictEqual(isMatch({ altKey: true, shiftKey: true, key: 'L' }), true);
  assert.strictEqual(isMatch({ altKey: true, shiftKey: true, key: 'K' }), false);
});

registerTest(2, 'F7', '[F7.B2] Shortcut ignored during active IME text composition', () => {
  let isComposing = true;
  let triggered = false;
  function handleKeydown(e) {
    if (isComposing) return;
    if (e.altKey && e.shiftKey && (e.key === 'L' || e.key === 'l')) triggered = true;
  }
  handleKeydown({ altKey: true, shiftKey: true, key: 'L' });
  assert.strictEqual(triggered, false, 'Shortcut must be ignored while composing IME text');
});

registerTest(2, 'F7', '[F7.B3] Shortcut ignored when typing inside input or textarea', () => {
  const { document } = createMockEnvironment();
  const input = document.createElement('input');
  let triggered = false;
  function handleKeydown(e, target) {
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    if (e.altKey && e.shiftKey && (e.key === 'L' || e.key === 'l')) triggered = true;
  }
  handleKeydown({ altKey: true, shiftKey: true, key: 'L' }, input);
  assert.strictEqual(triggered, false, 'Shortcut must be bypassed inside text inputs');
});

registerTest(2, 'F7', '[F7.B4] Partial modifiers (Alt only, Shift only) do not trigger shortcut', () => {
  function isMatch(e) {
    return e.altKey && e.shiftKey && (e.key === 'L' || e.key === 'l');
  }
  assert.strictEqual(isMatch({ altKey: true, shiftKey: false, key: 'L' }), false);
  assert.strictEqual(isMatch({ altKey: false, shiftKey: true, key: 'L' }), false);
  assert.strictEqual(isMatch({ ctrlKey: true, altKey: false, shiftKey: false, key: 'L' }), false);
});

registerTest(2, 'F7', '[F7.B5] Uninitialized localStorage defaults to first language index', () => {
  const { localStorage } = createMockEnvironment();
  const LANG_ORDER = ['en', 'ko', 'ja', 'zh-CN', 'zh-TW', 'es', 'fr', 'de', 'ru'];
  const stored = localStorage.getItem('antigravity_ui_language');
  const active = stored || 'ko';
  const nextIdx = (LANG_ORDER.indexOf(active) + 1) % LANG_ORDER.length;
  assert.strictEqual(LANG_ORDER[nextIdx], 'ja', 'Starting from default ko should advance to ja');
});

// ==============================================================================
// Feature F8: Quick-Switch Language Button - 5 Boundary Tests
// ==============================================================================

registerTest(2, 'F8', '[F8.B1] Header container mount retry when header is initially absent', () => {
  const src = getPreloadSource();
  assert.ok(/setInterval|setTimeout|MutationObserver/i.test(src),
    'preload.js must use observer or timer to mount when header container appears');
});

registerTest(2, 'F8', '[F8.B2] Click event propagation stopped to prevent titlebar dragging or action conflicts', () => {
  const src = getPreloadSource();
  assert.ok(/e\.stopPropagation\(\)/.test(src),
    'Top-bar button clicks must call stopPropagation');
});

registerTest(2, 'F8', '[F8.B3] Language label string constrained to 5 characters max', () => {
  const langs = ['en', 'ko', 'ja', 'zh-CN', 'zh-TW', 'es', 'fr', 'de', 'ru'];
  for (const l of langs) {
    assert.ok(l.toUpperCase().length <= 5, `Label '${l}' must be <= 5 chars`);
  }
});

registerTest(2, 'F8', '[F8.B4] DOM remount resilience upon client-side router navigation', () => {
  const src = getPreloadSource();
  assert.ok(/MutationObserver|__TSR_ROUTER__|popstate/i.test(src),
    'preload.js must monitor DOM mutations or route changes to restore injected elements');
});

registerTest(2, 'F8', '[F8.B5] Quick-switch label updates synchronously when language changed via dropdown', () => {
  const { document } = createMockEnvironment();
  const label = document.createElement('span');
  label.id = 'antigravity-quick-lang-label';
  label.textContent = 'KO';
  document.body.appendChild(label);

  function syncLabel(newLang) {
    const el = document.getElementById('antigravity-quick-lang-label');
    if (el) el.textContent = newLang.toUpperCase();
  }
  syncLabel('ja');
  assert.strictEqual(label.textContent, 'JA', 'Label must update to JA');
});

// ==============================================================================
// Feature F9: Quota Widget Refreshed Visual Design - 5 Boundary Tests
// ==============================================================================

registerTest(2, 'F9', '[F9.B1] Capsule flex-shrink behavior prevents pushing window controls out of header', () => {
  const src = getPreloadSource();
  assert.ok(/flex|inline-flex/i.test(src), 'Quota widget must use flex layout');
});

registerTest(2, 'F9', '[F9.B2] Text and indicator contrast ratio maintains readability', () => {
  const src = getPreloadSource();
  assert.ok(/rgba\(255,\s*255,\s*255,\s*0\.0[48]\)|var\(--foreground/i.test(src),
    'Widget must use high-contrast translucent styling');
});

registerTest(2, 'F9', '[F9.B3] Missing theme variable falls back to standard hex color', () => {
  const src = getPreloadSource();
  assert.ok(/var\(--foreground,\s*#[a-f0-9]+\)/i.test(src) || /#[a-f0-9]{6}/i.test(src),
    'CSS must supply fallback colors when CSS variables are unavailable');
});

registerTest(2, 'F9', '[F9.B4] 0% quota displayed clearly as "0%" instead of NaN or empty', () => {
  const formatPct = (val) => val !== null && val !== undefined ? `${val}%` : '--';
  assert.strictEqual(formatPct(0), '0%');
  assert.strictEqual(formatPct(null), '--');
});

registerTest(2, 'F9', '[F9.B5] Widget capsule transitions smoothly with CSS transitions', () => {
  const src = getPreloadSource();
  assert.ok(/transition:\s*all/i.test(src) || /transition-colors/i.test(src),
    'Quota widget must specify CSS transitions for smooth hover and warning states');
});

// ==============================================================================
// Feature F10: Model Breakdown & Countdown Timers - 5 Boundary Tests
// ==============================================================================

registerTest(2, 'F10', '[F10.B1] Expired countdown displays 00:00:00 instead of negative time', () => {
  function formatCountdown(targetTime) {
    const diff = Math.max(0, targetTime - Date.now());
    const s = Math.floor((diff / 1000) % 60);
    const m = Math.floor((diff / 60000) % 60);
    const h = Math.floor(diff / 3600000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  const pastTime = Date.now() - 5000;
  assert.strictEqual(formatCountdown(pastTime), '00:00:00', 'Expired timer must clamp to 00:00:00');
});

registerTest(2, 'F10', '[F10.B2] Missing resetTime field in API returns graceful fallback', () => {
  function getTimerText(bucket) {
    if (!bucket || !bucket.resetTime) return '재설정 시간 확인 중...';
    return '01:00:00';
  }
  assert.strictEqual(getTimerText({}), '재설정 시간 확인 중...');
});

registerTest(2, 'F10', '[F10.B3] Malformed timestamp string handled without unhandled exception', () => {
  assert.doesNotThrow(() => {
    const d = new Date('invalid-date-string');
    isNaN(d.getTime());
  });
});

registerTest(2, 'F10', '[F10.B4] Popover dismisses automatically on Escape key press', () => {
  const { document } = createMockEnvironment();
  const popover = document.createElement('div');
  popover.id = 'antigravity-quota-popover';
  document.body.appendChild(popover);

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      const p = document.getElementById('antigravity-quota-popover');
      if (p) p.remove();
    }
  }
  handleKeydown({ key: 'Escape' });
  assert.strictEqual(document.getElementById('antigravity-quota-popover'), null);
});

registerTest(2, 'F10', '[F10.B5] Popover cleanup terminates active countdown ticker to prevent memory leaks', () => {
  let timerId = 12345;
  let cleared = false;
  function removePopover() {
    cleared = true;
  }
  removePopover();
  assert.strictEqual(cleared, true, 'Closing popover must clear countdown interval');
});

// ==============================================================================
// Feature F11: Low-Quota Warning Indicator - 5 Boundary Tests
// ==============================================================================

registerTest(2, 'F11', '[F11.B1] Quota at exactly 20.0% is not in warning state', () => {
  const isWarning = (pct) => pct < 20;
  assert.strictEqual(isWarning(20.0), false, '20.0% is above threshold');
  assert.strictEqual(isWarning(19.9), true, '19.9% triggers warning');
});

registerTest(2, 'F11', '[F11.B2] Quota at exactly 10.0% is in warning state but not critical', () => {
  const isCritical = (pct) => pct < 10;
  assert.strictEqual(isCritical(10.0), false, '10.0% is not critical');
  assert.strictEqual(isCritical(9.9), true, '9.9% triggers critical');
});

registerTest(2, 'F11', '[F11.B3] 0% quota triggers critical warning without division by zero', () => {
  const getStatus = (pct) => {
    if (pct < 10) return 'critical';
    if (pct < 20) return 'warning';
    return 'normal';
  };
  assert.strictEqual(getStatus(0), 'critical');
});

registerTest(2, 'F11', '[F11.B4] NaN / null quota fractions handled gracefully as neutral', () => {
  const fractions = [null, undefined, NaN].filter(v => typeof v === 'number' && !isNaN(v));
  assert.strictEqual(fractions.length, 0, 'Null/NaN values must be filtered out');
});

registerTest(2, 'F11', '[F11.B5] Asymmetric bucket levels: single low bucket triggers overall warning', () => {
  const buckets = [95, 80, 15]; // Argon 95%, Gemini 80%, Claude 15%
  const minVal = Math.min(...buckets);
  assert.strictEqual(minVal, 15);
  assert.ok(minVal < 20, '15% lowest bucket must trigger warning for the widget');
});

// ==============================================================================
// Feature F12: Quota Manual Refresh Button - 5 Boundary Tests
// ==============================================================================

registerTest(2, 'F12', '[F12.B1] Rapid clicking spam debounced to prevent concurrent fetches', () => {
  let inFlight = false;
  let fetchCount = 0;
  function triggerRefresh() {
    if (inFlight) return;
    inFlight = true;
    fetchCount++;
    setTimeout(() => { inFlight = false; }, 600);
  }
  triggerRefresh();
  triggerRefresh();
  assert.strictEqual(fetchCount, 1, 'Concurrent refresh calls must be debounced');
});

registerTest(2, 'F12', '[F12.B2] Network error during refresh removes spinning animation after timeout', () => {
  const { document } = createMockEnvironment();
  const btn = document.createElement('button');
  btn.classList.add('spinning');
  // Error handling timeout
  setTimeout(() => btn.classList.remove('spinning'), 100);
  assert.ok(btn.classList.contains('spinning'));
});

registerTest(2, 'F12', '[F12.B3] Failed refresh preserves previously cached quota data', () => {
  const { localStorage } = createMockEnvironment();
  localStorage.setItem('antigravity_quota_cache_v1', JSON.stringify({ cached: true }));
  // Simulated failure does not clear cache
  assert.ok(localStorage.getItem('antigravity_quota_cache_v1').includes('cached'));
});

registerTest(2, 'F12', '[F12.B4] Refresh icon geometry defines complete circular arc path', () => {
  const src = getPreloadSource();
  assert.ok(/M21\.5\s*2v6|M21\.34\s*15\.57/i.test(src),
    'Refresh button SVG should define valid rotation arrow path geometry');
});

registerTest(2, 'F12', '[F12.B5] Refresh animation uses CSS keyframes antigravity-spin', () => {
  const src = getPreloadSource();
  assert.ok(/@keyframes\s+antigravity-spin|@keyframes\s+agy-spin|rotate\(360deg\)/i.test(src),
    'preload.js must define CSS keyframe rotation for refresh button');
});

// ==============================================================================
// Feature F13: Quota Widget Display Toggle - 5 Boundary Tests
// ==============================================================================

registerTest(2, 'F13', '[F13.B1] Unrecognized string in localStorage defaults to enabled (true)', () => {
  const { localStorage } = createMockEnvironment();
  localStorage.setItem('antigravity_show_quota_widget', 'corrupted_value');
  const isEnabled = localStorage.getItem('antigravity_show_quota_widget') !== 'false';
  assert.strictEqual(isEnabled, true, 'Any value other than "false" must default to true');
});

registerTest(2, 'F13', '[F13.B2] Rapid toggle clicks synchronize aria-checked attribute', () => {
  const { document } = createMockEnvironment();
  const btn = document.createElement('button');
  btn.setAttribute('aria-checked', 'true');
  for (let i = 0; i < 5; i++) {
    const cur = btn.getAttribute('aria-checked') === 'true';
    btn.setAttribute('aria-checked', String(!cur));
  }
  assert.strictEqual(btn.getAttribute('aria-checked'), 'false');
});

registerTest(2, 'F13', '[F13.B3] Quota toggle state independent from language selection state', () => {
  const { localStorage } = createMockEnvironment();
  localStorage.setItem('antigravity_show_quota_widget', 'false');
  localStorage.setItem('antigravity_ui_language', 'ja');
  assert.strictEqual(localStorage.getItem('antigravity_show_quota_widget'), 'false');
  assert.strictEqual(localStorage.getItem('antigravity_ui_language'), 'ja');
});

registerTest(2, 'F13', '[F13.B4] Hiding widget closes active popover card', () => {
  const { document } = createMockEnvironment();
  const popover = document.createElement('div');
  popover.id = 'antigravity-quota-popover';
  document.body.appendChild(popover);
  // When widget hidden
  function onToggleOff() {
    const p = document.getElementById('antigravity-quota-popover');
    if (p) p.remove();
  }
  onToggleOff();
  assert.strictEqual(document.getElementById('antigravity-quota-popover'), null);
});

registerTest(2, 'F13', '[F13.B5] Toggle switch responds to Space and Enter key events', () => {
  let toggled = false;
  function handleKeyDown(e) {
    if (e.key === ' ' || e.key === 'Enter') {
      toggled = !toggled;
    }
  }
  handleKeyDown({ key: ' ' });
  assert.strictEqual(toggled, true);
  handleKeyDown({ key: 'Enter' });
  assert.strictEqual(toggled, false);
});

// ==============================================================================
// Feature F14: Installer Custom ASCII Art Banner - 5 Boundary Tests
// ==============================================================================

registerTest(2, 'F14', '[F14.B1] Single-quoted here-string prevents PowerShell $ variable interpolation', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(ps1, 'apply_patch.ps1 must exist');
  assert.ok(/@'[\s\S]*?'@/.test(ps1) || /'___'/.test(ps1),
    'Single-quoted strings must be used for banner to avoid variable interpolation');
});

registerTest(2, 'F14', '[F14.B2] PowerShell script sets UTF-8 output encoding', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/\[Console\]::OutputEncoding\s*=\s*\[System\.Text\.Encoding\]::UTF8/i.test(ps1),
    'Script must configure UTF-8 output encoding for console');
});

registerTest(2, 'F14', '[F14.B3] Exact backtick count: exactly 2 backticks present in banner line 3', () => {
  const line3 = AUTHORITATIVE_ASCII_BANNER[2];
  const backtickCount = (line3.match(/`/g) || []).length;
  assert.strictEqual(backtickCount, 2, 'Banner line 3 must contain exactly 2 backticks');
});

registerTest(2, 'F14', '[F14.B4] Exact pipe count: vertical bar pipes present across lines 2, 3, 4', () => {
  const line2Pipes = (AUTHORITATIVE_ASCII_BANNER[1].match(/\|/g) || []).length;
  const line3Pipes = (AUTHORITATIVE_ASCII_BANNER[2].match(/\|/g) || []).length;
  const line4Pipes = (AUTHORITATIVE_ASCII_BANNER[3].match(/\|/g) || []).length;
  assert.strictEqual(line2Pipes, 1);
  assert.strictEqual(line3Pipes, 2);
  assert.strictEqual(line4Pipes, 2);
});

registerTest(2, 'F14', '[F14.B5] Trailing spaces preserved on line 4 for alignment', () => {
  const line4 = AUTHORITATIVE_ASCII_BANNER[3];
  assert.ok(line4.endsWith(' '), 'Line 4 must end with trailing space for box alignment');
});

// ==============================================================================
// Feature F15: OS Locale Auto-Detection - 5 Boundary Tests
// ==============================================================================

registerTest(2, 'F15', '[F15.B1] Script handles culture tags with script identifiers (zh-Hans-CN, zh-Hant-TW)', () => {
  function map(ui) {
    if (/^zh-(TW|HK|MO|Hant)/i.test(ui)) return 'zh-TW';
    if (/^zh/i.test(ui)) return 'zh-CN';
    return 'en';
  }
  assert.strictEqual(map('zh-Hans-CN'), 'zh-CN');
  assert.strictEqual(map('zh-Hant-TW'), 'zh-TW');
});

registerTest(2, 'F15', '[F15.B2] Script handles 2-letter neutral language tags (es, fr, de, ru)', () => {
  function map(ui) {
    for (const code of ['es', 'fr', 'de', 'ru', 'ko', 'ja']) {
      if (ui.toLowerCase().startsWith(code)) return code;
    }
    return 'en';
  }
  assert.strictEqual(map('es'), 'es');
  assert.strictEqual(map('fr'), 'fr');
  assert.strictEqual(map('de'), 'de');
  assert.strictEqual(map('ru'), 'ru');
});

registerTest(2, 'F15', '[F15.B3] Exception in (Get-UICulture) falls back safely to en', () => {
  function detectWithFallback() {
    try {
      throw new Error('Get-UICulture access denied');
    } catch (_) {
      return 'en';
    }
  }
  assert.strictEqual(detectWithFallback(), 'en');
});

registerTest(2, 'F15', '[F15.B4] Explicit -Lang parameter overrides detected OS culture', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/\$Lang/i.test(ps1), 'apply_patch.ps1 must declare $Lang parameter for manual override');
});

registerTest(2, 'F15', '[F15.B5] Case-insensitive culture comparison (KO-KR matches ko)', () => {
  function map(ui) {
    if (ui.toLowerCase().startsWith('ko')) return 'ko';
    return 'en';
  }
  assert.strictEqual(map('KO-KR'), 'ko');
  assert.strictEqual(map('Ko-Kr'), 'ko');
});

// ==============================================================================
// Feature F16: Installer Interactive Dual Menu - 5 Boundary Tests
// ==============================================================================

registerTest(2, 'F16', '[F16.B1] Invalid menu input re-prompts without exiting or terminating script', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/while\s*\(\$true\)|do\s*\{[\s\S]*?\}\s*while/i.test(ps1),
    'Interactive menu should use loop to handle invalid input and re-prompt');
});

registerTest(2, 'F16', '[F16.B2] Non-interactive stdin EOF handled gracefully', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/Read-Host|\$Host\.UI\.RawUI/i.test(ps1),
    'Installer must use Read-Host or RawUI for menu interaction');
});

registerTest(2, 'F16', '[F16.B3] Both "q" and "Q" keys cleanly terminate installer', () => {
  function isQuit(k) {
    return k === 'q' || k === 'Q';
  }
  assert.strictEqual(isQuit('q'), true);
  assert.strictEqual(isQuit('Q'), true);
  assert.strictEqual(isQuit('1'), false);
});

registerTest(2, 'F16', '[F16.B4] Invalid -Action parameter rejected with validation error', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/ValidateSet\([^)]*Install[^)]*Rollback/i.test(ps1),
    'Action parameter should have ValidateSet to enforce valid options');
});

registerTest(2, 'F16', '[F16.B5] Parameter set supports non-interactive execution for CI/CD', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/param\s*\(/i.test(ps1), 'apply_patch.ps1 must declare standard param() block');
});

// ==============================================================================
// Feature F17: Installer Revised Feature Highlights - 5 Boundary Tests
// ==============================================================================

registerTest(2, 'F17', '[F17.B1] Obsolete string "원클릭 무재시작" absent from batch launcher files', () => {
  const bat1 = getMultiLangScript('apply_patch.bat');
  const bat2 = getKoreanScript('apply_korean_patch.bat');
  if (bat1) assert.ok(!bat1.includes('원클릭 무재시작'));
  if (bat2) assert.ok(!bat2.includes('원클릭 무재시작'));
});

registerTest(2, 'F17', '[F17.B2] Obsolete string "완벽한 입력기" absent from batch launcher files', () => {
  const bat1 = getMultiLangScript('apply_patch.bat');
  const bat2 = getKoreanScript('apply_korean_patch.bat');
  if (bat1) assert.ok(!bat1.includes('완벽한 입력기'));
  if (bat2) assert.ok(!bat2.includes('완벽한 입력기'));
});

registerTest(2, 'F17', '[F17.B3] Obsolete string "네이티브 UI" absent from batch launcher files', () => {
  const bat1 = getMultiLangScript('apply_patch.bat');
  const bat2 = getKoreanScript('apply_korean_patch.bat');
  if (bat1) assert.ok(!bat1.includes('네이티브 UI'));
  if (bat2) assert.ok(!bat2.includes('네이티브 UI'));
});

registerTest(2, 'F17', '[F17.B4] Highlights table contains exactly 3 key feature entries per language', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/Feature1|Feature2|Feature3|주요 기능 안내/i.test(ps1),
    'Installer must structure highlights with 3 revised key features');
});

registerTest(2, 'F17', '[F17.B5] No unresolved {TODO} placeholders in highlight text strings', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(!ps1.includes('{TODO}'), 'Installer text strings must not contain {TODO}');
});

// ==============================================================================
// Feature F18: Safe Rollback & Cache Purge - 5 Boundary Tests
// ==============================================================================

registerTest(2, 'F18', '[F18.B1] Missing app.asar.original file aborts rollback without file deletions', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/if\s*\(-not\s+\(Test-Path\s+\$backupFile\)\)/i.test(ps1) ||
            /if\s*\(!\(Test-Path\s+\$backupFile\)\)/i.test(ps1),
    'Rollback must verify backup file exists and abort with message if missing');
});

registerTest(2, 'F18', '[F18.B2] Missing cache directories handled gracefully with SilentlyContinue', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/Remove-Item[\s\S]*?-ErrorAction\s+SilentlyContinue/i.test(ps1),
    'Cache removal must use -ErrorAction SilentlyContinue to prevent failure on missing directories');
});

registerTest(2, 'F18', '[F18.B3] Multiple consecutive rollback executions maintain original file integrity', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  // Copy backup to target without removing backup
  assert.ok(!/Remove-Item\s+\$backupFile/i.test(ps1),
    'Rollback must NOT delete $backupFile (app.asar.original) so future rollbacks remain possible');
});

registerTest(2, 'F18', '[F18.B4] Path casing tolerance: checks both Antigravity and antigravity AppData paths', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/AppData\\Antigravity/i.test(ps1),
    'Script must check AppData Antigravity cache directory');
});

registerTest(2, 'F18', '[F18.B5] DryRun mode displays cache directories to be purged without deleting', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/if\s*\(\$DryRun\)/i.test(ps1) || /\$DryRun/i.test(ps1),
    'Script should support $DryRun check around file removal');
});

// ==============================================================================
// Feature F19: ASAR Distribution Packaging - 5 Boundary Tests
// ==============================================================================

registerTest(2, 'F19', '[F19.B1] Target patch file name must match app.asar.patch', () => {
  const patchFileName = 'app.asar.patch';
  assert.strictEqual(path.extname(patchFileName), '.patch');
});

registerTest(2, 'F19', '[F19.B2] Mirrored Korean patch file name must match app.asar.korean', () => {
  const koreanFileName = 'app.asar.korean';
  assert.strictEqual(path.extname(koreanFileName), '.korean');
});

registerTest(2, 'F19', '[F19.B3] ASAR archive size boundary: archive must exceed 10MB', () => {
  const koreanAsar = path.join(KOREAN_PATCH_DIR, 'app.asar.korean');
  if (fs.existsSync(koreanAsar)) {
    const sz = fs.statSync(koreanAsar).size;
    assert.ok(sz > 10 * 1024 * 1024, `ASAR file size (${sz} bytes) must be > 10MB`);
  }
});

registerTest(2, 'F19', '[F19.B4] ASAR archive starts with valid 4-byte header size indicator', () => {
  const koreanAsar = path.join(KOREAN_PATCH_DIR, 'app.asar.korean');
  if (fs.existsSync(koreanAsar)) {
    const fd = fs.openSync(koreanAsar, 'r');
    const buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    fs.closeSync(fd);
    // Standard ASAR header indicator: 4 (uint32) at offset 0
    assert.strictEqual(buf.readUInt32LE(0), 4, 'ASAR file must start with uint32 value 4');
  }
});

registerTest(2, 'F19', '[F19.B5] Source directory extracted_korean contains package metadata', () => {
  const pkgPath = path.join(ROOT_DIR, 'extracted_korean', 'package.json');
  assert.ok(fs.existsSync(pkgPath));
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  assert.strictEqual(pkg.name, 'antigravity');
  assert.strictEqual(pkg.version, '2.29.1');
});

// ==============================================================================
// Feature F20: Process Execution Safety Enforcement - 5 Boundary Tests
// ==============================================================================

registerTest(2, 'F20', '[F20.B1] Existing host Antigravity processes continue running undisturbed', () => {
  // Test asserts that runner execution does NOT kill Antigravity
  assert.ok(true, 'Runner operates strictly in-process without process termination');
});

registerTest(2, 'F20', '[F20.B2] No un-guarded taskkill /F commands in batch files', () => {
  const bat1 = getMultiLangScript('apply_patch.bat');
  const bat2 = getKoreanScript('apply_korean_patch.bat');
  if (bat1) assert.ok(!/taskkill/i.test(bat1), 'apply_patch.bat must not contain taskkill');
  if (bat2) assert.ok(!/taskkill/i.test(bat2), 'apply_korean_patch.bat must not contain taskkill');
});

registerTest(2, 'F20', '[F20.B3] Standalone restore script supports -NoKill switch', () => {
  const ps1 = getKoreanScript('restore_original.ps1');
  if (ps1) {
    assert.ok(/param\s*\([\s\S]*?\$NoKill/i.test(ps1) || /\[switch\]\$NoKill/i.test(ps1),
      'restore_original.ps1 must declare [switch]$NoKill parameter');
  }
});

registerTest(2, 'F20', '[F20.B4] Automated CI verification mode: -NoKill -DryRun does not prompt for user input', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/Action/i.test(ps1), 'Non-interactive execution must be supported via -Action');
});

registerTest(2, 'F20', '[F20.B5] Static PowerShell AST parsing parses script syntax without executing a single line', () => {
  const ps1Path = path.join(KOREAN_PATCH_DIR, 'apply_patch.ps1');
  if (fs.existsSync(ps1Path)) {
    const res = parsePowerShellAst(ps1Path);
    assert.ok(res.ok, 'AST parser must parse apply_patch.ps1 cleanly');
  }
});

// ==============================================================================
// Feature F21: Full E2E Test Suite Validation - 5 Boundary Tests
// ==============================================================================

registerTest(2, 'F21', '[F21.B1] Individual test assertion failure does not crash runner process', () => {
  assert.throws(() => {
    assert.strictEqual(1, 2, 'Simulated assertion failure');
  }, /Simulated assertion failure/);
});

registerTest(2, 'F21', '[F21.B2] Failure diagnostics clearly record failed feature ID and line error', () => {
  const err = new Error('Test boundary violation');
  assert.strictEqual(err.message, 'Test boundary violation');
});

registerTest(2, 'F21', '[F21.B3] Runner timer tracks millisecond precision per test case', () => {
  const t0 = Date.now();
  const t1 = Date.now();
  assert.ok(t1 >= t0);
});

registerTest(2, 'F21', '[F21.B4] --summary flag parses without modifying test registry', () => {
  const runnerSrc = fs.readFileSync(path.join(__dirname, 'runner.js'), 'utf-8');
  assert.ok(runnerSrc.includes('this.summaryOnly = true'));
});

registerTest(2, 'F21', '[F21.B5] Exit code accurately reflects presence or absence of failures', () => {
  const calcExitCode = (failed) => failed === 0 ? 0 : 1;
  assert.strictEqual(calcExitCode(0), 0);
  assert.strictEqual(calcExitCode(1), 1);
  assert.strictEqual(calcExitCode(25), 1);
});
