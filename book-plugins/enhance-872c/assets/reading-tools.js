/* 872C 阅读增强
 *
 * 只做四件「点击即得结果」的事，不依赖滚动位置：
 *   1. 本页目录（桌面端浮动，点击跳转）
 *   2. 标题锚点复制链接
 *   3. 文末上/下页导航
 *   4. 键盘快捷键（/ 搜索、g h 首页、? 帮助、Esc 关闭）
 * 另附外链安全属性处理。
 */
(function () {
  "use strict";


  var ICONS = {
    link:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M10 13.9a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/>' +
      '<path d="M14 10.1a5 5 0 0 0-7.1-.1l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1"/>' +
      "</svg>"
  };

  function section() {
    return document.querySelector(".markdown-section, section.normal");
  }

  function pageUrl(id) {
    return location.href.split("#")[0] + "#" + encodeURIComponent(id);
  }

  function copyText(text) {
    // 剪贴板写入可能因缺少用户手势或权限被拒；
    // 调用方据此决定是否给出「已复制」反馈，失败也要能降级。
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () {
        return legacyCopy(text);
      });
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {
      ok = false;
    }
    ta.remove();
    return ok;
  }

  /* ---------- 本页目录 ---------- */

  function buildToc(sec, heads) {
    if (heads.length < 2) return null;

    var toc = document.createElement("nav");
    toc.className = "page-toc";
    toc.setAttribute("aria-label", "本页目录");

    var title = document.createElement("span");
    title.className = "page-toc__title";
    title.textContent = "本页目录";
    toc.appendChild(title);

    heads.forEach(function (h) {
      var level = h.tagName.slice(1);
      if (level === "1") return;

      var a = document.createElement("a");
      a.href = "#" + encodeURIComponent(h.id);
      a.dataset.level = level;
      a.textContent = h.textContent.replace(/\s+/g, " ").trim();

      a.addEventListener("click", function (e) {
        e.preventDefault();
        h.scrollIntoView({ behavior: "smooth", block: "start" });
        // 目标标题的 id 由 HonKit 生成，此处仅同步地址栏
        history.replaceState(null, "", "#" + encodeURIComponent(h.id));
      });

      toc.appendChild(a);
    });

    document.body.appendChild(toc);
    return toc;
  }

  /* ---------- 文末上/下页导航 ---------- */

  function buildPageNav() {
    // HonKit 会在每页 <head> 写入 <link rel="prev|next">
    var prev = document.querySelector('link[rel="prev"]');
    var next = document.querySelector('link[rel="next"]');
    if (!prev && !next) return;

    var sec = section();
    if (!sec) return;

    // 这些 <link> 不带 title，从侧栏目录取对应条目文字即可，
    // 无需额外网络请求。
    function titleFor(link) {
      if (!link) return "";
      var href = link.getAttribute("href");
      if (!href) return "";
      var base = href.split("/").pop().split("#")[0];

      // 侧栏链接与目标页同目录时可直接命中
      var hit = document.querySelector(
        '.book-summary ul.summary li a[href="' + href + '"]'
      );
      if (hit) return hit.textContent.trim();

      // 退化：按文件名在侧栏里找
      var all = document.querySelectorAll(".book-summary ul.summary li a");
      for (var i = 0; i < all.length; i++) {
        var h = all[i].getAttribute("href") || "";
        if (h.split("/").pop().split("#")[0] === base) {
          return all[i].textContent.trim();
        }
      }
      return "";
    }

    var nav = document.createElement("nav");
    nav.className = "page-nav";
    nav.setAttribute("aria-label", "页面导航");

    function item(link, isNext) {
      var a = document.createElement("a");
      a.className = isNext ? "page-nav__next" : "page-nav__prev";

      if (!link) {
        // 首尾页保留占位，维持按钮宽度对称
        a.classList.add("is-empty");
        a.setAttribute("aria-hidden", "true");
        a.href = "#";
        return a;
      }

      a.href = link.getAttribute("href");

      var dir = document.createElement("span");
      dir.className = "page-nav__dir";
      dir.textContent = isNext ? "下一页 →" : "← 上一页";

      var t = document.createElement("span");
      t.className = "page-nav__title";
      t.textContent = titleFor(link) || "—";

      a.appendChild(dir);
      a.appendChild(t);
      return a;
    }

    nav.appendChild(item(prev, false));
    nav.appendChild(item(next, true));

    var last = sec.lastElementChild;
    if (last) {
      last.parentNode.insertBefore(nav, last.nextSibling);
    } else {
      sec.appendChild(nav);
    }
  }

  /* ---------- 快捷键 ---------- */

  function buildHelp() {
    var help = document.createElement("aside");
    help.className = "keyboard-help";
    help.setAttribute("role", "dialog");
    help.setAttribute("aria-label", "键盘快捷键");

    var rows = [
      ["聚焦搜索", "<kbd>/</kbd>"],
      ["回到首页", "<kbd>g</kbd> <kbd>h</kbd>"],
      ["显示此帮助", "<kbd>?</kbd>"],
      ["关闭弹层", "<kbd>Esc</kbd>"]
    ];

    help.innerHTML =
      '<button class="keyboard-help__close" aria-label="关闭">×</button>' +
      "<h2>键盘快捷键</h2>" +
      rows
        .map(function (r) {
          return (
            '<div class="keyboard-help__row"><span>' +
            r[0] +
            "</span><span>" +
            r[1] +
            "</span></div>"
          );
        })
        .join("");

    help.querySelector(".keyboard-help__close").addEventListener("click", function () {
      help.classList.remove("is-open");
    });

    document.body.appendChild(help);
    return help;
  }

  function bindKeys(help) {
    var awaitingG = false;
    var gTimer = null;

    document.addEventListener("keydown", function (e) {
      var tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "/") {
        e.preventDefault();
        var box = document.querySelector("#book-search-input input, #book-search-input");
        if (box) box.focus();
        return;
      }

      if (e.key === "?") {
        help.classList.toggle("is-open");
        return;
      }

      if (e.key === "Escape") {
        help.classList.remove("is-open");
        return;
      }

      if (e.key === "g") {
        awaitingG = true;
        clearTimeout(gTimer);
        gTimer = setTimeout(function () {
          awaitingG = false;
        }, 700);
        return;
      }

      if (awaitingG && e.key === "h") {
        awaitingG = false;
        clearTimeout(gTimer);
        var home = document.querySelector('link[rel="home"]');
        if (home) {
          location.href = home.getAttribute("href") || "index.html";
        } else {
          location.href = location.pathname.replace(/[^/]*$/, "") + "index.html";
        }
      }
    });
  }

  /* ---------- 挂载 ---------- */

  function mount() {
    var sec = section();
    if (!sec) return;

    // 各部件独立判断是否已存在，允许「补建」缺失部分，
    // 同时避免重复挂载（HonKit 单页导航会多次触发）。
    if (!sec.querySelector(".heading-anchor")) {
      var heads = Array.prototype.slice.call(
        sec.querySelectorAll("h1[id], h2[id], h3[id], h4[id]")
      );

      heads.forEach(function (h) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "heading-anchor";
        btn.setAttribute("aria-label", "复制本节链接");
        btn.title = "复制本节链接";
        btn.innerHTML = ICONS.link;

        btn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          copyText(pageUrl(h.id)).then(function () {
            btn.classList.add("is-done");
            btn.title = "已复制";
            setTimeout(function () {
              btn.classList.remove("is-done");
              btn.title = "复制本节链接";
            }, 1400);
          });
        });

        h.appendChild(btn);
      });
    }

    if (!document.querySelector(".page-toc")) {
      var allHeads = Array.prototype.slice.call(
        sec.querySelectorAll("h1[id], h2[id], h3[id], h4[id]")
      );
      buildToc(sec, allHeads);
    }

    if (!document.querySelector(".page-nav")) {
      buildPageNav();
    }

    if (!document.querySelector(".keyboard-help")) {
      bindKeys(buildHelp());
    }

    // 外链在新标签打开，并阻断 tabnabbing
    sec.querySelectorAll('a[href^="http"]').forEach(function (a) {
      if (a.host && a.host !== location.host) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    // HonKit 是单页式导航：脚本可能在 <head> 的 rel=prev/next 写入前执行。
    // 若正文已就绪但目录尚未出现，稍后重试一次即可，避免漏建导航。
    mount();
    if (!document.querySelector(".page-nav") && !document.querySelector(".page-toc")) {
      setTimeout(mount, 120);
    }
  }
})();
