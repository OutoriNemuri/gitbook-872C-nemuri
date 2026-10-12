/* 872C 官方文档集 — 深浅色切换
 *
 * 设计原则：**接管，而不是另起一套**
 *
 * HonKit 自带 fontsettings 插件本就有三档配色（White / Sepia / Night），
 * 状态存在 localStorage 的 fontState 里、以 .book 上的 color-theme-N 类生效。
 * 问题只是入口藏在「字体设置(A)」面板里，毫无提示。
 *
 * 因此本脚本不再自建主题体系，而是：
 *   1. 把 true/false 语义映射到插件原有的 color-theme-N
 *   2. 在顶部工具栏注入一个直拍按钮（月亮/太阳）
 *   3. 通过 gitbook.storage 与插件共享同一份状态，双向同步
 *
 * 这样插件的字体设置面板依然可用，两者永不打架。
 */
(function () {
  "use strict";

  var STORAGE_KEY = "fontState";
  var root = document.documentElement;

  /* 插件主题 id：0=White 1=Sepia 2=Night */
  var LIGHT_ID = 0;
  var DARK_ID = 2;

  /* ---------- 与插件共享的存储读写 ---------- */

  function readFontState() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      return s && typeof s === "object" ? s : null;
    } catch (e) {
      return null;
    }
  }

  function writeFontState(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* 隐私模式下无法持久化，仅本次会话生效 */
    }
  }

  /* ---------- 读取 / 应用模式 ---------- */

  function bookEl() {
    return document.querySelector(".book");
  }

  // 权威来源：.book 上的 color-theme-N 类（插件写入）
  function currentMode() {
    var book = bookEl();
    if (book) {
      if (book.classList.contains("color-theme-2")) return "dark";
      if (book.classList.contains("color-theme-1")) return "dark"; // Sepia 也归入深色档
      if (book.classList.contains("color-theme-0")) return "light";
    }
    // DOM 尚未就绪时，退回存储值
    var s = readFontState();
    if (s && (s.theme === 1 || s.theme === 2)) return "dark";
    if (s && s.theme === 0) return "light";
    // 再退回系统偏好
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function applyMode(mode) {
    var book = bookEl();
    var id = mode === "dark" ? DARK_ID : LIGHT_ID;

    // 1) 写入插件自己的类，插件面板会同步高亮
    if (book) {
      book.classList.remove("color-theme-0", "color-theme-1", "color-theme-2");
      book.classList.add("color-theme-" + id);
    }

    // 2) html[data-theme] 供本项目 CSS 与首屏防闪使用
    root.setAttribute("data-theme", mode);

    // 3) 合并进插件状态对象，保留字号/字体，不覆盖用户其它偏好
    var state = readFontState() || {};
    state.theme = id;
    if (typeof state.size !== "number") state.size = 2;
    if (typeof state.family !== "number") state.family = 1;
    writeFontState(state);

    // 4) 通知插件重新渲染（若其 API 可用）
    try {
      if (window.gitbook && window.gitbook.fontsettings) {
        window.gitbook.fontsettings.setTheme(mode === "dark" ? "night" : "white");
      }
    } catch (e) {
      /* 插件未就绪时忽略，类名已足够生效 */
    }

    syncButton();
  }

  /* ---------- 按钮 ---------- */

  var SUN =
    '<svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="4.2"/>' +
    '<path d="M12 2.5v2.2M12 19.3v2.2M4.22 4.22l1.56 1.56M18.22 18.22l1.56 1.56' +
    'M2.5 12h2.2M19.3 12h2.2M4.22 19.78l1.56-1.56M18.22 5.78l1.56-1.56"/>' +
    "</svg>";

  var MOON =
    '<svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M20.5 14.6A8.6 8.6 0 1 1 9.4 3.5a7 7 0 0 0 11.1 11.1z"/>' +
    "</svg>";

  function currentButton() {
    return document.querySelector(".theme-toggle");
  }

  function syncButton() {
    var btn = currentButton();
    if (!btn) return;
    var dark = currentMode() === "dark";
    btn.setAttribute("aria-pressed", dark ? "true" : "false");
    btn.setAttribute("aria-label", dark ? "切换到浅色模式" : "切换到深色模式");
    btn.title = dark ? "切换到浅色模式" : "切换到深色模式";
  }

  function buildButton() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-toggle";
    btn.innerHTML = MOON + SUN;
    btn.addEventListener("click", function () {
      applyMode(currentMode() === "dark" ? "light" : "dark");
    });
    return btn;
  }

  function mount() {
    var target =
      document.querySelector(".book-header .pull-right") ||
      document.querySelector(".book-header .pull-left") ||
      document.querySelector(".book-header");
    if (!target) return false;
    if (target.querySelector(".theme-toggle")) return true;

    var btn = buildButton();
    if (target.classList.contains("pull-right")) {
      var fs = target.querySelector(".font-settings");
      // 与字体设置按钮并排，而不是抢它的位置
      if (fs && fs.nextSibling) {
        target.insertBefore(btn, fs.nextSibling);
      } else {
        target.insertBefore(btn, target.firstChild);
      }
    } else {
      target.appendChild(btn);
    }
    syncButton();
    return true;
  }

  /* ---------- 跟随系统（仅当用户从未手动选择过） ---------- */

  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onSysChange = function (e) {
      var s = readFontState();
      // theme 字段已被用户显式写过 -> 尊重用户选择，不跟随系统
      if (s && (s.theme === 0 || s.theme === 1 || s.theme === 2)) return;
      applyMode(e.matches ? "dark" : "light");
    };
    if (mq.addEventListener) mq.addEventListener("change", onSysChange);
    else if (mq.addListener) mq.addListener(onSysChange);
  }

  /* ---------- 首屏：若用户存过偏好但 DOM 尚未打类，补上 ---------- */

  function ensureClassOnLoad() {
    var s = readFontState();
    if (!s || (s.theme !== 0 && s.theme !== 1 && s.theme !== 2)) return;
    var book = bookEl();
    if (!book) return;
    if (!book.classList.contains("color-theme-" + s.theme)) {
      applyMode(s.theme === 0 ? "light" : "dark");
    }
  }

  /* ---------- 初始化 ---------- */

  function init() {
    ensureClassOnLoad();
    var tries = 0;
    (function attempt() {
      if (mount() || tries++ > 40) return;
      setTimeout(attempt, 60);
    })();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // HonKit 是单页式导航，页面切换会重建 DOM，需重新挂载
  var lastUrl = location.href;
  setInterval(function () {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(init, 90);
    }
  }, 400);
})();
