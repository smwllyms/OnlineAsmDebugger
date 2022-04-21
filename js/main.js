import { importDirectory, numImports } from "./util/import.js";

// Must also import TextCode
import TextCode from "./classes/external/textcode.js";

// Load css first
await importDirectory("./css/", "css");
await importDirectory("./js/", "js");

// Set up console
const useConsole = false;
const logger = document.getElementById("logger");
window.log = function (msg, msgType, msgMode) {
    if (useConsole) {
        console.log(msg, (msgType === undefined) ? "" : msgType);
        return;
    }
    // else
    let msgElem = document.createElement("span");
    // Style errors
    if (msgType !== undefined)
        msgElem.style = msgType;
    msgElem.classList.add("loggedSpan")
    // Add timestamp then message
    msgElem.innerText = msg.replace("%c", "") + "\n";
    // We either append or reset
    if (msgMode === "reset") {
        clearLog()
    }
    logger.appendChild(msgElem);

    // Scroll
    logger.parentElement.scrollTop = logger.parentElement.scrollHeight;
}
window.clearLog = function () {
    if (useConsole) return;
    while (logger.children.length > 0)
        logger.removeChild(logger.firstChild)
}

log(numImports + " files imported initially.")

// Create register container
const registerContainer = new RegisterContainer();
// Create instruction set
const instructionSet = new InstructionList();
// Memory
const memory = new Memory(4096);
// Create flags
const flagList = new FlagList();
// Create instruction context
const instructionContext = new InstructionContext(instructionSet, registerContainer, memory, flagList);

// Set up Breakpoints
const breakpoints = new BreakpointList();


// Setup GUI
let textCode = new TextCode(document.getElementById("textcode"));

const DOMcode = textCode.DOMelem;
const DOMregisters = document.getElementById("registers");
const DOMflags = document.getElementById("flags");
const DOMstack = document.getElementById("stack");
const DOMmemory = document.getElementById("memory");
const RAMviewNumRows = 8;
let RAMviewLocation = 100;

// btns
const compileBtn = document.getElementById("compileBtn");
const stepInBtn = document.getElementById("stepInBtn");
const runBtn = document.getElementById("runBtn");


// Easy access to tbodies
const tables = [DOMregisters, DOMflags, DOMstack, DOMmemory];
tables.forEach(table=>{
    table.tbody = table.getElementsByTagName("tbody")[0];
    table.thead = table.getElementsByTagName("thead")[0];
});

// Events for updateGUI
const getInteractiveRegisterEvents = function (pos, hex) {
    const events = createInteractiveDivEvents( (elem, val) => {

        let number = null;
        if (hex) {
            if (!(val.length > 2 && val[0] == '0' && val[1] == 'x'))
                val = "0x"+val;

            number = Number(val, 16);
        }
        else number = Number(val);

        if (!isNaN(number)) {
            for (let i = 0; i < pos; i++)
                elem = elem.previousSibling;

            registerContainer.setValue(elem.innerText, number);
            instructionContext.updateGUI();
            return true;
        }
        return false;

    });
    return [
        {type:"focusin", func:events.focusin},
        {type:"keydown", func:events.keydown},
        {type:"focusout", func:events.focusout},
    ];
} 
const getInteractiveFlagEvents = function () {
    const events = createInteractiveDivEvents( (elem, val) => {

        let number = (val == '0' || val == '1') ? parseInt(val) : "NaN";

        if (!isNaN(number)) {
            flagList.set(elem.previousSibling.innerText, number);
            instructionContext.updateGUI();
            return true;
        }
        return false;

    });
    return [
        {type:"focusin", func:events.focusin},
        {type:"keydown", func:events.keydown},
        {type:"focusout", func:events.focusout},
    ];
} 
const getInteractiveStackEvents = function () {
    const events = createInteractiveDivEvents( (elem, val) => {

        let number = null;

        if (!(val.length > 2 && val[0] == '0' && val[1] == 'x'))
            val = "0x"+val;

        number = Number(val, 16);

        if (!isNaN(number)) {
            memory.setValue(Number(elem.previousSibling.innerText, 16), number, 4);
            instructionContext.updateGUI();
            return true;
        }
        return false;

    });
    return [
        {type:"focusin", func:events.focusin},
        {type:"keydown", func:events.keydown},
        {type:"focusout", func:events.focusout},
    ];
} 
const getInteractiveMemoryEventsValue = function (addr) {
    const events = createInteractiveDivEvents( (elem, val) => {

        let number = null;

        if (!(val.length > 2 && val[0] == '0' && val[1] == 'x'))
            val = "0x"+val;

        number = Number(val, 16);

        if (!isNaN(number) && number < 256) {
            memory.setValue(addr, number, 1);
            instructionContext.updateGUI();
            return true;
        }
        return false;

    });
    return [
        {type:"focusin", func:events.focusin},
        {type:"keydown", func:events.keydown},
        {type:"focusout", func:events.focusout},
    ];
} 
const getInteractiveMemoryEventsAddress = function (rowNum) {
    const events = createInteractiveDivEvents( (elem, val) => {

        let number = null;

        if (!(val.length > 2 && val[0] == '0' && val[1] == 'x'))
            val = "0x"+val;

        number = Number(val, 16);

        if (!isNaN(number)) {
            RAMviewLocation = val - rowNum * 16;
            instructionContext.updateGUI();
            return true;
        }
        return false;

    });
    return [
        {type:"focusin", func:events.focusin},
        {type:"keydown", func:events.keydown},
        {type:"focusout", func:events.focusout},
    ];
} 

const updateGUI = function(exports) {
    // console.log("GUI updated!")

    // Registers
    DOMregisters.tbody.innerHTML = "";
    exports.registers.registerArray.forEach(reg=>{
        createRowWithEvents([
            {text:reg.name32}, 
            {text:reg.getHexString(), events:getInteractiveRegisterEvents(1, true)}, 
            {text:reg.getValue(), events:getInteractiveRegisterEvents(2, false)}, 
            {text:reg.getValueSigned(), events:getInteractiveRegisterEvents(3, false)}
        ], DOMregisters.tbody);
    });

    // Flags
    DOMflags.tbody.innerHTML = "";
    exports.flags.flags.forEach(flag=>{
        createRowWithEvents([
            {text:flag.name}, 
            {text:flag.value, events:getInteractiveFlagEvents()}
        ], DOMflags.tbody);
    });

    // Stack
    DOMstack.tbody.innerHTML = "";
    let start = exports.registers.getValue("ESP"), end = exports.registers.getValue("EBP");
    if (end > 0) {
        for (let addr = start; addr <= end; addr += 4) {
            let regStr = "";
            // Find all registers with this value (addr)
            exports.registers.registerArray.forEach(reg=>{
                if (reg.getValue() == addr)
                    regStr += (reg.name32 + ", "); 
            });
            // Remove the last comma
            if (regStr.length > 0)
                regStr = regStr.slice(0, -2);

            createRowWithEvents([
                {text:regStr}, 
                {text:numToHexString(addr, 4)}, 
                {text:memory.getHexString(addr, 4), events:getInteractiveStackEvents()}
            ], DOMstack.tbody);
        }
    }
    else createRow(["Please Compile", "", ""], DOMstack.tbody);

    // RAM
    DOMmemory.tbody.innerHTML = "";
    DOMmemory.thead.innerHTML = "";

    // First apply head stuff (wrap from RAMviewLocation)
    let textList = [];
    const theadStyle = "font-weight:bold;text-align:center;padding:8px";
    textList.push({text:"Address", style:theadStyle});
    
    // For negatives (idk why, just when in scope)
    let startView = (RAMviewLocation >= 0) ? RAMviewLocation : 16+(RAMviewLocation % 16);
    for (let i = 0; i < 16; i++)
        textList.push({text:((startView + i) % 16).toString(16), style:theadStyle});

    createRowWithEvents(textList, DOMmemory.thead)

    // then body
    for (let rowNum = 0; rowNum < RAMviewNumRows; rowNum++) {

        start = RAMviewLocation + rowNum * 16, end = RAMviewLocation + 15 + rowNum * 16;

        let bytes = [];
        for (let addr = start; addr <= end; addr++) {
            let mem = memory.getHexString(addr, 1);

            // See if we get valid memory
            if (!mem) 
                mem = "-";
            else
                mem = mem.slice(2);

            bytes.push({
                text:mem, events:getInteractiveMemoryEventsValue(addr)
            });
        }

        createRowWithEvents([
            {text:numToHexString(new Uint32Array([start])[0], 4), events:getInteractiveMemoryEventsAddress(rowNum)}, 
            ...bytes], DOMmemory.tbody);
    }

}
instructionContext.setGUI(new GUI(updateGUI));

// Breakpoints
const evaluateBreakpoint = function(bp) {

    // We already take care of hardware in instruction end
    if (bp.hw) {
        if (bp.location == registerContainer.getRegister("EIP").getValue())
            return true;

        return false;
    }

    // thankfully we've already implemented this
    let comps = bp.condition.match(/[\=\>\<]+/);
    let ops = bp.condition.split(/[\=\>\<]+/);
    
    let op1 = ops[0].trim();
    let op2 = ops[1].trim();
    // Check for memory access
    let o1mem = (op1[0] == '[');
    let o2mem = (op2[0] == '[');
    op1 = instructionContext.getComputedValue(op1);
    op2 = instructionContext.getComputedValue(op2);
    if (o1mem) {
        if (registerContainer.getRegister(op2))
            op1 = memory.getValue(op1, registerContainer.getRegister(op2).getSize(op2));
        else
            op1 = memory.getValue(op1, 4);
    }
    if (o2mem) {
        if (registerContainer.getRegister(op1))
            op2 = memory.getValue(op2, registerContainer.getRegister(op1).getSize(op1));
        else
            op2 = memory.getValue(op2, 4);
    }

    let func = new Function("return (" + op1 + comps[0] + op2 +");");
    return func();

}

instructionContext.setInstructionDoneCallback(()=>{
    // Breakpoints
    let breakpointsHit = [];
    let i = 0;
    breakpoints.breakpointList.forEach(bp=>{
        if (evaluateBreakpoint(bp)) {
            breakpointsHit.push(bp);
            log("%cBREAKPOINT # "+ i +" HIT: " + bp.toString(), "color:green");
        }
        i++;
    });
    
    if (breakpointsHit.length > 0)
        instructionContext.running = false;
});


// Tests
const performTests = false;
if (performTests) {

    // Run
    // doRegisterTests(registerContainer, instructionContext);
    // doInstructionTests(registerContainer, instructionContext);
    // doArithmeticInstructionTests(registerContainer, instructionContext, flagList);
    doComparisonAndJumpTests(registerContainer, instructionContext, flagList);
    // doFlagTesting(registerContainer, instructionContext, flagList);
    // doMemoryTesting(registerContainer, instructionContext, flagList, memory)
}


// Set up flags and registers
function setUpFlagsAndRegisters() {

    let flags = flagList;


    // general purpose
    registerContainer.addRegister(new Register("EAX", "AX", "AH", "AL"));
    registerContainer.addRegister(new Register("EBX", "BX", "BH", "BL"));
    registerContainer.addRegister(new Register("ECX", "CX", "CH", "CL"));
    registerContainer.addRegister(new Register("EDX", "DX", "DH", "DL"));
    registerContainer.addRegister(new Register("EDI", "DI", "DIH", "DIL"));
    registerContainer.addRegister(new Register("ESI", "SI", "SIH", "SIL"));
    // Special
    let eip = new Register("EIP", "IX", "IH", "IL");
    let esp = new Register("ESP", "SP", "SPH", "SPL");
    let ebp = new Register("EBP", "BP", "BPH", "BPL");
    registerContainer.addRegister(ebp);
    registerContainer.addRegister(esp);
    registerContainer.addRegister(eip);
    registerContainer.setInstructionPointer(eip);
    registerContainer.setBasePointer(ebp);
    registerContainer.setStackPointer(esp);

    flags.addFlag(new Flag("ZF"));
    flags.addFlag(new Flag("CF"));
    flags.addFlag(new Flag("SF"));
    flags.addFlag(new Flag("OF"));

    flags.figureOut = (value, extraInfo)=>{

        // flags.zero();
        if (!extraInfo)
            extraInfo = {};

        if (value == 0)
            flags.set("ZF", 1);
        if (extraInfo.carry)
            flags.set("CF", 1);
        if (value < 0)
            flags.set("SF", 1);
        if (flags.overflow)
            flags.set("OF", 1);
    }
}
setUpFlagsAndRegisters()
instructionContext.updateGUI();


// Set up functional stuff
const DOMghidraCheck = document.getElementById("ghidraCheck");
const DOMuseStartCheck = document.getElementById("useStartAddress");
const DOMstartAddress = document.getElementById("startAddress");

const DOMcmd = document.getElementById("cmd");


function defineGlobalFunctions() {
    window.compile = function() {

        instructionContext.flush();
        // remove hardware breakpoints
        breakpoints.removeAllHardwareBreakpoints();

        let ghidra = DOMghidraCheck.checked;
        let useStartAddress = DOMuseStartCheck.checked;
        let startAddress = parseInt(DOMstartAddress.value, 16);

        if (useStartAddress && (isNaN(startAddress) || startAddress < 0)) {
            log("%cCOMPILE ERROR: Could not parse starting address.", "color:red;font-weight:bold;");
            // Remove colored spans
            let txt = DOMcode.innerText;
            DOMcode.innerText = txt;
            return;
        }
        
        // New
        let txt = DOMcode.innerText;
        DOMcode.innerText = "";

        let program = instructionContext.compileUserProgram(
            txt, ghidra, useStartAddress, startAddress,
            DOMcode
        );

        // Check for errors, if none then set textcode to it
        if (program) {

            // DOMcode.innerText = program;

            // If copied from ghidra, reset that because we've updated it
            DOMghidraCheck.checked = false;
        }

        log("%cCompiled and beginning execution.", "color:blue;font-weight:bold");
        log("Note: condition breakpoints are NOT reset but hardware breakpoints ARE.");

    }

    window.run = function () {
        instructionContext.run();
    }


    window.stepIn = function () {
        instructionContext.doOneInstruction();
    }

    window.command = function () {
        
        let cmd = DOMcmd.value.split(new RegExp(/[\s\t]+/g));
        
        if (cmd[0].length == 0) return;

        switch (cmd[0]) {
            case "bp":

                if (cmd.length == 1) {
                    log("\"bp\" (Breakpoint) Usage options:\n"
                        + "- bp a (see all breakpoints)\n"
                        + "- bp clear (remove all breakpoints)\n"
                        + "- bp <number> (see breakpoint)\n"
                        + "- bp rm <number> (remove breakpoint # )\n"
                        + "- bp hw <location> (set/remove hardware breakpoint at a location)\n"
                        + "- bp if <cond> (set conditional breakpoint):\n"
                        + "--- e.g. 'bp if EAX > 5' or 'bp if [100] == deadbeef'");
                    break;
                }
                else if (cmd.length == 2) {

                    if (cmd[1] == 'a') {
                        let str = "All Breakpoints:\n-----------------\n"
                        log(str+breakpoints.printAllBreakpoints());
                        break;
                    }
                    else if (cmd[1] === "clear") {
                        breakpoints.clearBreakPoints();
                        log("All breakpoints cleared.");
                        break;
                    }
                    else if (!isNaN(Number(cmd[1]))) {
                        log(breakpoints.printBreakpoint(Number(cmd[1])));
                        break;
                    }
                }
                else if (cmd.length == 3) {

                    if (cmd[1] === "rm" && !isNaN(cmd[2])) {
                        let e = breakpoints.removeBreakpoint(Number(cmd[2]));
                        if (e)
                            log("Successfully removed breakpoint # " + cmd[2]);
                        else
                            log("Could not find breakpoint # " + cmd[2] + " to remove.");

                        break;
                    }
                    else if (cmd[1] === "hw") {

                        let instrAddr = parseInt(cmd[2], 16);
                        let instr = instructionContext.program.get(instrAddr)

                        if (instr) {

                            if (instr.breakpointSet) {
                                log("%cHARDWARE BREAKPOINT REMOVED at " + numToHexString(instrAddr, 4), "color:green");
                                breakpoints.removeHardwareBreakpoint(instrAddr);
                            }
                            else {
                                breakpoints.addHardwareBreakpoint(instrAddr);
                                log("%cHARDWARE BREAKPOINT # "+ breakpoints.numBreakpoints +" SET at " + numToHexString(instrAddr, 4), "color:green");
                            }

                            instr.breakpointSet = !instr.breakpointSet;
                            
                            break;
                        }
                    }
                }
                else if (cmd.length >= 3 && cmd[1] === "if") {
                        
                    let cmdStr = DOMcmd.value.trim();
                    let condition = cmdStr.substring(cmdStr.indexOf("if") + 2);

                    if (breakpoints.addConditionBreakpoint(condition))
                        log("Added conditional breakpoint (# "+ breakpoints.numBreakpoints +"): " + condition);

                    break;

                }

                log("%cFAILED TO SET BREAKPOINT (Make sure you compiled the program first, type 'bp' for help)", "color:green");
                break;
            case "r":
                run();
                break;
            case "c":
                compile();
                break;
            case "si":
                stepIn();
                break;
            case "view":
                if (cmd.length == 3) {
                    let addr = parseInt(cmd[1], 16);
                    let len = parseInt(cmd[2], 16);
                    let addrStr = addr.toString(16);
                    let resultStr = "0x"+ "0".repeat(8-addrStr.length) + addrStr + ": \t";
                    for (let i = 0; i < len; i++) {
                        resultStr += memory.getHexString(addr + i, 1).substring(2) + " ";
                    }
                    log(resultStr);
                }
                else log("%cFAILED TO VIEW (Use form 'view <addr> <len>')", "color:red");
                break;
            case "clear":
                clearLog();
                break;
            default:
                log("%cUnrecognized command: " + DOMcmd.value, "color:red");
                break;
        }

        DOMcmd.value = "";
    }

    window.removeAddresses = function() {
        let userProgram = DOMcode.innerText;

        let lines = userProgram.split("\n");
        let newProgram = "";

        lines.forEach(line=>{

            // Disregard empty
            if (line.length == 0)
                return;

            let stuff = line.split(new RegExp(/[\s\t]+/g));
            // Just get to second non white space blurb (if it is not a number)
            let num = Number("0x"+stuff[0], 16);
            if (!isNaN(num)) {
                newProgram += "\t" + line.replace(stuff[0], "").trim() + "\n";
            }
            else if (stuff[0][stuff[0].length-1] == ':')
                newProgram += "\n" + stuff[0] + "\n";
        });

        DOMcode.innerHTML= newProgram;
    }
}
defineGlobalFunctions();

// Also make onenter do this
DOMcmd.addEventListener("keydown", e=>{
    if (e.key === "Enter")
        command();
})
