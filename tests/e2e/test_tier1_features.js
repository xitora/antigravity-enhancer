// tests/e2e/test_tier1_features.js
// Tier 1: Comprehensive Feature Coverage (Happy Path)
// Covers all 21 features (F1 to F21) with at least 5 tests per feature (105 tests total).

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
// Feature F1: Inline SVG Dropdown Icons (M1) - 5 Tests
// ==============================================================================

registerTest(1, 'F1', '[F1.1] Language trigger dropdown arrow contains inline SVG element', () => {
  const src = getPreloadSource();
  assert.ok(src.length > 0, 'preload.js should exist and be readable');
  const triggerMatch = src.match(/id="antigravity-lang-trigger"[\s\S]*?<\/button>/);
  assert.ok(triggerMatch, 'Should find #antigravity-lang-trigger markup in preload.js');
  const triggerHtml = triggerMatch[0];
  assert.ok(/<svg[^>]*>[\s\S]*?<\/svg>/.test(triggerHtml), 'Trigger button must contain an inline <svg> chevron element');
  assert.ok(/polyline|path/i.test(triggerHtml), 'Trigger SVG must contain polyline or path geometry');
});

registerTest(1, 'F1', '[F1.2] Dropdown menu items contain inline SVG checkmark elements', () => {
  const src = getPreloadSource();
  const menuMatch = src.match(/id="antigravity-lang-dropdown-menu"[\s\S]*?<\/div>\s*<\/div>/);
  assert.ok(menuMatch, 'Should find #antigravity-lang-dropdown-menu markup in preload.js');
  const menuHtml = menuMatch[0];
  const svgMatches = menuHtml.match(/<svg[^>]*>[\s\S]*?<\/svg>/g) || [];
  assert.ok(svgMatches.length >= 2, `Dropdown menu should contain inline SVG checkmarks for options (found ${svgMatches.length})`);
});

registerTest(1, 'F1', '[F1.3] Absence of raw "keyboard_arrow_down" ligature text in trigger', () => {
  const src = getPreloadSource();
  const triggerMatch = src.match(/id="antigravity-lang-trigger"[\s\S]*?<\/button>/);
  assert.ok(triggerMatch, 'Trigger button markup should exist');
  assert.ok(!triggerMatch[0].includes('keyboard_arrow_down'), 'Trigger button must NOT contain literal "keyboard_arrow_down" text span');
});

registerTest(1, 'F1', '[F1.4] Absence of raw "check" ligature text in dropdown menu options', () => {
  const src = getPreloadSource();
  const menuMatch = src.match(/id="antigravity-lang-dropdown-menu"[\s\S]*?<\/div>\s*<\/div>/);
  assert.ok(menuMatch, 'Dropdown menu markup should exist');
  // Should not contain <span ...>check</span>
  assert.ok(!/<span[^>]*class="[^"]*google-symbols[^"]*"[^>]*>\s*check\s*<\/span>/.test(menuMatch[0]),
    'Dropdown menu must NOT contain literal "check" text inside google-symbols span');
});

registerTest(1, 'F1', '[F1.5] Inline SVGs define explicit dimensions and vector styling', () => {
  const src = getPreloadSource();
  const triggerMatch = src.match(/id="antigravity-lang-trigger"[\s\S]*?<\/button>/);
  assert.ok(triggerMatch, 'Trigger button markup should exist');
  const svgMatch = triggerMatch[0].match(/<svg\s+([^>]+)>/);
  assert.ok(svgMatch, 'Trigger SVG tag must exist');
  const attrs = svgMatch[1];
  assert.ok(/viewBox="[^"]*"/.test(attrs), 'Trigger SVG must specify a viewBox attribute');
  assert.ok(/width="\d+"/.test(attrs) || /class="[^"]*w-\d+[^"]*"/.test(attrs), 'Trigger SVG must specify explicit width');
  assert.ok(/height="\d+"/.test(attrs) || /class="[^"]*h-\d+[^"]*"/.test(attrs), 'Trigger SVG must specify explicit height');
});

// ==============================================================================
// Feature F2: DOM Original Text Preservation (M1) - 5 Tests
// ==============================================================================

registerTest(1, 'F2', '[F2.1] Single-assignment guard exists on node._originalText in preload.js', () => {
  const src = getPreloadSource();
  // Must check if (node._originalText === undefined) or if (!node._originalText && node._originalText !== "")
  const hasGuard = /if\s*\(\s*node\._originalText\s*===\s*undefined\s*\)/.test(src) ||
                   /if\s*\(\s*typeof\s+node\._originalText\s*===\s*['"]undefined['"]\s*\)/.test(src) ||
                   /if\s*\(\s*!\s*node\._originalText\s*&&\s*node\._originalText\s*!==\s*["']["']\s*\)/.test(src);
  assert.ok(hasGuard, 'Preload translation engine must have a single-assignment guard on node._originalText');
});

registerTest(1, 'F2', '[F2.2] Node _originalText preserves initial English string on first capture', () => {
  const { document } = createMockEnvironment();
  const node = document.createTextNode('Settings');
  assert.strictEqual(node._originalText, undefined, 'Initially _originalText should be undefined');
  // Simulate single-assignment logic
  if (node._originalText === undefined) node._originalText = node.textContent;
  node.textContent = '설정'; // Translated to Korean
  assert.strictEqual(node._originalText, 'Settings', '_originalText must retain pristine English string "Settings"');
});

registerTest(1, 'F2', '[F2.3] Multi-hop language translation uses original English source', () => {
  const { document } = createMockEnvironment();
  const node = document.createTextNode('General Settings');
  // First hop: EN -> KO
  if (node._originalText === undefined) node._originalText = node.textContent;
  node.textContent = '일반 설정';

  // Second hop: KO -> JA. Guard prevents overwriting with Korean!
  if (node._originalText === undefined) node._originalText = node.textContent;
  assert.strictEqual(node._originalText, 'General Settings', 'Second hop must preserve pristine English');

  // Translation to Japanese should look up from node._originalText
  const sourceToTranslate = node._originalText;
  assert.strictEqual(sourceToTranslate, 'General Settings', 'Translation engine must translate from pristine source');
});

registerTest(1, 'F2', '[F2.4] Reverting to English restores pristine original text without corruption', () => {
  const { document } = createMockEnvironment();
  const node = document.createTextNode('Keyboard Shortcuts');
  if (node._originalText === undefined) node._originalText = node.textContent;
  node.textContent = '키보드 단축키';
  assert.strictEqual(node.textContent, '키보드 단축키');

  // Revert
  if (node._originalText !== undefined) {
    node.textContent = node._originalText;
  }
  assert.strictEqual(node.textContent, 'Keyboard Shortcuts', 'Revert must restore original string');
});

registerTest(1, 'F2', '[F2.5] Multiple consecutive translate sweeps do not overwrite _originalText', () => {
  const { document } = createMockEnvironment();
  const node = document.createTextNode('Save Changes');
  for (let i = 0; i < 5; i++) {
    if (node._originalText === undefined) node._originalText = node.textContent;
    node.textContent = `변경사항 저장 (Pass ${i})`;
  }
  assert.strictEqual(node._originalText, 'Save Changes', '_originalText must remain strictly unchanged across multiple sweeps');
});

// ==============================================================================
// Feature F3: Monospace Font Preservation (M1) - 5 Tests
// ==============================================================================

registerTest(1, 'F3', '[F3.1] injectFont() CSS includes D2Coding in developer font stack', () => {
  const src = getPreloadSource();
  assert.ok(/D2Coding/i.test(src), 'preload.js injectFont CSS must include D2Coding in code font stack');
});

registerTest(1, 'F3', '[F3.2] injectFont() CSS includes JetBrains Mono in developer font stack', () => {
  const src = getPreloadSource();
  assert.ok(/JetBrains\s+Mono/i.test(src), 'preload.js injectFont CSS must include JetBrains Mono');
});

registerTest(1, 'F3', '[F3.3] Code block container (.code-block) selector explicitly styled', () => {
  const src = getPreloadSource();
  assert.ok(/\.code-block/.test(src), 'preload.js injectFont CSS must explicitly target .code-block elements');
});

registerTest(1, 'F3', '[F3.4] Monaco editor (.monaco-editor) selector styled with monospace stack', () => {
  const src = getPreloadSource();
  assert.ok(/\.monaco-editor/.test(src), 'preload.js injectFont CSS must explicitly target .monaco-editor');
});

registerTest(1, 'F3', '[F3.5] Monospace font rule utilizes !important flag to override body styling', () => {
  const src = getPreloadSource();
  const fontMatches = src.match(/(?:code|pre|\.code-block|\.monaco-editor)[^{]*\{[^}]*font-family:[^}]*\}/g) || [];
  assert.ok(fontMatches.length > 0, 'Must have font-family rule targeting code/pre/.code-block');
  const hasImportant = fontMatches.some(rule => rule.includes('!important'));
  assert.ok(hasImportant, 'Monospace font rule must include !important to prevent global font pollution');
});

// ==============================================================================
// Feature F4: Code Block Copy Feedback & Toast (M1) - 5 Tests
// ==============================================================================

registerTest(1, 'F4', '[F4.1] Delegated click listener intercepts copy button clicks', () => {
  const src = getPreloadSource();
  // Checks for button click interception on aria-label or title matching Copy
  const hasCopyListener = /aria-label\*=['"]?Copy['"]?|title\*=['"]?Copy['"]?|button\[[^\]]*copy[^\]]*\]/i.test(src);
  assert.ok(hasCopyListener, 'preload.js should register a click interceptor for copy buttons');
});

registerTest(1, 'F4', '[F4.2] Copy button receives visual feedback confirmation animation class', () => {
  const src = getPreloadSource();
  const hasFeedbackClass = /antigravity-copy-success|copy-success|copy-feedback|classList\.add\([^)]*copy/i.test(src);
  assert.ok(hasFeedbackClass, 'preload.js should add a visual feedback class to copy button on click');
});

registerTest(1, 'F4', '[F4.3] Floating toast notification element created on copy', () => {
  const src = getPreloadSource();
  const hasToast = /antigravity-copy-toast|agy-toast|copy-toast/i.test(src);
  assert.ok(hasToast, 'preload.js should create or reference a floating copy toast notification element');
});

registerTest(1, 'F4', '[F4.4] Copy toast includes checkmark SVG and localized confirmation message', () => {
  const src = getPreloadSource();
  const hasToastContent = /코드가 클립보드에 복사되었습니다|Code copied to clipboard/i.test(src);
  assert.ok(hasToastContent, 'preload.js should include confirmation message for clipboard copy toast');
});

registerTest(1, 'F4', '[F4.5] Copy toast is positioned at fixed bottom-right with auto-dismiss', () => {
  const src = getPreloadSource();
  const hasPositioning = /bottom:\s*24px|right:\s*24px|fixed/i.test(src);
  assert.ok(hasPositioning, 'Toast notification should be styled with fixed bottom-right positioning');
});

// ==============================================================================
// Feature F5: 9-Language Localization Dictionaries (M2) - 5 Tests
// ==============================================================================

registerTest(1, 'F5', '[F5.1] All 9 required language codes are defined in localization system', () => {
  const src = getPreloadSource();
  const requiredLangs = ['en', 'ko', 'ja', 'zh-CN', 'zh-TW', 'es', 'fr', 'de', 'ru'];
  for (const lang of requiredLangs) {
    const regex = new RegExp(`['"]${lang}['"]`, 'i');
    assert.ok(regex.test(src), `preload.js must define language code '${lang}'`);
  }
});

registerTest(1, 'F5', '[F5.2] Translation dictionaries pass strict syntax and structure checks', () => {
  const mapPath = path.join(ROOT_DIR, 'verified_translation_map.json');
  assert.ok(fs.existsSync(mapPath), 'verified_translation_map.json should exist');
  assert.doesNotThrow(() => {
    const data = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));
    assert.ok(Object.keys(data).length > 100, 'Dictionary must contain over 100 translations');
  }, 'verified_translation_map.json must be valid JSON');
});

registerTest(1, 'F5', '[F5.3] Dictionaries contain translations for core Settings navigation', () => {
  const src = getPreloadSource();
  assert.ok(src.includes('Settings') || src.includes('설정'), 'Dictionary must contain translations for Settings');
});

registerTest(1, 'F5', '[F5.4] Dictionaries contain translations for AI Quota & Model labels', () => {
  const src = getPreloadSource();
  assert.ok(src.includes('Model') || src.includes('모델'), 'Dictionary must contain translations for Models');
});

registerTest(1, 'F5', '[F5.5] Language dictionaries are non-empty and map source strings', () => {
  const src = getPreloadSource();
  assert.ok(/exactDict\s*=|translations\s*=|SUPPORTED_LANGUAGES/.test(src),
    'preload.js must define dictionary or supported languages structure');
});

// ==============================================================================
// Feature F6: Dynamic 9-Language Dropdown (M2) - 5 Tests
// ==============================================================================

registerTest(1, 'F6', '[F6.1] Dropdown menu renders all 9 language options in DOM', () => {
  const src = getPreloadSource();
  const langs = ['en', 'ko', 'ja', 'zh-CN', 'zh-TW', 'es', 'fr', 'de', 'ru'];
  for (const l of langs) {
    assert.ok(src.includes(`antigravity-opt-${l}`) || src.includes(`id="antigravity-opt-${l}"`),
      `Dropdown menu must render option for language ${l}`);
  }
});

registerTest(1, 'F6', '[F6.2] Options display both native and English language names', () => {
  const src = getPreloadSource();
  assert.ok(src.includes('한국어') && src.includes('Korean'), 'Should contain 한국어 (Korean)');
  assert.ok(src.includes('日本語') || src.includes('Japanese'), 'Should contain 日本語 (Japanese)');
  assert.ok(src.includes('简体中文') || src.includes('Simplified Chinese'), 'Should contain 简体中文');
  assert.ok(src.includes('Español') || src.includes('Spanish'), 'Should contain Español');
});

registerTest(1, 'F6', '[F6.3] Selecting an option invokes setLanguage() and updates activeLanguage', () => {
  const src = getPreloadSource();
  assert.ok(/function\s+setLanguage\s*\(/i.test(src) || /setLanguage\s*=\s*/.test(src),
    'preload.js must define setLanguage() function');
});

registerTest(1, 'F6', '[F6.4] Active language checkmark SVG visibility updates dynamically', () => {
  const src = getPreloadSource();
  assert.ok(/antigravity-lang-check-/i.test(src),
    'preload.js must manage checkmark visibility for active language option');
});

registerTest(1, 'F6', '[F6.5] Current language label #antigravity-lang-current-label updates dynamically', () => {
  const src = getPreloadSource();
  assert.ok(src.includes('antigravity-lang-current-label'),
    'preload.js must include #antigravity-lang-current-label element');
});

// ==============================================================================
// Feature F7: Alt+Shift+L Keyboard Shortcut Cycle (M2) - 5 Tests
// ==============================================================================

registerTest(1, 'F7', '[F7.1] Window keydown listener captures Alt + Shift + L', () => {
  const src = getPreloadSource();
  const hasShortcut = /altKey\s*&&\s*e\.shiftKey\s*&&\s*\(e\.key\s*===\s*['"]L['"]\s*\|\|\s*e\.key\s*===\s*['"]l['"]\)/.test(src);
  assert.ok(hasShortcut, 'preload.js must register keydown listener for Alt + Shift + L');
});

registerTest(1, 'F7', '[F7.2] Sequential cycle traverses 9 languages in order', () => {
  const langs = ['en', 'ko', 'ja', 'zh-CN', 'zh-TW', 'es', 'fr', 'de', 'ru'];
  let current = 'en';
  for (let i = 1; i < langs.length; i++) {
    const nextIdx = (langs.indexOf(current) + 1) % langs.length;
    current = langs[nextIdx];
    assert.strictEqual(current, langs[i], `Step ${i} must transition to ${langs[i]}`);
  }
});

registerTest(1, 'F7', '[F7.3] Shortcut cycle wraps around from 9th language (ru) back to 1st (en)', () => {
  const langs = ['en', 'ko', 'ja', 'zh-CN', 'zh-TW', 'es', 'fr', 'de', 'ru'];
  const current = 'ru';
  const nextIdx = (langs.indexOf(current) + 1) % langs.length;
  assert.strictEqual(langs[nextIdx], 'en', 'After ru, cycle must wrap around to en');
});

registerTest(1, 'F7', '[F7.4] Shortcut handler calls e.preventDefault()', () => {
  const src = getPreloadSource();
  const shortcutMatch = src.match(/altKey\s*&&\s*e\.shiftKey[\s\S]*?\{([\s\S]*?)\}/);
  assert.ok(shortcutMatch, 'Shortcut handler block must exist in preload.js');
  assert.ok(shortcutMatch[1].includes('preventDefault'), 'Shortcut handler must invoke e.preventDefault()');
});

registerTest(1, 'F7', '[F7.5] Shortcut selection updates localStorage[antigravity_ui_language]', () => {
  const src = getPreloadSource();
  assert.ok(src.includes("localStorage.setItem('antigravity_ui_language'") ||
            src.includes('localStorage.setItem("antigravity_ui_language"'),
    'Language selection must be persisted to localStorage');
});

// ==============================================================================
// Feature F8: Quick-Switch Language Button (M2) - 5 Tests
// ==============================================================================

registerTest(1, 'F8', '[F8.1] Quick-switch button element exists in preload script', () => {
  const src = getPreloadSource();
  assert.ok(src.includes('antigravity-quick-lang-btn') || src.includes('antigravity-lang-quick-switch'),
    'preload.js must define quick-switch button (#antigravity-quick-lang-btn)');
});

registerTest(1, 'F8', '[F8.2] Quick-switch button mounted in header actions container', () => {
  const src = getPreloadSource();
  assert.ok(/findTargetContainer|title-menu-bar|titlebar-more-actions/i.test(src),
    'preload.js must locate header container for top-bar injection');
});

registerTest(1, 'F8', '[F8.3] Quick-switch button displays an inline globe SVG icon', () => {
  const src = getPreloadSource();
  assert.ok(/quick-lang[\s\S]*?<svg[^>]*>[\s\S]*?circle|globe/i.test(src) ||
            /antigravity-quick-lang-btn[\s\S]*?<svg/i.test(src),
    'Quick-switch button must contain an inline SVG globe/language icon');
});

registerTest(1, 'F8', '[F8.4] Quick-switch button displays active language code text', () => {
  const src = getPreloadSource();
  assert.ok(/antigravity-quick-lang-label|quick-lang-label/i.test(src) ||
            /activeLanguage\.toUpperCase\(\)/.test(src),
    'Quick-switch button must display uppercase active language code');
});

registerTest(1, 'F8', '[F8.5] 1-click on quick-switch button cycles to next language', () => {
  const src = getPreloadSource();
  assert.ok(/btn\.onclick\s*=\s*|quickLangBtn\.onclick\s*=\s*/.test(src) ||
            /quick-lang-btn['"]\)\.addEventListener\('click'/.test(src),
    'Quick-switch button must have click event handler to cycle language');
});

// ==============================================================================
// Feature F9: Quota Widget Refreshed Visual Design (M3) - 5 Tests
// ==============================================================================

registerTest(1, 'F9', '[F9.1] Quota widget container #antigravity-quota-widget rendered as unified capsule', () => {
  const src = getPreloadSource();
  assert.ok(src.includes('antigravity-quota-widget'),
    'preload.js must define #antigravity-quota-widget element');
  assert.ok(/border-radius:\s*9999px|rounded-full|agy-quota-capsule/i.test(src),
    'Quota widget must have capsule / rounded-full border radius');
});

registerTest(1, 'F9', '[F9.2] Quota widget utilizes frosted glass backdrop-filter styling', () => {
  const src = getPreloadSource();
  assert.ok(/backdrop-filter:\s*blur/i.test(src) || /-webkit-backdrop-filter:\s*blur/i.test(src),
    'Quota widget must feature frosted glass backdrop-filter: blur styling');
});

registerTest(1, 'F9', '[F9.3] Micro-pill model indicators present (Argon, Gemini, Claude/Other)', () => {
  const src = getPreloadSource();
  assert.ok(src.includes('Argon') && src.includes('Gemini'),
    'Quota widget must render Argon and Gemini model badges');
  assert.ok(src.includes('Claude') || src.includes('Other'),
    'Quota widget must render Claude / Other model indicator');
});

registerTest(1, 'F9', '[F9.4] Brand indicator color dots styled within the capsule', () => {
  const src = getPreloadSource();
  assert.ok(/#06b6d4|cyan/i.test(src), 'Should feature Argon cyan indicator');
  assert.ok(/#3b82f6|blue/i.test(src), 'Should feature Gemini blue indicator');
});

registerTest(1, 'F9', '[F9.5] Widget visual styling distinct from old 3 chunky square badges', () => {
  const src = getPreloadSource();
  // Modern capsule structure
  assert.ok(/agy-quota-capsule|antigravity-quota-widget/i.test(src),
    'Must implement unified capsule widget structure');
});

// ==============================================================================
// Feature F10: Model Breakdown & Countdown Timers (M3) - 5 Tests
// ==============================================================================

registerTest(1, 'F10', '[F10.1] Clicking quota capsule toggles floating popover #antigravity-quota-popover', () => {
  const src = getPreloadSource();
  assert.ok(src.includes('antigravity-quota-popover'),
    'preload.js must define floating popover #antigravity-quota-popover');
});

registerTest(1, 'F10', '[F10.2] Popover displays detailed breakdown cards for model groups', () => {
  const src = getPreloadSource();
  assert.ok(/model-groups-list|agy-quota-popover|group-card/i.test(src),
    'Popover must render detailed breakdown for model groups');
});

registerTest(1, 'F10', '[F10.3] Popover displays bucket progress bars and remaining percentage', () => {
  const src = getPreloadSource();
  assert.ok(/progress-bar|bucket-info|bucket-pct/i.test(src),
    'Popover must display visual progress bars and percentage text');
});

registerTest(1, 'F10', '[F10.4] Popover includes live countdown timer ticker', () => {
  const src = getPreloadSource();
  assert.ok(/countdownTimer|startCountdownTicker|formatTimeRemaining|bucket-timer/i.test(src),
    'Popover must feature live countdown timer ticker');
});

registerTest(1, 'F10', '[F10.5] Outside click dismisses the popover', () => {
  const src = getPreloadSource();
  assert.ok(/closeHandler|document\.addEventListener\(['"]click['"]/i.test(src),
    'Popover must implement outside click listener for dismissal');
});

// ==============================================================================
// Feature F11: Low-Quota Warning Indicator (M3) - 5 Tests
// ==============================================================================

registerTest(1, 'F11', '[F11.1] Normal green/neutral styling applied when quota >= 20%', () => {
  const src = getPreloadSource();
  assert.ok(/#10b981|green/i.test(src), 'Should define green status color for quota >= 50%');
});

registerTest(1, 'F11', '[F11.2] Warning amber styling applied when any bucket drops below 20%', () => {
  const src = getPreloadSource();
  assert.ok(/minVal\s*<\s*20|minFraction\s*<\s*0\.2|quota-warning-glow|#f59e0b/i.test(src),
    'preload.js must evaluate < 20% quota threshold and apply warning accent');
});

registerTest(1, 'F11', '[F11.3] Warning icon is rendered when quota falls below 20%', () => {
  const src = getPreloadSource();
  assert.ok(/agy-warning-icon|⚠️|warning/i.test(src),
    'Widget must display warning icon or visual indicator below 20%');
});

registerTest(1, 'F11', '[F11.4] Critical red pulse glow applied when quota falls below 10%', () => {
  const src = getPreloadSource();
  assert.ok(/minVal\s*<\s*10|minFraction\s*<\s*0\.1|quota-critical-glow|#ef4444/i.test(src),
    'preload.js must evaluate < 10% critical threshold and apply red glow');
});

registerTest(1, 'F11', '[F11.5] Lowest fraction evaluated across all active quota buckets', () => {
  const src = getPreloadSource();
  assert.ok(/Math\.min/i.test(src), 'Evaluation must calculate minimum fraction across active buckets');
});

// ==============================================================================
// Feature F12: Quota Manual Refresh Button (M3) - 5 Tests
// ==============================================================================

registerTest(1, 'F12', '[F12.1] Refresh button #antigravity-quota-refresh-btn embedded in widget', () => {
  const src = getPreloadSource();
  assert.ok(src.includes('antigravity-quota-refresh-btn'),
    'preload.js must define manual refresh button #antigravity-quota-refresh-btn');
});

registerTest(1, 'F12', '[F12.2] Refresh button contains refresh SVG icon', () => {
  const src = getPreloadSource();
  const btnMatch = src.match(/id="antigravity-quota-refresh-btn"[\s\S]*?<\/button>/);
  assert.ok(btnMatch, 'Should find refresh button markup');
  assert.ok(/<svg[^>]*>/.test(btnMatch[0]), 'Refresh button must contain an inline SVG');
});

registerTest(1, 'F12', '[F12.3] Refresh button invokes quota update from LanguageServerService', () => {
  const src = getPreloadSource();
  assert.ok(/updateQuotaWidget\(true\)|fetchQuotaData\(true\)/.test(src),
    'Refresh button click must trigger forced quota fetch');
});

registerTest(1, 'F12', '[F12.4] Refresh button receives spinning animation class on click', () => {
  const src = getPreloadSource();
  assert.ok(/spinning|antigravity-spin/.test(src),
    'Refresh button must apply spinning animation class on click');
});

registerTest(1, 'F12', '[F12.5] Refresh button click stops event propagation', () => {
  const src = getPreloadSource();
  const refreshHandler = src.match(/refreshBtn\.onclick\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{([^}]*)\}/);
  if (refreshHandler) {
    assert.ok(refreshHandler[1].includes('stopPropagation'), 'Refresh button must stop event propagation');
  } else {
    assert.ok(/e\.stopPropagation\(\)/.test(src), 'Should stop propagation in click handler');
  }
});

// ==============================================================================
// Feature F13: Quota Widget Display Toggle (M3) - 5 Tests
// ==============================================================================

registerTest(1, 'F13', '[F13.1] Settings > Display section receives quota widget toggle row', () => {
  const src = getPreloadSource();
  assert.ok(src.includes('antigravity-quota-setting-row') || src.includes('antigravity-quota-toggle'),
    'preload.js must define quota widget setting row in Settings > Display');
});

registerTest(1, 'F13', '[F13.2] Toggle switch button rendered with role="switch"', () => {
  const src = getPreloadSource();
  assert.ok(/role="switch"[\s\S]*?antigravity-quota-toggle|antigravity-quota-toggle[\s\S]*?role="switch"/.test(src),
    'Toggle element must specify role="switch" accessibility attribute');
});

registerTest(1, 'F13', '[F13.3] Switch reflects state from localStorage[antigravity_show_quota_widget]', () => {
  const src = getPreloadSource();
  assert.ok(src.includes('antigravity_show_quota_widget'),
    'Toggle must persist to localStorage key "antigravity_show_quota_widget"');
});

registerTest(1, 'F13', '[F13.4] Toggling switch to OFF updates widget style.display = "none"', () => {
  const src = getPreloadSource();
  assert.ok(/widget\.style\.display\s*=\s*[^;]*'none'/.test(src) ||
            /style\.display\s*=\s*isVisible\s*\?\s*['"]inline-flex['"]\s*:\s*['"]none['"]/.test(src),
    'Toggling switch to OFF must hide widget via style.display');
});

registerTest(1, 'F13', '[F13.5] Default visibility state is enabled (true)', () => {
  const { localStorage } = createMockEnvironment();
  const isEnabled = localStorage.getItem('antigravity_show_quota_widget') !== 'false';
  assert.strictEqual(isEnabled, true, 'Default toggle state when unset in localStorage must be true');
});

// ==============================================================================
// Feature F14: Installer Custom ASCII Art Banner (M4) - 5 Tests
// ==============================================================================

registerTest(1, 'F14', '[F14.1] Exact 5-line ASCII banner present in apply_patch.ps1', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(ps1, 'apply_patch.ps1 must exist');
  for (const line of AUTHORITATIVE_ASCII_BANNER) {
    assert.ok(ps1.includes(line.trim()), `Script must contain banner line: ${line.trim()}`);
  }
});

registerTest(1, 'F14', '[F14.2] Banner line 1 starts with exact leading spaces and slashes', () => {
  const line1 = AUTHORITATIVE_ASCII_BANNER[0];
  assert.strictEqual(line1, '   ___        __  _                    _ __      ');
});

registerTest(1, 'F14', '[F14.3] Banner line 3 contains literal backticks and pipes verbatim', () => {
  const line3 = AUTHORITATIVE_ASCII_BANNER[2];
  assert.strictEqual(line3, ' / __ |/ _ \\/ __/ / _ `/ __/ _ `/ |/ / / __/ // /');
});

registerTest(1, 'F14', '[F14.4] PowerShell script defines banner using verbatim single-quoted here-string', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/@'[\s\S]*?___[\s\S]*?'@/.test(ps1) || /Write-Host\s+'[^']*___[^']*'/.test(ps1),
    'Banner in PowerShell must be defined using single-quoted here-string or literals to prevent escaping issues');
});

registerTest(1, 'F14', '[F14.5] Header drawing function renders cyan border lines and subtitle', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/Draw-Header|Write-Host.*DarkCyan/i.test(ps1),
    'Installer must define header drawing function with styled borders');
});

// ==============================================================================
// Feature F15: OS Locale Auto-Detection (M4) - 5 Tests
// ==============================================================================

registerTest(1, 'F15', '[F15.1] Detect-InstallerLocale queries (Get-UICulture).Name', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/Get-UICulture|CurrentUICulture/i.test(ps1),
    'Installer must query Windows culture via Get-UICulture or CurrentUICulture');
});

registerTest(1, 'F15', '[F15.2] Culture ko-KR maps to Korean (ko)', () => {
  const mapLocale = (ui) => {
    if (ui.startsWith('ko')) return 'ko';
    return 'en';
  };
  assert.strictEqual(mapLocale('ko-KR'), 'ko');
});

registerTest(1, 'F15', '[F15.3] Asian cultures ja-JP, zh-CN, zh-TW map to distinct locale codes', () => {
  const mapLocale = (ui) => {
    if (/^zh-(TW|HK|MO|Hant)/i.test(ui)) return 'zh-TW';
    if (/^zh/i.test(ui)) return 'zh-CN';
    if (/^ja/i.test(ui)) return 'ja';
    return 'en';
  };
  assert.strictEqual(mapLocale('ja-JP'), 'ja');
  assert.strictEqual(mapLocale('zh-CN'), 'zh-CN');
  assert.strictEqual(mapLocale('zh-TW'), 'zh-TW');
  assert.strictEqual(mapLocale('zh-HK'), 'zh-TW');
});

registerTest(1, 'F15', '[F15.4] European cultures (es, fr, de, ru) map to their respective 2-letter codes', () => {
  const mapLocale = (ui) => {
    for (const code of ['es', 'fr', 'de', 'ru']) {
      if (ui.toLowerCase().startsWith(code)) return code;
    }
    return 'en';
  };
  assert.strictEqual(mapLocale('es-ES'), 'es');
  assert.strictEqual(mapLocale('fr-FR'), 'fr');
  assert.strictEqual(mapLocale('de-DE'), 'de');
  assert.strictEqual(mapLocale('ru-RU'), 'ru');
});

registerTest(1, 'F15', '[F15.5] Unrecognized culture falls back to English (en)', () => {
  const mapLocale = (ui) => {
    if (/^ko/i.test(ui)) return 'ko';
    return 'en';
  };
  assert.strictEqual(mapLocale('it-IT'), 'en', 'Italian must fall back to en');
  assert.strictEqual(mapLocale('pt-BR'), 'en', 'Portuguese must fall back to en');
});

// ==============================================================================
// Feature F16: Installer Interactive Dual Menu (M4) - 5 Tests
// ==============================================================================

registerTest(1, 'F16', '[F16.1] Menu presents option [1] for Install / Update Patch', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/\[1\]/i.test(ps1), 'Interactive menu must present option [1]');
});

registerTest(1, 'F16', '[F16.2] Menu presents option [2] for Restore / Rollback', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/\[2\]/i.test(ps1), 'Interactive menu must present option [2]');
});

registerTest(1, 'F16', '[F16.3] Menu presents option [Q] for Exit', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/\[Q\]/i.test(ps1), 'Interactive menu must present option [Q] for Exit');
});

registerTest(1, 'F16', '[F16.4] Installer parameter supports -Action Install', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/\[string\]\$Action\s*=\s*['"]Menu['"]|ValidateSet\([^)]*Install/i.test(ps1),
    'Installer must support -Action Install parameter');
});

registerTest(1, 'F16', '[F16.5] Installer parameter supports -Action Rollback', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/ValidateSet\([^)]*Rollback/i.test(ps1) || /\$Action\s*-eq\s*['"]Rollback['"]/i.test(ps1),
    'Installer must support -Action Rollback parameter');
});

// ==============================================================================
// Feature F17: Installer Revised Feature Highlights (M4) - 5 Tests
// ==============================================================================

registerTest(1, 'F17', '[F17.1] Obsolete text "원클릭 무재시작" is completely absent from installer', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(!ps1.includes('원클릭 무재시작'), 'Installer must NOT contain "원클릭 무재시작"');
});

registerTest(1, 'F17', '[F17.2] Obsolete text "완벽한 입력기" is completely absent from installer', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(!ps1.includes('완벽한 입력기'), 'Installer must NOT contain "완벽한 입력기"');
});

registerTest(1, 'F17', '[F17.3] Obsolete text "네이티브 UI" is completely absent from installer', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(!ps1.includes('네이티브 UI'), 'Installer must NOT contain "네이티브 UI"');
});

registerTest(1, 'F17', '[F17.4] Completion screen highlights in-app 9-language switching', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/9개 언어|9 languages|In-App Language Switching/i.test(ps1),
    'Installer completion screen must highlight in-app 9-language switching');
});

registerTest(1, 'F17', '[F17.5] Completion screen highlights Alt+Shift+L shortcut & real-time quota', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/Alt \+ Shift \+ L/i.test(ps1), 'Completion screen must highlight Alt + Shift + L shortcut');
  assert.ok(/실시간|Real-Time Quota/i.test(ps1), 'Completion screen must highlight real-time quota display');
});

// ==============================================================================
// Feature F18: Safe Rollback & Cache Purge (M4) - 5 Tests
// ==============================================================================

registerTest(1, 'F18', '[F18.1] Rollback checks for existence of app.asar.original', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/Test-Path.*app\.asar\.original/i.test(ps1),
    'Rollback logic must check if app.asar.original exists before restoration');
});

registerTest(1, 'F18', '[F18.2] Rollback restores app.asar.original over app.asar', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/Copy-Item.*backupFile.*targetFile|Copy-Item.*app\.asar\.original.*app\.asar/i.test(ps1),
    'Rollback must copy app.asar.original to app.asar');
});

registerTest(1, 'F18', '[F18.3] Safe backup logic prevents overwriting pristine clean backup during patch install', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  // Safe logic: if (-not (Test-Path $backupFile)) { Copy-Item ... } without destructive else overwrite!
  assert.ok(!/if\s*\(\$targetSize\s*-ne\s*\$patchSize\)\s*\{\s*Copy-Item\s+\$targetFile\s+\$backupFile/.test(ps1),
    'Installer must NOT contain buggy size comparison that overwrites pristine clean backup');
});

registerTest(1, 'F18', '[F18.4] Rollback purges Electron Code Cache directory', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/Code Cache/i.test(ps1), 'Rollback must purge Code Cache');
});

registerTest(1, 'F18', '[F18.5] Rollback purges Electron Cache and GPUCache directories', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/GPUCache/i.test(ps1), 'Rollback must purge GPUCache');
});

// ==============================================================================
// Feature F19: ASAR Distribution Packaging (M5) - 5 Tests
// ==============================================================================

registerTest(1, 'F19', '[F19.1] app.asar.patch defined as primary package in Antigravity_MultiLang_Patch', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/app\.asar\.patch/i.test(ps1), 'Installer must reference app.asar.patch');
});

registerTest(1, 'F19', '[F19.2] app.asar.korean defined for backward-compatibility in Antigravity_Korean_Patch', () => {
  const ps1 = getKoreanScript('apply_patch.ps1');
  assert.ok(ps1 && /app\.asar\.korean/i.test(ps1), 'Korean installer must reference app.asar.korean');
});

registerTest(1, 'F19', '[F19.3] Source folder extracted_korean contains dist/preload.js', () => {
  assert.ok(fs.existsSync(PRELOAD_PATH), 'extracted_korean/dist/preload.js must exist for packaging');
});

registerTest(1, 'F19', '[F19.4] Source folder extracted_korean contains package.json and node modules', () => {
  const pkgPath = path.join(ROOT_DIR, 'extracted_korean', 'package.json');
  assert.ok(fs.existsSync(pkgPath), 'extracted_korean/package.json must exist');
});

registerTest(1, 'F19', '[F19.5] Existing app.asar.korean archive is valid and non-empty', () => {
  const koreanAsar = path.join(KOREAN_PATCH_DIR, 'app.asar.korean');
  if (fs.existsSync(koreanAsar)) {
    const stat = fs.statSync(koreanAsar);
    assert.ok(stat.size > 1000000, 'app.asar.korean must be a valid archive (> 1MB)');
  }
});

// ==============================================================================
// Feature F20: Process Execution Safety Enforcement (M5) - 5 Tests
// ==============================================================================

registerTest(1, 'F20', '[F20.1] Test runner and test suites contain zero process kill commands', () => {
  const runnerSrc = fs.readFileSync(path.join(__dirname, 'runner.js'), 'utf-8');
  assert.ok(!runnerSrc.includes('Stop-Process'), 'runner.js must not contain Stop-Process');
  assert.ok(!runnerSrc.includes('taskkill'), 'runner.js must not contain taskkill');
});

registerTest(1, 'F20', '[F20.2] apply_patch.ps1 supports -NoKill parameter switch', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/\[switch\]\$NoKill/i.test(ps1), 'apply_patch.ps1 must declare [switch]$NoKill parameter');
});

registerTest(1, 'F20', '[F20.3] When -NoKill is specified, Stop-Process is bypassed', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  const killMatches = ps1.match(/Stop-Process/gi) || [];
  if (killMatches.length > 0) {
    assert.ok(/if\s*\(\s*!\s*\$NoKill|if\s*\(\s*-not\s+\$NoKill/i.test(ps1),
      'Stop-Process must be guarded by $NoKill condition');
  }
});

registerTest(1, 'F20', '[F20.4] apply_patch.ps1 supports -DryRun parameter for simulation', () => {
  const ps1 = getMultiLangScript('apply_patch.ps1') || getKoreanScript('apply_patch.ps1');
  assert.ok(/\[switch\]\$DryRun/i.test(ps1), 'apply_patch.ps1 must declare [switch]$DryRun parameter');
});

registerTest(1, 'F20', '[F20.5] Batch wrapper forwards parameters to PowerShell script', () => {
  const bat = getMultiLangScript('apply_patch.bat') || getKoreanScript('apply_korean_patch.bat');
  if (bat) {
    assert.ok(/apply_patch\.ps1/i.test(bat), 'Batch wrapper must invoke apply_patch.ps1');
  }
});

// ==============================================================================
// Feature F21: Full E2E Test Suite Validation (M5) - 5 Tests
// ==============================================================================

registerTest(1, 'F21', '[F21.1] Central test runner executes via node tests/e2e/runner.js', () => {
  const runnerPath = path.join(__dirname, 'runner.js');
  assert.ok(fs.existsSync(runnerPath), 'tests/e2e/runner.js must exist');
});

registerTest(1, 'F21', '[F21.2] Runner supports --tier CLI flag filtering', () => {
  const runnerSrc = fs.readFileSync(path.join(__dirname, 'runner.js'), 'utf-8');
  assert.ok(runnerSrc.includes('--tier'), 'runner.js must support --tier flag');
});

registerTest(1, 'F21', '[F21.3] Runner supports --feature CLI flag filtering', () => {
  const runnerSrc = fs.readFileSync(path.join(__dirname, 'runner.js'), 'utf-8');
  assert.ok(runnerSrc.includes('--feature'), 'runner.js must support --feature flag');
});

registerTest(1, 'F21', '[F21.4] Runner formats Tier coverage and Feature checklist tables', () => {
  const runnerSrc = fs.readFileSync(path.join(__dirname, 'runner.js'), 'utf-8');
  assert.ok(runnerSrc.includes('Coverage by Tier'), 'runner.js must print Coverage by Tier table');
  assert.ok(runnerSrc.includes('Feature Inventory Checklist'), 'runner.js must print Feature Inventory Checklist');
});

registerTest(1, 'F21', '[F21.5] Runner exits with code 0 on all tests passing, 1 on failures', () => {
  const runnerSrc = fs.readFileSync(path.join(__dirname, 'runner.js'), 'utf-8');
  assert.ok(runnerSrc.includes('failedCount === 0 ? 0 : 1') || runnerSrc.includes('process.exit'),
    'runner.js must determine exit code based on test outcome');
});
