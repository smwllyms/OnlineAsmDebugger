const Breakpoint = class {
    constructor (hardware, arg2) {
        this.hw = hardware;
        if (hardware)
            this.location = arg2;
        else
            this.condition = arg2;
    }

    toString = function() {

        let str;

        if (this.hw)
            str = "Hardware at " + numToHexString(this.location, 4);
        else
            str = "Condition: { " + this.condition + " }";

        return str;
    }

}
const BreakpointList = class {
    constructor() {
        this.breakpointList = [];
        this.numBreakpoints = 0;
    }

    printBreakpoint(index) {

        let str = "";

        if (index < 0 || index >= this.numBreakpoints)
            str = "Could not find breakpoint # " + index;
        else 
            str = "Breakpoint # " + index + ": " + this.breakpointList[index].toString();

        return str;
    }

    printAllBreakpoints = function () {

        let str = "";

        for (let i = 0; i < this.numBreakpoints; i++)
            str += this.printBreakpoint(i) + "\n";

        return str;
    }

    addConditionBreakpoint = function(condition) {

        // First check to see if we have it
        let found = false;
        for (let i = 0; i < this.numBreakpoints; i++) {
            let bp = this.breakpointList[i];
            if (!bp.hw && bp.condition === condition) {
                found = true;
                break;
            }
        }

        // Do nothing
        if (found)
            return false;
        
        // Else add
        this.breakpointList.push(new Breakpoint(false, condition));
        this.numBreakpoints++;
        return true;
    }

    addHardwareBreakpoint = function(location) {

        // First check to see if we have it
        let found = false;
        for (let i = 0; i < this.numBreakpoints; i++) {
            let bp = this.breakpointList[i];
            if (bp.hw && bp.location === location) {
                found = true;
                break;
            }
        }

        // Do nothing
        if (found)
            return false;
        
        // Else add
        this.breakpointList.push(new Breakpoint(true, location));
        this.numBreakpoints++;
        return true;
    }

    removeHardwareBreakpoint = function (location) {
        // check to see if we have it
        let found = false;
        for (let i = 0; i < this.numBreakpoints; i++) {
            let bp = this.breakpointList[i];
            if (bp.hw && bp.location === location) {
                this.removeBreakpoint(i);
                break;
            }
        }        
    }

    removeAllHardwareBreakpoints = function() {
        for (let i = 0; i < this.numBreakpoints; i++) {
            let bp = this.breakpointList[i];

            if (bp.hw) {
                this.removeBreakpoint(i);
                i--;
            }
        }
    }

    removeBreakpoint = function(index) {

        // Ensure valid breakpoint
        if (index < 0 || index > this.numBreakpoints) {

            return false;
        }

        this.breakpointList = [...this.breakpointList.slice(0, index), ...this.breakpointList.slice(index+1)];
        this.numBreakpoints--;

        return true;
    }

    clearBreakPoints = function () {
        while (this.numBreakpoints > 0)
            this.removeBreakpoint(this.numBreakpoints-1);
    }
}