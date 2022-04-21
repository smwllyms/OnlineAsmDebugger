const pkgFile = "pkg.json";
const maxOverflow = 500;
export let numImports = 0;


export const importFile = async function (fileName, type) {
    // await import(fileName);
    // If we don't want global use above else

    let elem;
    let loaded = false;
    const waitForLoad = new Promise(resolve => {
        if (type == "js") {
            // Create script element 
            elem = document.createElement("script");
            elem.onload = ()=>{resolve();};
            elem.setAttribute("src", fileName); 
            elem.setAttribute("type", "text/javascript"); 
        }
        else if (type == "css") {
            // Create css element
            elem = document.createElement("link");
            elem.onload = ()=>{resolve()};
            elem.setAttribute("rel", "stylesheet");
            elem.setAttribute("href", fileName); 
        }
        else resolve();
        // Add module
        document.head.appendChild(elem);
    });
    // Wait for it to load
    await waitForLoad;
    numImports++;
}

export const importDirectory = async function (directoryName, type) {
    await fetch(directoryName + pkgFile).then(data=>data.json().then(async function(pkg){
        if (numImports >= 500) {
            console.log("ERROR: File overflow or too many imports");
            return;
        }
        for (let file of pkg.files) { const d = await importFile(directoryName + file, type); }
        for (let directory of pkg.directories) { const d = await importDirectory(directoryName + directory + "/", type); }
    }));

}
