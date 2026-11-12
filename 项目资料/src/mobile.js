/* 折叠历史记录的锚点导航，手机与桌面共用。 */
"use strict";
(() => {
  const history = document.getElementById("history");
  document.getElementById("historyLink").addEventListener("click", () => { history.open = true; });
  if (location.hash === "#history") history.open = true;
  if (location.hash === "#workout") document.getElementById("openWorkout").click();
})();
