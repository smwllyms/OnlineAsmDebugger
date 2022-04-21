class TextCode {

    constructor (DOMelem, settings) {
        this.DOMelem = DOMelem;

        // DOMelem.classList.add("__textcode");
        this.setUpStyle();

        this.parseSettings(settings);

        // Must
        DOMelem.contentEditable = true;

        this.setUpEventListeners();

    }

    setUpStyle = function() {

        // Set our style with these attributes
        // Please don't change unsafe properties, like display and white-space
        let defaultStyle = [
            ["background", "#222"],
            ["color", "white"],
            ["white-space", "pre"],
            ["tab-size", "2"],
            ["padding", "8px"],
            ["font-family", "'Courier New', Courier, monospace"],
            ["box-sizing", "border-box"],
            ["overflow", "scroll"],
            ["outline", "0px solid transparent"],
            ["display","inline-block"]
        ];

        defaultStyle.forEach(setting=>
            this.DOMelem.style.setProperty(setting[0], setting[1])
        );
    }

    parseSettings = function(settings) {

        /**
         * Format (JSON):
         * 
         * {
         *      keys: [
         * 
         *          { 
         *              color: "purple", 
         *              keywords:
         *                  [ "word1", "word2", "word3" ],
         *              settings: {
         *                  // TBD
         *              }
         *          },
         *          ...
         *      ],
         *      
         *      validSpaces: [ " ", "\t", "\n"],
         * 
         *      autoclose: [
         *          [ "{", "}" ],
         *          [ "[", "]" ]
         *          ...
         *      ]
         * }
         * 
         * NOTE: 
         * 
         * smartColor is a boolean flag that makes TextCode aware of 
         * keywords in context. E.g., if 'let' is a keyword, then in
         * the word pamphlet, the 'let' will not be colored. I.E. there
         * must be spaces around 'let' for it to be colored (or it
         * may be at the beginning or end of the document)
         */

        if (!settings)
            settings = {}

        this.keys = [];

        if (settings.keys) {
            settings.keys.forEach(key => {
                this.keys.push(key);
            });
        }

        this.autoclose = [];

        if (settings.autoclose) {
            settings.autoclose.forEach(pair => {
                this.autoclose.push(pair);
            });
        }

        if (!settings.spellcheck)
            this.DOMelem.spellcheck = false;
    }


    setUpEventListeners = function() {


        let DOMelem = this.DOMelem;

        // For coloring keys:
        DOMelem.addEventListener("input", e=>{

            // Revert to text, rebuild colored keys every time
            let txt = DOMelem.innerText;

            // Save cursor position
            let cursorPosition = this.getCursorPosition();
            
            // Go through each key and color its keywords appropriately
            this.keys.forEach(key=>{

                key.keywords.forEach(keyword=>{

                    if (key.validSpaces) {

                        key.validSpaces.forEach(vs=>{

                            key.validSpaces.forEach(vs2=>{

                                // IMPORTANT ensure vs and vs2 (spaces) are on OUTSIDE of span
                                txt = txt.replaceAll(vs + keyword + vs2, vs + "<span style='color:"+key.color+"'>"+keyword+"</span>" + vs2);

                            });

                            // Check if first and last words are the key
                            if (txt.indexOf(keyword + vs) == 0)
                            txt = txt.replace(keyword + vs, "<span style='color:"+key.color+"'>"+keyword+"</span>" + vs);

                            if (txt.length > keyword.length + vs.length && txt.indexOf(vs + keyword) == txt.length - keyword.length - vs.length)
                                txt = txt.replace(new RegExp((vs + keyword)+'$'), vs + "<span style='color:"+key.color+"'>"+keyword+"</span>");

                        })

                    }
                    else 
                        txt = txt.replaceAll(keyword, "<span style='color:"+key.color+"'>"+keyword+"</span>");

                })

            })
            
            // Set the new HTML in the TextCode
            DOMelem.innerHTML = txt;

            // Set the cursor back to the right place
            this.setCursorPosition(cursorPosition);

        });


        // Set tab and autoclose
        DOMelem.addEventListener("keydown", e=>{

            if (e.key === "Tab") {

                document.execCommand('insertHTML', false, '&#009');
                //prevent focusing on next element
                e.preventDefault();   

            }

            else if (e.key === "Enter") {

                let currText = this.DOMelem.innerText;
                let currPos = this.getCursorPosition();
                
                // this.setCursorPosition(this.getCursorPosition());
                document.execCommand('insertText', false, '\n');
                this.setCursorPosition(this.getCursorPosition());
                if (currText[currPos] == '}') {
                    // this.setCursorPosition(this.getCursorPosition()-1);
                    document.execCommand('insertHTML', false, '\n');
                    this.setCursorPosition(this.getCursorPosition()-1);
                }
                e.preventDefault();

            }

            else {

                this.autoclose.forEach(pair => {

                    if (e.key === pair[0]) {

                        e.preventDefault();

                        document.execCommand('insertHTML', false, pair[0]);
                        document.execCommand('insertHTML', false, pair[1]);

                        this.setCursorPosition(this.getCursorPosition()-1);

                    }
                })
            }

        })

    }

    insertText = function (txt) {
        
        let cursorPos = this.getCursorPosition();

        this.DOMelem.innerHTML = 
            this.DOMelem.innerHTML.substring(0, cursorPos) + txt + this.DOMelem.innerHTML.substring(cursorPos);
        
        this.setCursorPosition(cursorPos+txt.length);

    }

    // See get Next sibling for details
    getPreviousSibling = function (node) {

        if (!node) return null;

        // if we are the dom elem return
        if (node === this.DOMelem)
            return null;

        if (node.previousSibling)
            return node.previousSibling;

        if (node.parentNode.nodeName === "SPAN") {

            let prev = node.parentNode.previousSibling;
            
            if (prev && prev.firstChild)
                return prev.firstChild;

            return prev;

        }

        return null;
    }

    getNextSibling = function (node) {

        if (!node) return null;

        if (node.nextSibling)
            return node.nextSibling;

        // If parent is a span, it is a key so use its parent's next sibling
        // or first child
        if (node.parentNode.nodeName === "SPAN") {

            let next = node.parentNode.nextSibling;
            
            if (next && next.firstChild)
                return next.firstChild;

            return next;

        }

        return this.DOMelem;
    }

    getCursorPosition = function() {

        let DOMelem = this.DOMelem;
        let selection = document.getSelection();

        let currentNode = selection.anchorNode;
        let totalLength = 0;

        // First deal with current Node's offset
        totalLength += selection.anchorOffset;
        currentNode = this.getPreviousSibling(currentNode);  
        
        while (currentNode) {

            totalLength += currentNode.textContent.length;
            currentNode = this.getPreviousSibling(currentNode);       
            
            if (currentNode === DOMelem) break;
        }


        return totalLength;
    }

    setCursorPosition = function(cursorPos) {

        let DOMelem = this.DOMelem;
        let selection = document.getSelection();

        let currentNode = DOMelem.firstChild;

        while (currentNode && cursorPos > currentNode.textContent.length) {
            cursorPos -= currentNode.textContent.length;
            currentNode = this.getNextSibling(currentNode);        
        }

        if (!currentNode)
            currentNode = DOMelem;
        else if (currentNode.firstChild)
            currentNode = currentNode.firstChild;

        let range = document.createRange();
        range.setStart(currentNode, cursorPos);
        range.setEnd(currentNode, cursorPos);
        selection.removeAllRanges();
        selection.addRange(range);


    }

}

export default TextCode;