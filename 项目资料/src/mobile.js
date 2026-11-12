/* 手机和桌面共享同一份内容；当前锚点只影响导航高亮。 */
"use strict";
(() => {
  const links = [...document.querySelectorAll(".mobile-nav a")];
  function highlight() {
    const y = window.scrollY + window.innerHeight * .32;
    let active = "schedule";
    for (const id of ["schedule", "workout", "history"]) {
      const el = document.getElementById(id);
      if (el && el.offsetTop <= y) active = id;
    }
    links.forEach((a) => {
      const current = a.getAttribute("href") === `#${active}`;
      a.classList.toggle("active", current);
      if (current) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current");
    });
  }
  addEventListener("scroll", highlight, { passive: true });
  addEventListener("resize", highlight);
  // 首次打开带锚点的链接时，等待训练卡填充后再定位。
  if (location.hash) {
    try {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: "instant", block: "start" }));
    } catch { /* 无效锚点无需处理。 */ }
  }
  highlight();
})();
