javascript: (function () {
    var scripts = document.getElementsByTagName("script"),
        regex = /(?<=(\"|\%27|\`))\/[a-zA-Z0-9_?&=\/\-\#\.]*(?=(\"|\'|\%60))/g,
        results = new Set(),
        timeoutDelay = 3000;
    for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].src;
        if (src)
            fetch(src)
                .then((response) => response.text())
                .then((content) => {
                    let matches = content.matchAll(regex);
                    for (let match of matches) results.add(match[0]);
                })
                .catch((error) => console.error("Error fetching script:", src, error));
    }
    var pageContent = document.documentElement.outerHTML,
        matches = pageContent.matchAll(regex);
    for (const match of matches) results.add(match[0]);
    function showResults() {
        const modal = document.createElement("div");
        (modal.style.position = "fixed"),
            (modal.style.top = "10%"),
            (modal.style.left = "50%"),
            (modal.style.transform = "translate(-50%, -10%)"),
            (modal.style.background = "#333"),
            (modal.style.color = "#fff"),
            (modal.style.border = "1px solid #444"),
            (modal.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)"),
            (modal.style.zIndex = 9999),
            (modal.style.padding = "20px"),
            (modal.style.maxHeight = "80%"),
            (modal.style.overflowY = "auto"),
            (modal.style.fontFamily = "Arial, sans-serif"),
            (modal.style.fontSize = "14px"),
            (modal.style.borderRadius = "8px"),
            (modal.style.width = "50%"),
            (modal.style.textAlign = "left"),
            (modal.style.direction = "ltr");
        const header = document.createElement("div");
        (header.style.display = "flex"), (header.style.justifyContent = "space-between"), (header.style.alignItems = "center"), (header.style.marginBottom = "10px");
        const title = document.createElement("h3");
        (title.innerText = "Extracted URLs/Paths"), (title.style.margin = "0"), (title.style.color = "#ffa500");
        const closeButtonTop = document.createElement("span");
        (closeButtonTop.innerText = "✖"),
            (closeButtonTop.style.cursor = "pointer"),
            (closeButtonTop.style.color = "#fff"),
            (closeButtonTop.style.fontSize = "18px"),
            (closeButtonTop.style.fontWeight = "bold"),
            (closeButtonTop.style.marginLeft = "10px"),
            (closeButtonTop.onclick = () => document.body.removeChild(modal));
        header.appendChild(title), header.appendChild(closeButtonTop);
        const searchBar = document.createElement("input");
        (searchBar.type = "text"),
            (searchBar.placeholder = "Search..."),
            (searchBar.style.width = "100%"),
            (searchBar.style.padding = "10px"),
            (searchBar.style.marginBottom = "10px"),
            (searchBar.style.fontSize = "14px"),
            (searchBar.style.border = "1px solid #555"),
            (searchBar.style.borderRadius = "4px"),
            (searchBar.style.outline = "none"),
            (searchBar.style.boxSizing = "border-box"),
            (searchBar.style.background = "#222"),
            (searchBar.style.color = "#fff");
        const list = document.createElement("ul");
        (list.style.listStyleType = "none"), (list.style.padding = "0");
        results.forEach((item) => {
            const listItem = document.createElement("li");
            (listItem.textContent = item), (listItem.style.marginBottom = "5px"), (listItem.style.wordBreak = "break-word"), (listItem.style.textAlign = "left"), list.appendChild(listItem);
        });
        searchBar.addEventListener("input", () => {
            const filter = searchBar.value.toLowerCase(),
                items = list.getElementsByTagName("li");
            for (let i = 0; i < items.length; i++) {
                const txtValue = items[i].textContent || items[i].innerText;
                items[i].style.display = txtValue.toLowerCase().indexOf(filter) > -1 ? "" : "none";
            }
        });
        const downloadButton = document.createElement("button");
        (downloadButton.innerText = "Download Results"),
            (downloadButton.style.marginTop = "10px"),
            (downloadButton.style.padding = "5px 10px"),
            (downloadButton.style.background = "#4caf50"),
            (downloadButton.style.color = "#fff"),
            (downloadButton.style.border = "none"),
            (downloadButton.style.cursor = "pointer"),
            (downloadButton.style.borderRadius = "4px"),
            (downloadButton.onclick = () => {
                const blob = new Blob([Array.from(results).join("\n")], { type: "text/plain" }),
                    link = document.createElement("a");
                (link.href = URL.createObjectURL(blob)), (link.download = "extracted_paths.txt"), link.click();
            });
        const closeButtonBottom = document.createElement("button");
        (closeButtonBottom.innerText = "Close"),
            (closeButtonBottom.style.marginTop = "10px"),
            (closeButtonBottom.style.marginLeft = "10px"),
            (closeButtonBottom.style.padding = "5px 10px"),
            (closeButtonBottom.style.background = "#ffa500"),
            (closeButtonBottom.style.color = "#000"),
            (closeButtonBottom.style.border = "none"),
            (closeButtonBottom.style.cursor = "pointer"),
            (closeButtonBottom.style.borderRadius = "4px"),
            (closeButtonBottom.onclick = () => document.body.removeChild(modal));
        modal.appendChild(header), modal.appendChild(searchBar), modal.appendChild(list), modal.appendChild(downloadButton), modal.appendChild(closeButtonBottom), document.body.appendChild(modal);
    }
    setTimeout(showResults, timeoutDelay);
})();
