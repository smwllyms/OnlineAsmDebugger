/**
 * https://www.cs.uaf.edu/2009/fall/cs301/lecture/12_07_flags.html
 * 
 * Flags to be implemented (later by user (me)):
 * 
 * - ZF (zero)
 * - CF (carry flag)
 * - SF (signed flag)
 * - OF (overflow flag)
 * 
 */
const Flag = class {
    constructor (name) {
        this.name = name;
        this.value = 0;
    }
}

const FlagList = class {
    constructor () {
        this.flags = new Map();
        this.figureOut = ()=>{};
    }

    getFlag = function (flagName) {
        return this.flags.get(flagName);
    }

    addFlag = function (flag) {
        if (!this.getFlag(flag.name))
            this.flags.set(flag.name, flag);
        else
            log("Already a flag with the name " + flag.name + ". Not added.");
    }

    removeFlag = function (flag) {
        if (this.getFlag(flag.name))
            this.flags.delete(flag.name);
        else
            log("Can't delete a flag with the name " + flag.name + " because it already exists.");
    }

    set = function(flagName, value) {
        let flag = this.getFlag(flagName);
        if (!flag) {
            log("Could not find flag " + flagName + " to set the value to " + value);
            return;
        }

        flag.value = value;
    }

    zero = function() { this.flags.forEach(flag=>flag.value = 0) }

    toString = function() {
        let str = "";
        let paddingLength = 20;

        for (let i = 0; i < paddingLength; i++)
            str += "-";
        str += "\n";

        str += "FLAG VALUES:\n\n"

        this.flags.forEach(flag=>{
            str += "\t" + flag.name + ": " + flag.value + "\n";
        });

        for (let i = 0; i < paddingLength; i++)
            str += "-";
        str += "\n";

        return str;
    }
}