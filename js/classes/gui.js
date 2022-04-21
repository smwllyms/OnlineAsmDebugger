class GUI {
    constructor(callback) {
        this.callback = callback;
    }

    updateGUI = function(exports) {
        this.callback(exports)
    }
}