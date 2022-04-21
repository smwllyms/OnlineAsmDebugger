const createRow = function(elemsArray, tbody) {

    let row = document.createElement("tr");

    elemsArray.forEach(element => {
        let newElem = document.createElement("td");

        newElem.innerText = element;

        row.appendChild(newElem);
    });

    if (tbody)
        tbody.appendChild(row);

    return row;
}

const createRowWithEvents = function (elems, tbody) {

    let row = document.createElement("tr");

    elems.forEach(element => {
        let newElem = document.createElement("td");

        newElem.innerText = element.text;

        if (element.style)
            newElem.style = element.style;

        if (element.events) {
                newElem.setAttribute("contenteditable", "true");
                element.events.forEach(event=>{
                newElem.addEventListener(event.type, event.func);
            });
        }

        row.appendChild(newElem);
    });

    if (tbody)
        tbody.appendChild(row);

    return row;

}

const toggleDisabled = function(fields) {
    fields.forEach(field => {
        document.getElementById(field).toggleAttribute("disabled")
    });
}

const QuickSpanElem = function (str, style) {
    let span = document.createElement("span");
    span.innerText = str;
    if (style)
        span.style = style;
    return span;
}

const QuickNewline = function(DOMelem) {
    let elem = document.createTextNode("\n");
    DOMelem.appendChild(elem);
}

const createInteractiveDivEvents = function (editedCallback) {
    let funcs = {};
    let modified = false;
    let oldValue = null;
    // focusin
    funcs.focusin = e=>{
        oldValue = e.target.innerText;
    }

    // onenter
    funcs.keydown = e=>{
        if (e.key === "Enter") {
            modified = editedCallback(e.target, e.target.innerText);
            // See if successful and choose to revert if not
            if (!modified)
                e.target.innerText = oldValue;
            e.preventDefault();
        }
    }

    //focusout
    funcs.focusout = e=>{
        if (!modified)
            e.target.innerText = oldValue;
    }

    return funcs;
}