An advanced, highly customizable local graph view for Obsidian that enhances your note-linking experience. Local Graph Pro replaces the standard graph with a feature-rich, interactive, and aesthetically pleasing alternative, designed for power users.

## ✨ Key Features

*   **🎨 Advanced Coloring:** Automatically color-codes nodes based on their relationship to the central note.
    *   Unique color for the **root note**.
    *   Separate, customizable colors for up to 5 levels of **outgoing** links.
    *   Separate, customizable colors for up to 5 levels of **incoming** links (backlinks).
*   **⚙️ Live Settings Panel:** No need to go into Obsidian's settings! A sleek, slide-out panel allows you to control everything in real-time.
    *   **Depth Control:** Instantly change the depth of outgoing and incoming links (from 0 to 5).
    *   **Physics Control:** Fine-tune the graph's behavior with sliders for Node Size, Link Distance, and Repel Strength.
    *   **Display Control:** Toggle the visibility of links between "neighbor" nodes to simplify the graph.
*   **🔍 Enhanced Interactivity:**
    *   **Zoom on Click:** Click any node to smoothly zoom in and focus on it.
    *   **Open Note:** Use `Ctrl/Cmd + Click` to open a note in the current pane.
    *   **Inertial Panning:** A smooth, "gliding" feel when you pan across the graph.
    *   **Hover Effects:** Hover over a node to highlight it and its direct connections, dimming everything else. The node's full name is also displayed.
*   **💎 Polished Visuals:**
    *   **Constant Node Size:** Nodes maintain their visual size no matter how far you zoom in or out, preventing clutter.
    *   **Smart Labels:**
        *   Node labels are truncated to a clean, readable length.
        *   Full node names appear on hover.
        *   Labels automatically fade out when you zoom out to keep the graph clean.
        *   Text wraps to new lines for better readability.

## 🚀 How to Use

1.  **Open the Graph:**
    *   Click the "Network" icon in the ribbon (left-hand sidebar).
    *   OR, run the command `Local Graph: Open Local Graph` from the command palette (`Ctrl/Cmd + P`).
2.  **Interact:**
    *   **Pan:** Click and drag on any empty space.
    *   **Zoom:** Use your mouse wheel.
    *   **Focus Node:** Click a node.
    *   **Open Note:** `Ctrl/Cmd + Click` a node.
    *   **Highlight:** Hover over a node.
3.  **Customize:**
    *   Click the **cog icon** inside the graph view to open the live settings panel.
    *   Adjust sliders and colors to your liking. Changes are applied instantly!

## 📥 Installation

### From Community Plugins (Recommended)

Once the plugin is approved:

1.  Go to `Settings` -> `Community Plugins`.
2.  Make sure "Restricted mode" is turned **off**.
3.  Click `Browse` and search for "Local Graph Pro".
4.  Click `Install`, and then `Enable`.

### Manual Installation (via BRAT)

1.  Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) from the Community Plugins browser.
2.  Open the command palette and run the command `BRAT: Add a beta plugin for testing`.
3.  Paste in this repository's URL: `https://github.com/MrHoustonOff/obsidian-local-graph-plus`.
4.  BRAT will handle the rest.

## ❤️ Contributing

This project was a collaborative effort, and the core functionality is now complete. However, the world of open source is vast! If you have ideas for new features (like multi-root graphs, different layout algorithms, etc.), feel free to fork this repository, make your changes, and submit a pull request.

## License

This plugin is released under the [MIT License](LICENSE).

## Acknowledgements

*   The incredible [Obsidian API](https://github.com/obsidianmd/obsidian-api).
*   The powerful [D3.js](https://d3js.org/) library for data visualization.