import "/src/sh.js";
import "/src/lib/mod.js";
import "/src/net/mod.js";
import "/src/terminal/mod.js";
import "/src/editor/mod.js";
import "/src/console/mod.js";
import "/src/tree-view/mod.js";
import "/src/tabs/tabs.js";
import "/src/workspace/workspace.js";
import "/src/components/mod.js";
import { WssPreviewPanel } from "/src/preview/mod.js";

// Global variables for preview panel state
let isPreviewCollapsed = localStorage.getItem("isPreviewCollapsed") === "true";
let previewPanelFlexBasisCache =
  localStorage.getItem("previewPanelWidth") || "150px"; // Initialize with saved width or default

document.addEventListener("DOMContentLoaded", () => {
  const tabBar = document.querySelector(".tab-bar");
  const tabPanes = document.querySelectorAll(".tab-pane");
  const tabButtons = document.querySelectorAll(".tab-button");

  function switchTab(tabId) {
    tabButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === tabId);
    });
    tabPanes.forEach((pane) => {
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

  // Resizing logic (Vertical - for Terminal/Workspace)
  const workspaceElement = document.querySelector("wss-workspace");
  const terminalConsoleContainer = document.querySelector(
    ".terminal-console-container",
  );
  const bottomResizer = document.getElementById("bottom-resizer");

  const MIN_HEIGHT = 50; // Minimum height in pixels for both workspace and terminal

  let isResizing = false;
  let lastY;
  let workspaceInitialHeight;
  let terminalInitialHeight;

  function startResize(e) {
    isResizing = true;
    lastY = e.clientY;
    workspaceInitialHeight = workspaceElement.offsetHeight;
    terminalInitialHeight = terminalConsoleContainer.offsetHeight;

    document.addEventListener("mousemove", resize);
    document.addEventListener("mouseup", stopResize);
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
    document.body.style.pointerEvents = "none"; // Prevent text selection and other events during drag
  }

  function resize(e) {
    if (!isResizing) return;

    const deltaY = e.clientY - lastY;

    let newWorkspaceHeight = workspaceInitialHeight + deltaY;
    let newTerminalHeight = terminalInitialHeight - deltaY;

    if (newWorkspaceHeight < MIN_HEIGHT || newTerminalHeight < MIN_HEIGHT) {
      return; // Prevent shrinking below min height
    }

    workspaceElement.style.flexBasis = `${newWorkspaceHeight}px`;
    terminalConsoleContainer.style.flexBasis = `${newTerminalHeight}px`;
    localStorage.setItem("terminalHeight", `${newTerminalHeight}px`);
  }

  function stopResize() {
    isResizing = false;
    document.removeEventListener("mousemove", resize);
    document.removeEventListener("mouseup", stopResize);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    document.body.style.pointerEvents = "";
  }

  bottomResizer.addEventListener("mousedown", startResize);

  // Resizing logic (Horizontal - for File Explorer) and Toggling
  const fileExplorerContainer = document.querySelector(
    ".file-explorer-container",
  );
  const editorTerminalContainer = document.querySelector(
    ".editor-terminal-container",
  );
  const rightResizer = document.getElementById("right-resizer");
  const toggleFileExplorerButton = document.getElementById(
    "toggle-file-explorer",
  );
  const mainLayoutContainer = document.querySelector(".main-layout-container"); // NEW

  const MIN_FILE_EXPLORER_WIDTH = 20; // Collapsed width
  const INITIAL_FILE_EXPLORER_WIDTH = 250; // Initial expanded width
  const MIN_EDITOR_TERMINAL_WIDTH = 200; // Minimum width for the editor/terminal area

  let isHorizontalResizing = false;
  let lastX;
  let fileExplorerInitialWidthPx; // Renamed for clarity
  let editorTerminalInitialWidthPx; // Renamed for clarity

  function startHorizontalResize(e) {
    isHorizontalResizing = true;
    lastX = e.clientX;
    fileExplorerInitialWidthPx = fileExplorerContainer.offsetWidth; // Get current pixel width
    editorTerminalInitialWidthPx = editorTerminalContainer.offsetWidth; // Get current pixel width

    // Temporarily disable transition for smooth resizing
    fileExplorerContainer.style.transition = "none";

    // Ensure flex properties for dragging
    fileExplorerContainer.style.flexGrow = "0";
    fileExplorerContainer.style.flexShrink = "0";
    editorTerminalContainer.style.flexGrow = "1";
    editorTerminalContainer.style.flexShrink = "1";

    document.addEventListener("mousemove", resizeHorizontal);
    document.addEventListener("mouseup", stopHorizontalResize);
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    document.body.style.pointerEvents = "none";
  }

  function resizeHorizontal(e) {
    if (!isHorizontalResizing) return;

    const deltaX = e.clientX - lastX;
    const totalLayoutWidth = mainLayoutContainer.offsetWidth; // Get total width during resize

    let newFileExplorerWidthPx = fileExplorerInitialWidthPx + deltaX;
    let newEditorTerminalWidthPx = totalLayoutWidth - newFileExplorerWidthPx; // Recalculate editor width

    // Boundary checks
    if (newFileExplorerWidthPx < MIN_FILE_EXPLORER_WIDTH) {
      newFileExplorerWidthPx = MIN_FILE_EXPLORER_WIDTH;
    }
    if (newEditorTerminalWidthPx < MIN_EDITOR_TERMINAL_WIDTH) {
      newFileExplorerWidthPx = totalLayoutWidth - MIN_EDITOR_TERMINAL_WIDTH;
    }

    // Final check to prevent overlap/negative sizes
    if (newFileExplorerWidthPx > totalLayoutWidth - MIN_EDITOR_TERMINAL_WIDTH) {
      newFileExplorerWidthPx = totalLayoutWidth - MIN_EDITOR_TERMINAL_WIDTH;
    }
    if (newFileExplorerWidthPx < MIN_FILE_EXPLORER_WIDTH) {
      // Double check min width after other calculations
      newFileExplorerWidthPx = MIN_FILE_EXPLORER_WIDTH;
    }

    fileExplorerContainer.style.flexBasis = `${newFileExplorerWidthPx}px`; // Apply pixel value
    localStorage.setItem("fileExplorerWidth", `${newFileExplorerWidthPx}px`); // Save as pixel value
  }

  function stopHorizontalResize() {
    isHorizontalResizing = false;
    document.removeEventListener("mousemove", resizeHorizontal);
    document.removeEventListener("mouseup", stopHorizontalResize);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    document.body.style.pointerEvents = "";
    // Re-enable transition after resizing
    fileExplorerContainer.style.transition = "";

    // Revert flex properties if they were temporarily set for dragging
    // For this specific CSS setup, it's better to let CSS classes manage flexGrow/flexShrink post-drag
    // fileExplorerContainer.style.flexGrow = ''; // Or specific value if needed
    // fileExplorerContainer.style.flexShrink = ''; // Or specific value if needed
  }

  rightResizer.addEventListener("mousedown", startHorizontalResize);

  function toggleFileExplorer() {
    const isCurrentlyCollapsed =
      fileExplorerContainer.classList.contains("collapsed");
    let targetFlexBasisPx; // Renamed for clarity

    // Ensure transition is active for toggle animation
    fileExplorerContainer.style.transition = "flex-basis 0.2s ease-in-out"; // Transition flex-basis

    if (isCurrentlyCollapsed) {
      // Expand
      fileExplorerContainer.classList.remove("collapsed");
      targetFlexBasisPx = localStorage.getItem("fileExplorerWidth"); // Get saved pixel value
      if (
        !targetFlexBasisPx ||
        parseInt(targetFlexBasisPx) < MIN_FILE_EXPLORER_WIDTH
      ) {
        targetFlexBasisPx = `${INITIAL_FILE_EXPLORER_WIDTH}px`;
      }
      fileExplorerContainer.style.flexBasis = targetFlexBasisPx;
      localStorage.setItem("fileExplorerCollapsed", "false");
    } else {
      // Collapse
      // Save current expanded width before collapsing
      localStorage.setItem(
        "fileExplorerWidth",
        fileExplorerContainer.style.flexBasis,
      );
      fileExplorerContainer.classList.add("collapsed");
      fileExplorerContainer.style.flexBasis = `${MIN_FILE_EXPLORER_WIDTH}px`; // Collapse to min pixel width
      localStorage.setItem("fileExplorerCollapsed", "true");
    }
  }

  toggleFileExplorerButton.addEventListener("click", toggleFileExplorer);

  // Function to apply all saved layout states
  function applyLayout() {
    // Apply saved terminal height
    const savedTerminalHeight = localStorage.getItem("terminalHeight");
    if (savedTerminalHeight) {
      terminalConsoleContainer.style.flexBasis = savedTerminalHeight;
      // Use editorTerminalContainer's offsetHeight for calculation
      const editorTerminalContainerHeight =
        editorTerminalContainer.offsetHeight;
      const bottomResizerHeight = bottomResizer.offsetHeight;
      const workspaceHeight = // Changed from editorHeight
        editorTerminalContainerHeight -
        parseInt(savedTerminalHeight) -
        bottomResizerHeight;
      if (workspaceHeight >= MIN_HEIGHT) {
        workspaceElement.style.flexBasis = `${workspaceHeight}px`; // Manipulate workspaceElement
      } else {
        workspaceElement.style.flexBasis = `calc(100% - ${MIN_HEIGHT + bottomResizerHeight}px)`;
        terminalConsoleContainer.style.flexBasis = `${MIN_HEIGHT}px`;
        localStorage.setItem("terminalHeight", `${MIN_HEIGHT}px`);
      }
    }

    // Apply saved file explorer state
    const savedFileExplorerWidth = localStorage.getItem("fileExplorerWidth"); // Expecting pixel value
    const savedFileExplorerCollapsed =
      localStorage.getItem("fileExplorerCollapsed") === "true";

    if (savedFileExplorerCollapsed) {
      fileExplorerContainer.classList.add("collapsed");
      fileExplorerContainer.style.flexBasis = `${MIN_FILE_EXPLORER_WIDTH}px`; // Collapse to min pixel width
    } else if (savedFileExplorerWidth) {
      fileExplorerContainer.classList.remove("collapsed");
      let parsedWidth = parseInt(savedFileExplorerWidth);
      if (parsedWidth < MIN_FILE_EXPLORER_WIDTH) {
        // Ensure saved width isn't too small
        parsedWidth = MIN_FILE_EXPLORER_WIDTH;
      }
      // Ensure it doesn't push editor below its min
      if (
        mainLayoutContainer.offsetWidth - parsedWidth <
        MIN_EDITOR_TERMINAL_WIDTH
      ) {
        parsedWidth =
          mainLayoutContainer.offsetWidth - MIN_EDITOR_TERMINAL_WIDTH;
      }

      fileExplorerContainer.style.flexBasis = `${parsedWidth}px`; // Use parsed pixel value
    } else {
      fileExplorerContainer.classList.remove("collapsed");
      fileExplorerContainer.style.flexBasis = `${INITIAL_FILE_EXPLORER_WIDTH}px`; // Use initial pixel width
    }
  }

  // Apply layout on initial load
  applyLayout();

  // Resizing logic (Horizontal - for Preview Panel)
  const previewContainer = document.querySelector(".preview-container");
  const previewResizer = document.getElementById("preview-resizer");

  const MIN_PREVIEW_WIDTH = 150; // Minimum width for the preview panel

  const previewCollapseButton =
    previewContainer.querySelector(".preview-collapse");

  previewCollapseButton.addEventListener("click", () => {
    isPreviewCollapsed = !isPreviewCollapsed;
    localStorage.setItem("isPreviewCollapsed", isPreviewCollapsed);
    previewContainer.style.transition = "flex-basis 0.2s ease-in-out";
    if (isPreviewCollapsed) {
      previewPanelFlexBasisCache = previewContainer.style.flexBasis;
      previewContainer.style.flexBasis = "";
      previewContainer.classList.add("collapsed");
    } else {
      previewContainer.style.flexBasis = previewPanelFlexBasisCache;
      previewContainer.classList.remove("collapsed");
    }
  });

  let isPreviewResizing = false;
  let lastXPreview;
  let previewInitialWidthPx;
  let editorTerminalInitialWidthPxPreview; // Refers to the editor-terminal-container

  function startResizePreviewPanel(e) {
    previewContainer.style.transition = "none";
    isPreviewResizing = true;
    lastXPreview = e.clientX;
    previewInitialWidthPx = previewContainer.offsetWidth;
    editorTerminalInitialWidthPxPreview = editorTerminalContainer.offsetWidth;

    // Temporarily disable transition for smooth resizing
    previewContainer.style.transition = "none";
    editorTerminalContainer.style.transition = "none";

    // Ensure flex properties for dragging
    previewContainer.style.flexGrow = "0";
    previewContainer.style.flexShrink = "0";
    editorTerminalContainer.style.flexGrow = "1";
    editorTerminalContainer.style.flexShrink = "1";

    document.addEventListener("mousemove", resizePreviewPanel);
    document.addEventListener("mouseup", stopResizePreviewPanel);
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    document.body.style.pointerEvents = "none";
  }

  function resizePreviewPanel(e) {
    if (!isPreviewResizing) return;

    const deltaX = e.clientX - lastXPreview;
    const totalContentWidth =
      mainLayoutContainer.offsetWidth -
      fileExplorerContainer.offsetWidth -
      rightResizer.offsetWidth; // Total width available for editor + preview

    let newPreviewWidthPx = previewInitialWidthPx - deltaX;
    let newEditorTerminalWidthPx = totalContentWidth - newPreviewWidthPx;

    // Boundary checks
    if (newPreviewWidthPx < MIN_PREVIEW_WIDTH) {
      newPreviewWidthPx = MIN_PREVIEW_WIDTH;
    }
    if (newEditorTerminalWidthPx < MIN_EDITOR_TERMINAL_WIDTH) {
      newPreviewWidthPx = totalContentWidth - MIN_EDITOR_TERMINAL_WIDTH;
    }

    // Final check
    if (newPreviewWidthPx > totalContentWidth - MIN_EDITOR_TERMINAL_WIDTH) {
      newPreviewWidthPx = totalContentWidth - MIN_EDITOR_TERMINAL_WIDTH;
    }
    if (newPreviewWidthPx < MIN_PREVIEW_WIDTH) {
      newPreviewWidthPx = MIN_PREVIEW_WIDTH;
    }

    previewContainer.style.flexBasis = `${newPreviewWidthPx}px`;
    localStorage.setItem("previewPanelWidth", `${newPreviewWidthPx}px`);
    previewPanelFlexBasisCache = `${newPreviewWidthPx}px`;
  }

  function stopResizePreviewPanel() {
    isPreviewResizing = false;
    document.removeEventListener("mousemove", resizePreviewPanel);
    document.removeEventListener("mouseup", stopResizePreviewPanel);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    document.body.style.pointerEvents = "";

    previewContainer.style.transition = "";
    editorTerminalContainer.style.transition = "";
  }

  previewResizer.addEventListener("mousedown", startResizePreviewPanel);

  // Update applyLayout to load previewPanelWidth
  const originalApplyLayout = applyLayout;
  applyLayout = () => {
    originalApplyLayout(); // Call existing applyLayout logic

    const savedPreviewPanelWidth = localStorage.getItem("previewPanelWidth");
    if (savedPreviewPanelWidth) {
      let parsedWidth = parseInt(savedPreviewPanelWidth);
      if (parsedWidth < MIN_PREVIEW_WIDTH) {
        parsedWidth = MIN_PREVIEW_WIDTH;
      }

      const totalContentWidth =
        mainLayoutContainer.offsetWidth -
        fileExplorerContainer.offsetWidth -
        rightResizer.offsetWidth;
      if (totalContentWidth - parsedWidth < MIN_EDITOR_TERMINAL_WIDTH) {
        parsedWidth = totalContentWidth - MIN_EDITOR_TERMINAL_WIDTH;
      }

      previewContainer.style.flexBasis = `${parsedWidth}px`;
    }

    // Handle preview panel collapsed state
    if (isPreviewCollapsed) {
      previewContainer.style.flexBasis = "";
      previewContainer.classList.add("collapsed");
    } else {
      previewContainer.classList.remove("collapsed");
      previewContainer.style.flexBasis = previewPanelFlexBasisCache;
    }
  };

  // Re-apply layout with new preview panel width logic
  applyLayout();
});
