const InstructionWrapper = class {
    constructor (text) {
        this.text = text;
        this.op = "";
        this.location = -1;
        this.addressOfNext = -1;
        this.breakpointSet = false;
        this.justBreakpointed = false;
        // Optionally set
        this.spanElem = null;
        this.label = null;
    }
}

const InstructionContext = class {
    constructor(instructions, registers, memory, flags) {
        this.instructions = instructions;
        this.registers = registers;
        this.memory = memory;
        this.flags = flags;
        // Arbitrary
        this.instructionLocationBase = 0x400;  // 1024
        // Stack
        this.basePointer = 0x700;
        // For diffrentiating parsing vs running
        this.running = false;
        // For parsing and marking locations
        this.currentOffset = this.instructionLocationBase;
        // instructions stored in program (map) with key being location
        this.program = new Map();
        // labels
        this.labels = new Map();
        this.references = new Map();

        // Set a breakpoint for too many ops
        this.maxOps = 100000;

        // For creation stage
        this.lastInstruction = null;
    }

    addInstruction = function (instr, location) {
        // Ensure instruction is valid
        let words = instr.split(new RegExp(/[\s\t]+/g));
        let op = words[0];
        if (this.instructions.getInstruction(op) === undefined) {
            log("Could not parse this instruction: " + instr)
            return null;
        }

        let instruction = new InstructionWrapper(instr);
        instruction.op = op;
        instruction.words = words;

        if (location !== undefined) {
            this.program.set(location, instruction);
            if (this.lastInstruction)
                this.lastInstruction.addressOfNext = location;

            instruction.location = location;
            this.currentOffset = location + 1;
        }
        else {
            this.program.set(this.currentOffset, instruction);
            if (this.lastInstruction) 
                this.lastInstruction.addressOfNext = this.currentOffset;
            // Stretch goal: We need to add the size of current instruction for jumps
            // Current implementation will work for relative locations when instruction
            // addresses are provided but not without
            instruction.location = this.currentOffset;
            this.currentOffset++;
        }

        // Checking for label
        if ((op[0] == 'j' || op === "call") && isNaN(Number(words[1], 16))) {
            // Add this as a reference instruction
            let refs = this.references.get(words[1]);
            if (refs)
                refs.refs.push(instruction);
            else
                this.references.set(words[1], {label:words[1], refs:[instruction]});

        }


        // Add the instruction
        this.lastInstruction = instruction;
        return instruction;
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
        this.labels.clear();
        this.references.clear();

        // 2. Reset IP
        this.instructionLocationBase = 1024;
        this.currentOffset = 1024;

        // 3. Reset last functino
        this.lastInstruction = undefined;

        // 4. Reset data
        this.clearData();

        // Update GUI
        this.updateGUI()

    }

    compile = function () {

        // Reset data
        this.clearData();
    
        // Reset ptrs
        this.registers.instructionPointer.setValue(this.instructionLocationBase);
        this.registers.basePointer.setValue(this.basePointer);
        this.registers.stackPointer.setValue(this.basePointer);

        this.lastInstruction = undefined;

        // Resolve labels
        this.references.forEach(ref=>{
            let label = ref.label;
            let addr = this.labels.get(label);


            ref.refs.forEach(instruction=>{
                let txt = instruction.text;
                let next = (instruction.addressOfNext == -1) ? -1 : (addr - instruction.addressOfNext);
                instruction.text = txt.replace (label, next);
            })
        })

        this.currentOpNum = 0;

        // Color the code GUI if it exists
        let nextInstruction = this.program.get(this.registers.instructionPointer.getValue());
        if (nextInstruction && nextInstruction.spanElem)
            nextInstruction.spanElem.classList.add("selectedInstruction");

        // Update GUI
        this.updateGUI()
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
            wrapper.getValue = ()=>{return new Uint32Array([parseInt(id, 16)])[0];}
            wrapper.getValueSigned = ()=> {return unsignedIntToSignedInt(wrapper.getValue(), 4); }
            wrapper.name = id;
            assignedValue = true;
        }

        return wrapper;
    }

    doOneInstruction = function () {

        // We must fetch the instruction
        let instructionLocation = this.registers.instructionPointer.getValue();
        let currentInstruction = this.program.get(instructionLocation);

        // Check for instruction
        if (!currentInstruction) {
            // Handle errors
            let ip = instructionLocation;
            if (unsignedIntToSignedInt(ip, 4) == -1)
                log("%cFinished Execution.", "font-weight:bold;color:blue");
            else
                log("%cRUNTIME ERROR: Could not fetch the instruction at "+ ip, "font-weight:bold;color:red");
            this.running = false;
            return;
        }

        // Check for breakpoint
        if (currentInstruction.breakpointSet) {

            // See if we just visited
            if (currentInstruction.justBreakpointed) {
                // Continue
                currentInstruction.justBreakpointed = false;
            }
            else {
                // Stop execution
                currentInstruction.justBreakpointed = true;
                // Breakpoints now taken care of externally
                // log("%cBREAKPOINT HIT at "+ instructionLocation.toString(16), "font-weight:bold;color:green");
                // this.running = false;
                return;
            }
        }

        // Set EIP to next instruction
        this.registers.instructionPointer.setValue(currentInstruction.addressOfNext);

        let changedIP = false;
        // Parse

        // 1. Split the instruction
        let parts = currentInstruction.text.match(/\[.*?\]|[a-zA-Z0-9\+\-\*\/]+/g);
        // 2. Get Instruction Command (should be vetted and valid)
        let instruction = this.instructions.getInstruction(parts[0]);
        // 3. Determine the number of arguments in the instruction and parse them
        let numArgs = parts.length - 1;
        if (numArgs == 0) {
            if (parts[0] === "ret") {
                // Ret
                // 1. pop EIP
                let esp = this.createMemoryWrapper(parts[0], this.registers.getStackPointer().name32);
                let eip = this.createMemoryWrapper(parts[0], this.registers.getInstructionPointer().name32);
                let espMem = this.createMemoryWrapper(parts[0], "["+this.registers.getStackPointer().name32+"]");
                let four = this.createMemoryWrapper(parts[0], "4");

                let movInstr = this.instructions.getInstruction("mov");
                movInstr.func(eip, espMem);

                let addInstr = this.instructions.getInstruction("add");
                addInstr.func(esp, four, null, true);
            }
        }
        else if (numArgs == 1) {
            let wrapper = this.createMemoryWrapper(parts[0], parts[1]);

            // Check if jump
            if (parts[0][0] == 'j') {
                let eip = this.createMemoryWrapper(parts[0], this.registers.getInstructionPointer().name32);
                wrapper.getValueSigned = ()=>{return unsignedIntToSignedInt(wrapper.getValue(), 4)}

                // Will return if eip was changed
                changedIP = instruction.func(wrapper, eip, this.flags);
            }
            else if (parts[0][0] == 'p') {
                // Check for push or pop
                if (parts[0] === "pop") {
                    // 2 instructions:
                    // 1. Put what is at Stack Pointer in arg
                    // 2. Increment Stack Pointer by 4
                    let esp = this.createMemoryWrapper(parts[0], this.registers.getStackPointer().name32);
                    let espMem = this.createMemoryWrapper(parts[0], "["+this.registers.getStackPointer().name32+"]");
                    let four = this.createMemoryWrapper(parts[0], "4");

                    let movInstr = this.instructions.getInstruction("mov");
                    movInstr.func(wrapper, espMem);

                    let addInstr = this.instructions.getInstruction("add");
                    addInstr.func(esp, four, null, true);
                }
                else if (parts[0] === "push") {
                    // 2 instructions:
                    // 1. Decrement Stack Pointer by 4
                    // 2. Put arg at Stack Pointer
                    let esp = this.createMemoryWrapper(parts[0], this.registers.getStackPointer().name32);
                    // IMPORTANT Subtract 4 from memory wrapper input since stack pointer will have decremented
                    let espMem = this.createMemoryWrapper(parts[0], "["+this.registers.getStackPointer().name32+"-4]");
                    let four = this.createMemoryWrapper(parts[0], "4");

                    let subInstr = this.instructions.getInstruction("sub");
                    subInstr.func(esp, four, null, true);

                    let movInstr = this.instructions.getInstruction("mov");
                    movInstr.func(espMem, wrapper);
                }
                else instruction.func(wrapper, undefined, this.flags);
            }
            else if (parts[0] === "call") {
                // Call instruction:
                // 1: push EIP
                // 2: jmp arg

                // 1
                let esp = this.createMemoryWrapper(parts[0], this.registers.getStackPointer().name32);                    
                let eip = this.createMemoryWrapper(parts[0], this.registers.getInstructionPointer().name32);
                // IMPORTANT Subtract 4 from memory wrapper input since stack pointer will have decremented
                let espMem = this.createMemoryWrapper(parts[0], "["+this.registers.getStackPointer().name32+"-4]");
                let four = this.createMemoryWrapper(parts[0], "4");

                let subInstr = this.instructions.getInstruction("sub");
                subInstr.func(esp, four, null, true);

                let movInstr = this.instructions.getInstruction("mov");
                movInstr.func(espMem, eip);

                // 2
                let jmpInstr = this.instructions.getInstruction("jmp");
                jmpInstr.func(wrapper, eip, this.flags);
            }
            else if (parts[0] === "ret") {
                // Ret with an arg
                // 1. add esp <x>
                // 2. normal ret (pop eip)

                // 1.
                let esp = this.createMemoryWrapper(parts[0], this.registers.getStackPointer().name32);
                let addInstr = this.instructions.getInstruction("add");
                addInstr.func(esp, wrapper, null, true);

                // 2.
                let eip = this.createMemoryWrapper(parts[0], this.registers.getInstructionPointer().name32);
                let espMem = this.createMemoryWrapper(parts[0], "["+this.registers.getStackPointer().name32+"]");
                let four = this.createMemoryWrapper(parts[0], "4");

                let movInstr = this.instructions.getInstruction("mov");
                movInstr.func(eip, espMem);

                addInstr.func(esp, four, null, true);
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
        else 

        // Update address
        if (!changedIP) {
            // this.registers.instructionPointer.setValue(currentInstruction.addressOfNext);
        }
        else {
            instruction.func(undefined, undefined, this.flags);
        }

        if (this.currentOpNum++ > this.maxOps) {

            log("%cWARNING: " + this.maxOps + " have been run. Continue?", "color:orange");
            this.running = false;
        }


        // Uncolor instruction (if it has a spanElem)
        if (currentInstruction.spanElem)
            currentInstruction.spanElem.classList.remove("selectedInstruction");
        // If we have a next instruction, let's color it (if it has a spanElem)
        let nextInstruction = this.program.get(this.registers.instructionPointer.getValue());
        if (nextInstruction && nextInstruction.spanElem)
            nextInstruction.spanElem.classList.add("selectedInstruction");

        // Set the last instruction
        this.lastInstruction = currentInstruction;

        // Update the GUI
        this.updateGUI();

        // Callback
        if (this.instructionDoneCallback)
            this.instructionDoneCallback();
    }

    run = function () {
        this.running = true;
        this.currentOpNum = 0;
        while (this.running)
            this.doOneInstruction();
    }

    setGUI = function(GUI) {
        this.GUI = GUI;
    }

    updateGUI = function() {

        if (!this.GUI) return;

        // Create export object
        let exports = {};

        exports.registers = this.registers;
        exports.memory = this.memory;
        exports.flags = this.flags;

        this.GUI.updateGUI(exports);
    }

    compileUserProgram = function(text, ghidra, useStartAddress, startAddress, codeGUI) {

        let lines = text.split("\n").filter(line=>line.length > 0);

        let caughtError = false;
        let firstAddress = undefined;
        let parsedProgram = "";

        let lastLineWasLabel = false, lastLineWasJumpWithLabel = false, lastJumpInstr = null;
        let lastLabel = "";

        lines.forEach(line=>{

            // console.log(line)

            // Remove silly stuff like byte ptr, dword ptr, etc.
            line = line.replace("ptr","").replace("byte","").replace("dword","").replace("qword","").replace("word","");

            // split by whitespace (TODO why \n?)
            let splitLine = line.split(new RegExp(/[\s\t\n]+/g)).filter(v=>v.length>0);
            let parsedInstruction = "";
            let location = undefined;
            let offset = 0;

            if (isNaN(Number("0x"+splitLine[0], 16)) 
                && splitLine[0][splitLine[0].length - 1] == ':')
            {
                lastLineWasLabel = true;
                lastLabel = splitLine[0].slice(0, -1);
            }
            else {
                if (!isNaN(Number("0x"+splitLine[0], 16)) && !this.instructions.getInstruction(splitLine[0])) {
                    
                    // first get location at 0
                    location = parseInt(splitLine[offset++], 16);

                    if (!firstAddress)
                        firstAddress = location;

                    // then skip bytecode until word
                    while (!isNaN(Number("0x"+splitLine[offset], 16)) && !this.instructions.getInstruction(splitLine[offset]))
                        offset++;
                }

                // This saves us from having to parse [EAX + ECX] type expressoing
                parsedInstruction += line.substring(line.indexOf(splitLine[offset]));

                let instr = this.addInstruction(parsedInstruction, location);
                if (!instr) {
                    caughtError = true;
                }
                else {
                    if (lastLineWasLabel) {
                        this.labels.set(lastLabel, instr.location);
                        lastLineWasLabel = false;
                        if (codeGUI) {
                            QuickNewline(codeGUI);
                            let elem = new QuickSpanElem(lastLabel + ":", "color:springgreen");
                            codeGUI.appendChild(elem);
                            QuickNewline(codeGUI);
                        }
                    }

                    // Either return string (old)...
                    // parsedProgram += instr.location.toString(16) + " \t" + parsedInstruction + "\n";
                    // or append to text code (new)
                    if (codeGUI) {
                        let elem = new QuickSpanElem(instr.location.toString(16) + " \t" + parsedInstruction);
                        instr.spanElem = elem;
                        codeGUI.appendChild(elem);
                        QuickNewline(codeGUI);
                    }
                }
            }

        });

        // Set the starting address

        if (caughtError) {
            // flush because failed]
            this.flush();
            log("%cERROR: Could not compile because some instructions failed to parse.", "color:red;font-weight:bold;")
            return null;
        }
        
        if (useStartAddress)
            this.instructionLocationBase = startAddress;
        else if (firstAddress)
            this.instructionLocationBase = firstAddress;
        else 
            this.instructionLocationBase = 1024;

        // Finally compile
        this.compile();

        // Return string of program (old)
        return parsedProgram;
    }

    setInstructionDoneCallback = function (callback) {
        this.instructionDoneCallback = callback;
    }
}

