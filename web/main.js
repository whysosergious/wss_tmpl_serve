import "/src/sh.js";
import "/src/net/mod.js";
import "/src/terminal/mod.js";
import "/src/editor/mod.js";
import "/src/console/mod.js";
import "/src/tree-view/mod.js";

const tabBar = document.querySelector(".tab-bar");
const tabPanes = document.querySelectorAll(".tab-pane");
const tabButtons = document.querySelectorAll(".tab-button");

function switchTab(tabId) {
  tabButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.tab === tabId);
  });
  tabPanes.forEach(pane => {
    pane.classList.toggle("active", pane.dataset.tab === tabId);
  });
  localStorage.setItem("activeTab", tabId);
}

tabBar.addEventListener("click", (event) => {
  if (event.target.matches(".tab-button")) {
    switchTab(event.target.dataset.tab);
  }
});

// Restore last active tab
const savedTab = localStorage.getItem("activeTab") || "terminal";
switchTab(savedTab);
