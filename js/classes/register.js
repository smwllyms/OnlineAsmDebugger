const numToHexString = function (num, numBytes) {
    let str = num.toString(16);
    return "0x" + "0".repeat((numBytes * 2)-str.length) + str;
}

const unsignedIntToSignedInt = function (num, numBytes) {
    let view;
    switch (numBytes) {
        case 1:
            view = new Int8Array(1);
            view[0] = num;
            return view[0];
        case 2:
            view = new Int16Array(1);
            view[0] = num;
            return view[0];
        case 4:
            view = new Int32Array(1);
            view[0] = num;
            return view[0];
        default:
            return -1;
    }
}

const RegisterContainer = class {
    constructor() {
        this.registerArray = [];
        this.registerMap = new Map();
        // Important instruction register
        this.instructionPointer = null;
    }

    getRegister = function (registerName) {
        // Make sure all names are not used
        return this.registerMap.get(registerName);
    }

    contains = function (registerName) {
        return !!this.getRegister(registerName);
    }

    addRegister = function (register) {

        if (this.registerArray.indexOf(register) != -1) {
            log(`Register ${register.name32} already added! Did not add.`);
            return;
        }
        
        // Make sure all names are not used
        let has32 = this.registerMap.get(register.name32);
        let has16 = this.registerMap.get(register.name16);
        let has8hi = this.registerMap.get(register.name8hi);
        let has8lo = this.registerMap.get(register.name8lo);
        if (has32 || has16 || has8hi || has8lo) {
            let name = "";
            if (has32) name = register.name32;
            else if (has16) name = register.name16;
            else if (has8hi) name = register.name8hi;
            else name = register.name8lo;
            log(`Part of register ${register.name32} already added (${name})! Did not add.`);
            return;                
        }

        this.registerArray.push(register);
        this.registerMap.set(register.name32, register);
        this.registerMap.set(register.name16, register);
        this.registerMap.set(register.name8hi, register);
        this.registerMap.set(register.name8lo, register);
    }

    setInstructionPointer(reg) { this.instructionPointer = reg; }
    getInstructionPointer() { return this.instructionPointer; }
    setStackPointer(reg) { this.stackPointer = reg; }
    getStackPointer() { return this.stackPointer; }
    setBasePointer(reg) { this.basePointer = reg; }
    getBasePointer() { return this.basePointer; }

    removeRegister = function (register) {
        let idx = this.registerArray.indexOf(register);
        if (idx == -1) {
            log(`Register ${register.name32} not found in collection! Could not remove.`);
            return;
        }

        this.registerArray.splice(idx, 1);
        this.registerMap.delete(register.name32);
        this.registerMap.delete(register.name16);
        this.registerMap.delete(register.name8hi);
        this.registerMap.delete(register.name8lo);        
    }

    toString = function () {
        let str = "Register Container Dump:\n";
        str += "Size: " + this.registerArray.length + "\n";
        if (this.registerArray.length == 0) return str;
        str += "Registers: \n";
        this.registerArray.forEach(register=>{
            str += `  For Register ${register.name32}:\n`;
            str += `    ${register.toString(register.name32)}\n`;
            str += `    ${register.toString(register.name16)}\n`;
            str += `    ${register.toString(register.name8hi)}\n`;
            str += `    ${register.toString(register.name8lo)}\n`;
        });
        return str;
    }

    setValue = function (registerName, value) {
        // Set lowercase
        registerName = registerName.toUpperCase();
        // Find the register to set value to
        let reg = this.registerMap.get(registerName);
        if (!reg) return false;
        return reg.setValue(registerName, value);
    }

    getValue = function (registerName, signed) {
        // Set lowercase
        registerName = registerName.toUpperCase();
        let reg = this.registerMap.get(registerName);
        if (!reg) return null;
        if (signed)
            return reg.getValueSigned(registerName);
        return reg.getValue(registerName);
    }

    getHexString = function (registerName, numBytes) {
        // Set lowercase
        registerName = registerName.toUpperCase();
        let reg = this.registerMap.get(registerName);
        if (!reg) return null;
        
        if (!numBytes)
            return reg.getHexString(registerName);     
        else
            return reg.getHexString(registerName, numBytes)
    }
}

const Register = class {

    constructor(name32, name16, name8hi, name8lo) {
        this.name32 = name32.toUpperCase();
        this.name16 = name16.toUpperCase();
        this.name8hi = name8hi.toUpperCase();
        this.name8lo = name8lo.toUpperCase();

        this.memory = new ArrayBuffer(4);
    }

    setValue = function (name, value) {
        
        // Since no overloading... :(
        if (!value) {
            new Uint32Array(this.memory)[0] = name;
            return;
        }
        
        switch (name) {
            case this.name32:
                new Uint32Array(this.memory)[0] = value;
                return true;
            case this.name16:
                new Uint16Array(this.memory)[0] = value;
                return true;
            case this.name8hi:
                let view = new Uint16Array(this.memory);
                // Shift the value up, think of appending 2 0s in hex
                view[0] &= 0x00ff;
                view[0] |= (value << 8);
                return true;
            case this.name8lo:
                new Uint8Array(this.memory)[0] = value;
                return true;
            default:
                return false;
        }
    }

    getValue = function (name) {

        // Since no overloading... :(
        if (!name) {
            return new Uint32Array(this.memory)[0];
        }

        switch (name) {
            case this.name32:
                return new Uint32Array(this.memory)[0];
            case this.name16:
                return new Uint16Array(this.memory)[0];
            case this.name8hi:
                return (new Uint16Array(this.memory)[0]) >> 8;
            case this.name8lo:
                return new Uint8Array(this.memory)[0];
            default:
                return 0xdeadbeef;
        }
    }

    getValueSigned = function (name) {
        return unsignedIntToSignedInt(this.getValue(name), this.getSize(name));
    }

    getSize = function (name) {
        switch (name) {
            case this.name32:
                return 4;
            case this.name16:
                return 2;
            case this.name8hi:
                return 1;
            case this.name8lo:
                return 1;
            default:
                return 4;
        }        
    }

    getHexString = function (registerName, numBytes) {        
        if (!numBytes)
            return numToHexString(this.getValue(registerName), this.getSize(registerName));
        else
            return numToHexString(this.getValue(registerName), numBytes);
    }

    toString = function (name) {
        let prefix = "NaN";
        let val = 0, numBytes = 0;

        switch (name) {
            case this.name32:
                prefix = "32-bit";
                val = new Uint32Array(this.memory)[0];
                numBytes = 4;
                break;
            case this.name16:
                prefix = "16-bit";
                val = new Uint16Array(this.memory)[0];
                numBytes = 2;
                break;
            case this.name8hi:
                prefix = "hi 8-bit";
                val = (new Uint16Array(this.memory)[0]) >> 8;
                numBytes = 1;
                break;
            case this.name8lo:
                prefix = "lo 8-bit";
                val = new Uint8Array(this.memory)[0];
                numBytes = 1;
                break;
            default:
                break;
        }
        if (prefix === "NaN") return `Register ${name} not found`;      
        
        let str = `${prefix} register ${name} value:\n` 
        str += `  Unsigned: ${val}\n`;
        str += `  Signed:   ${unsignedIntToSignedInt(val, numBytes)}\n`;
        str += `  Hex:      ${numToHexString(val, numBytes)}\n`;

        return str;
    }

};