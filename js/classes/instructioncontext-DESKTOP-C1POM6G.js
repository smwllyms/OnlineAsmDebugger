const InstructionWrapper = class {
    constructor (text) {
        this.text = text;
        this.addressOfNext = -1;
    }
}

const InstructionContext = class {
    constructor(instructions, registers, memory) {
        this.instructions = instructions;
        this.registers = registers;
        this.memory = memory;
        // Arbitrary
        this.instructionLocationBase = 0x400;  // 1024
        // For diffrentiating parsing vs running
        this.running = false;
        // For parsing and marking locations
        this.currentOffset = this.instructionLocationBase;
        // instructions stored in program (map) with key being location
        this.program = new Map();

        // For creation stage
        this.lastInstruction = null;
    }

    addInstruction = function (instr, location) {
        // Ensure instruction is valid
        if (this.instructions.getInstruction(instr.split(" ")[0]) === undefined) {
            log("Could not parse this instruction: " + instr)
            return false;
        }

        let instruction = new InstructionWrapper(instr);

        if (location !== undefined) {
            this.program.set(location, instruction);
            if (this.lastInstruction)
                this.lastInstruction.addressOfNext = location;
        }
        else {
            this.program.set(this.currentOffset, instruction);
            if (this.lastInstruction)
                this.lastInstruction.addressOfNext = this.currentOffset;
            // Stretch goal: We need to add the size of current instruction for jumps
            // Current implementation will work for relative locations when instruction
            // addresses are provided but not without
            this.currentOffset++;
        }

        // Add the instruction
        this.lastInstruction = instruction;
        return true;
    }

    numInstructions = function () {
        return this.program.size;
    }

    setInstructionLocationBase = function (location) {
        this.instructionLocationBase = location;
    }

    clearData = function () {
        this.registers.registerArray.forEach(reg=>{reg.setValue(0)});
        // Reset memory
        this.memory.clear();
        // Reset flags
    }

    flush = function () {

        // 1. Remove instructions
        this.program.clear();

        // 2. Reset IP
        this.currentOffset = this.instructionLocationBase;

        // 3. Reset last functino
        this.lastInstruction = undefined;

        // 4. Reset data
        this.clearData();

    }

    compile = function () {

        // Reset data
        this.clearData();
    
        this.registers.instructionPointer.setValue(this.instructionLocationBase);
    }

    getComputedValue = function(str) {
        let parsed = str.replace("[", "").replace("]", "");

        let potentialData = parsed.split(new RegExp(/[\s\t\+\-\*\/]+/g));
        let otherStuff = parsed.match(new RegExp(/[\s\t\+\-\*\/]+/g));

        let newStr = "";
        potentialData.forEach(token=>{
            if (this.registers.contains(token.toUpperCase()))
                newStr += this.registers.getValue(token)
            else
                newStr += parseInt(token, 16);

            if (otherStuff && otherStuff.length > 0)
                newStr += otherStuff.shift();
        });

        // console.log("FInal func: " + newStr)


        let calcFunction = new Function("return (" + newStr + ");");

        return calcFunction();
    }

    createMemoryWrapper = function (instr, id) {
        let wrapper = {};
        // default error state of 0
        wrapper.errorState = 0;
        let assignedValue = false;

        if (isNaN(id)) {
            // is it memory?
            if (id.includes("[")) {
                let location = this.getComputedValue(id);
                wrapper.type = "memory";
                wrapper.size = 4; // done later
                wrapper.setValue = val=>this.memory.setValue(location, val, wrapper.size);
                // Special case: lea
                if (instr === "lea")
                    wrapper.getValue = ()=>{return location;};
                else
                    wrapper.getValue = ()=>this.memory.getValue(location, wrapper.size);
                wrapper.getValueSigned = ()=>unsignedIntToSignedInt(this.memory.getValue(location, wrapper.size), wrapper.size);
                wrapper.name = "RAM:"+location;
                assignedValue = true;
            }
            // is it a register?
            else {
                let registerName = id.toUpperCase();
                let register = this.registers.getRegister(registerName);
                if (register) {
                    wrapper.type = "register";
                    wrapper.size = register.getSize(registerName);
                    wrapper.setValue = val=>{ register.setValue(registerName, val); };
                    wrapper.getValue = ()=>{ return register.getValue(registerName); };
                    wrapper.getValueSigned = ()=>{ return register.getValueSigned(registerName); };
                    wrapper.name = registerName;
                    assignedValue = true;
                }
                // else {
                //     // Error handling
                //     wrapper.errorState = -1;
                // }
            }
        }
        if (!assignedValue && !isNaN(parseInt(id, 16))) {
            // invalid set
            wrapper.type = "immediate"
            wrapper.setValue = val=>{};
            wrapper.getValue = ()=>{return parseInt(id, 16);}
            // wrapper.getValueSigned = unsignedIntToInt(wrapper.getValue());
            wrapper.name = id;
            assignedValue = true;
        }

        return wrapper;
    }

    doOneInstruction = function () {
        // We must fetch the instruction
        let currentInstruction = this.program.get(this.registers.instructionPointer.getValue());
        if (currentInstruction !== undefined) {
            let changedIP = false;
            // Parse

            // 1. Split the instruction
            let parts = currentInstruction.text.match(/\[.*?\]|[a-zA-Z0-9\+\-\*\/]+/g);
            // 2. Get Instruction Command (should be vetted and valid)
            let instruction = this.instructions.getInstruction(parts[0]);
            // 3. Determine the number of arguments in the instruction and parse them
            let numArgs = parts.length - 1;
            if (numArgs == 1) {
                let wrapper = this.createMemoryWrapper(parts[0], parts[1]);

                // Check if jump
                if (parts[0][0] == 'j') {
                    let eip = this.createMemoryWrapper(parts[0], this.registers.getInstructionPointer().name32);
                    wrapper.getValueSigned = ()=>{return unsignedIntToSignedInt(wrapper.getValue(), 4)}
                    instruction.func(wrapper, eip, this.flags);
                }
                else {
                    instruction.func(wrapper, undefined, this.flags);
                }
            }
            else if (numArgs == 2) {
                let wrapper1 = this.createMemoryWrapper(parts[0], parts[1]);
                let wrapper2 = this.createMemoryWrapper(parts[0], parts[2]);

                if (wrapper1.type === "memory") {
                    if (wrapper2.type === "register")
                        wrapper1.size = wrapper2.size;
                }


                if (wrapper2.type === "immediate") {
                    wrapper2.getValueSigned = ()=>{
                        return unsignedIntToSignedInt(wrapper2.getValue(), wrapper1.size);
                    }
                }
                else if (wrapper2.type === "memory") {
                    if (wrapper1.type === "register")
                        wrapper2.size = wrapper1.size;
                }

                instruction.func(wrapper1, wrapper2, this.flags);
            }

            // Update address\
            if (!changedIP)
                this.registers.instructionPointer.setValue(currentInstruction.addressOfNext);
            else {

            }
        }
        else {
            // Handle errors
            let ip = this.registers.instructionPointer.getValue();
            if (unsignedIntToSignedInt(ip, 4) == -1)
                log("%cFinished Execution.", "font-weight:bold;color:blue");
            else
                log("%cCould not fetch the instruction at "+ ip, "font-weight:bold;color:red");
            this.running = false;
        }
    }

    run = function () {
        this.running = true;
        while (this.running)
            this.doOneInstruction();
    }

    setFlags = function(flags) { this.flags = flags; }
}