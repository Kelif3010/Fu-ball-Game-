(() => {
  function enhance() {
    const content = document.querySelector(".phone-frame .content");
    const root = document.getElementById("head-to-head-root");
    if (!content || !root) return;
    const active = content.classList.contains("h2h-mode");
    Array.from(content.children).forEach(child => {
      if (child === root || child.classList.contains("top-alert")) return;
      if (active) {
        if (!child.dataset.h2hOldDisplay) child.dataset.h2hOldDisplay = child.style.display || "__empty__";
        child.style.display = "none";
      } else if (child.dataset.h2hOldDisplay) {
        child.style.display = child.dataset.h2hOldDisplay === "__empty__" ? "" : child.dataset.h2hOldDisplay;
        delete child.dataset.h2hOldDisplay;
      }
    });
    root.style.display = active ? "block" : "none";
    root.querySelectorAll(".h2h-head,.h2h-card,.h2h-empty").forEach(el => {
      el.style.borderRadius = "15px";
      el.style.border = "1px solid rgba(255,255,255,.08)";
      el.style.background = "rgba(255,255,255,.04)";
      el.style.padding = "12px";
      el.style.marginBottom = "9px";
    });
  }
  new MutationObserver(enhance).observe(document.documentElement, { childList: true, subtree: true, attributes: true });
  setInterval(enhance, 300);
})();
