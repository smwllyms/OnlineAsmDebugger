// Instruction tests
function doRegisterTests(registerContainer, instructionContext) {
        
    log("%cPerforming some Register tests...", 'font-weight : bold;font-size:16px');

    log("%cAdding Register EAX...", 'font-weight : bold;font-size:16px');
    let r1 = new Register("EAX", "AX", "AH", "AL");
    registerContainer.addRegister(r1);
    log(registerContainer.toString());

    log("%cBeginning SetValue tests...", 'font-weight : bold;font-size:16px');
    registerContainer.setValue("EAX", 0xdeadbeef);
    log(registerContainer.getHexString("EAX", 4));
    registerContainer.setValue("AX", 0x11);
    log(registerContainer.getHexString("EAX", 4));
    registerContainer.setValue("Ah", 0xbe);
    log(registerContainer.getHexString("EAX", 4));
    registerContainer.setValue("AL", 0xef);
    log(registerContainer.getHexString("EAX", 4));

    log("%cBeginning GetValue tests...", 'font-weight : bold;font-size:16px');
    log(numToHexString(registerContainer.getValue("EAX"), 4));
    log(numToHexString(registerContainer.getValue("AX"), 2));
    log(numToHexString(registerContainer.getValue("ah"), 1));
    log(numToHexString(registerContainer.getValue("AL"), 1));

    log(registerContainer.toString());

    log("%cTesting Negatives...", 'font-weight : bold;font-size:16px');
    registerContainer.setValue("EAX", 0xffff00ff);
    log(registerContainer.toString());

    log("%cAdding Register EAX...again", 'font-weight : bold;font-size:16px');
    registerContainer.addRegister(r1);


    log("%cAdding Register EAR...with AL", 'font-weight : bold;font-size:16px');
    let r2 = new Register("EAR", "AR", "ARH", "AL");
    registerContainer.addRegister(r2);

    log("%cRemoving Register EAX...", 'font-weight : bold;font-size:16px');
    registerContainer.removeRegister(r1);
    log(registerContainer.toString());

    log("%cRemoving Register EAX...again", 'font-weight : bold;font-size:16px');
    registerContainer.removeRegister(r1);
}

// Instruction tests
function doInstructionTests(registerContainer) {
    let r1 = new Register("EAX", "AX", "AH", "AL");
    let r2 = new Register("EIP", "IX", "IH", "IL");
    registerContainer.addRegister(r1);
    registerContainer.addRegister(r2);
    registerContainer.setInstructionPointer(r2);

    log("%cTrying a valid instruction:", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("mov EAX 12");
    log("%cTrying an invalid instruction:", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("move EAX 12");
    log("%cAdding some more instructions...", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("add EAX EAX");
    instructionContext.addInstruction("add EAX 0x2");
    instructionContext.addInstruction("sub EAX 1");
    log("%cCompiling...", "font-size: 18px;font-weight:bold");
    instructionContext.compile();
    log("%cCheck IP (should be 1024)...", "font-size: 18px;font-weight:bold");
    log(r2.toString(r2.name32));
    log("%cRunning...", "font-size: 18px;font-weight:bold");
    instructionContext.run();
    log("%cCheck IP after (should be -1)...", "font-size: 18px;font-weight:bold");
    log(r2.toString(r2.name32));
    log("%cEAX should be 25...", "font-size: 18px;font-weight:bold");
    log("EAX: "+ registerContainer.getValue("EAX"));
}

// Arithmetic instruction test
function doArithmeticInstructionTests(registerContainer, instructionContext, flags) {
    // Set up
    let r1 = new Register("EAX", "AX", "AH", "AL");
    let r2 = new Register("EIP", "IX", "IH", "IL");
    registerContainer.addRegister(r1);
    registerContainer.addRegister(r2);
    registerContainer.setInstructionPointer(r2);

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


    // Arithmetic instruction
    log("%cmov EAX 1:(should be 1)", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("mov EAX 1");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getValue("EAX"));
    instructionContext.flush();

    log("%cadd EAX 2:(should be 2)", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("add EAX 2");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getValue("EAX"));
    instructionContext.flush();

    log("%csub EAX [6] 3:(should be 3)", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("mov EAX 6");
    instructionContext.addInstruction("sub EAX 3");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getValue("EAX"));
    instructionContext.flush();

    log("%csub EAX [6] 3:(should be 3)", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("mov EAX 6");
    instructionContext.addInstruction("sub EAX 3");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getValue("EAX"));
    instructionContext.flush();

    log("%cinc EAX [0]:(should be 1)", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("inc EAX");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getValue("EAX"));
    instructionContext.flush();

    log("%cand EAX [0] f:(should be 0)", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("and EAX 0xf");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getValue("EAX"));
    instructionContext.flush();

    log("%cand EAX [0xf] 4:(should be 4)", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("mov EAX 0xf");
    instructionContext.addInstruction("and EAX 4");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getValue("EAX"));
    instructionContext.flush();

    log("%cor EAX [0] 0xf:(should be 0xf)", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("or EAX 0xf");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getValue("EAX"));
    instructionContext.flush();

    log("%cxor EAX [0xf] EAX:(should be 0)", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("mov EAX 0xf");
    instructionContext.addInstruction("xor EAX EAX");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getValue("EAX"));
    instructionContext.flush();

    log("%cmul EAX (10) 6:(should be 60)", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("add EAX a");
    instructionContext.addInstruction("mul EAX 6");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getValue("EAX"));
    instructionContext.flush();

    log("%cmul EAX (1b) 3:(should be 3b)", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("add EAX 3b9aca00");
    instructionContext.addInstruction("mul EAX 3");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getValue("EAX"));
    instructionContext.flush();

    log("%cmul EAX (1b) 8:(should be 3,705,032,704 overflow)", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("add EAX 3b9aca00");
    instructionContext.addInstruction("mul EAX 8");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getValue("EAX"));
    instructionContext.flush();

    log("%cdiv EAX (10) 2:(should be 5)", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("add EAX a");
    instructionContext.addInstruction("div EAX 2");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getValue("EAX"));
    instructionContext.flush();

    log("%cdiv EAX (3b) 3:(should be 1b)", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("add EAX b2d05e00");
    instructionContext.addInstruction("div EAX 3");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getValue("EAX"));
    log("EAX: "+ registerContainer.getHexString("EAX"));
    instructionContext.flush();

    log("%cdiv EAX (5) 24:(should be 0)", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("add EAX 5");
    instructionContext.addInstruction("div EAX 18");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getValue("EAX"));
    instructionContext.flush();

    log("%cdiv EAX (4b) fffffffc:(4,294,967,292u, -4s, since signed, should be 0)", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("add EAX EE6B2800");
    instructionContext.addInstruction("div EAX fffffffc");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getValue("EAX"));
    instructionContext.flush();

    log("%cdiv EAX (2b) fffffffc:(4,294,967,292u, -4s, since signed, should be 0)", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("add EAX 77359400");
    instructionContext.addInstruction("div EAX fffffffc");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getValue("EAX", false));
    instructionContext.flush();

    log("%cimul EAX (10) 6:(should be 60)", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("add EAX a");
    instructionContext.addInstruction("imul EAX 6");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getValue("EAX"));
    instructionContext.flush();

    log("%cimul EAX (-4) 3:(should be -12)", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("add EAX fffffffc");
    instructionContext.addInstruction("imul EAX 3");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getValue("EAX", true));
    instructionContext.flush();

    log("%cidiv EAX (5) 24:(should be 0)", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("add EAX 5");
    instructionContext.addInstruction("idiv EAX 18");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getValue("EAX"));
    instructionContext.flush();

    log("%cidiv EAX (2b) fffffffc:(4,294,967,292u, -4s, since signed, should be -500000000)", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("add EAX 77359400");
    instructionContext.addInstruction("idiv EAX fffffffc");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getValue("EAX", true));
    instructionContext.flush();

    log("%cidiv EAX (-4) fffffffe (-2):(should be 2)", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("add EAX fffffffc");
    instructionContext.addInstruction("idiv EAX fffffffe");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getValue("EAX", true));
    instructionContext.flush();

    log("%cdiv EAX (4294967292) fffffffe (4294967294):(should be 0)", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("add EAX fffffffc");
    instructionContext.addInstruction("div EAX fffffffe");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getValue("EAX", true));
    instructionContext.flush();
    
}

function doComparisonAndJumpTests(registerContainer, instructionContext, flags) {
        // Set up
        let r1 = new Register("EAX", "AX", "AH", "AL");
        let r2 = new Register("EBX", "BX", "BH", "BL");
        let r3 = new Register("EIP", "IX", "IH", "IL");
        registerContainer.addRegister(r1);
        registerContainer.addRegister(r2);
        registerContainer.addRegister(r3);
        registerContainer.setInstructionPointer(r3);
    
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
        
        // optional
        // if (false) {
    
        // cmp >
        log("%ccmp eax (init 5) 1, No flags", "font-size: 18px;font-weight:bold");
        instructionContext.addInstruction("mov EAX 5");
        instructionContext.addInstruction("cmp EAX 1");
        instructionContext.compile();
        instructionContext.run();
        log("EAX: "+ registerContainer.getValue("EAX"));
        log(flags.toString())
        instructionContext.flush();

        // cmp <
        log("%ccmp eax (init 0) 1, CF", "font-size: 18px;font-weight:bold");
        instructionContext.addInstruction("cmp EAX 1");
        instructionContext.compile();
        instructionContext.run();
        log("EAX: "+ registerContainer.getValue("EAX"));
        log(flags.toString())
        instructionContext.flush();


        // test 0
        log("%ctest 0, ZF", "font-size: 18px;font-weight:bold");
        instructionContext.addInstruction("test EAX");
        instructionContext.compile();
        instructionContext.run();
        log("EAX: "+ registerContainer.getValue("EAX"));
        log(flags.toString())
        instructionContext.flush();

        // test nonzero
        log("%ctest 1, No flags", "font-size: 18px;font-weight:bold");
        instructionContext.addInstruction("mov EAX 1");
        instructionContext.addInstruction("test EAX");
        instructionContext.compile();
        instructionContext.run();
        log("EAX: "+ registerContainer.getValue("EAX"));
        log(flags.toString())
        instructionContext.flush();
    
        // Simple loop jg
        log("%cBasic Loop cmp eax (init 5) 1 jg, ", "font-size: 18px;font-weight:bold");
        instructionContext.addInstruction("mov EAX 5");
        instructionContext.addInstruction("dec EAX");
        instructionContext.addInstruction("cmp EAX 1");
        instructionContext.addInstruction("jg fffffffd");
        instructionContext.addInstruction("nop");
        instructionContext.compile();
        instructionContext.run();
        log("EAX: "+ registerContainer.getValue("EAX"));
        instructionContext.flush();

       // Simple loop jl
       log("%cBasic Loop cmp eax (init -5) -2 jl, ", "font-size: 18px;font-weight:bold");
       instructionContext.addInstruction("mov EAX -5");
       instructionContext.addInstruction("inc EAX");
       instructionContext.addInstruction("cmp EAX -2");
       instructionContext.addInstruction("jl fffffffd");
       instructionContext.addInstruction("nop");
       instructionContext.compile();
       instructionContext.run();
       log("EAX: "+ registerContainer.getValue("EAX", true));
       instructionContext.flush();

        log("%cBasic Loop test eax (init 5) jnz, ", "font-size: 18px;font-weight:bold");
        instructionContext.addInstruction("mov EAX 5");
        instructionContext.addInstruction("dec EAX");
        instructionContext.addInstruction("test EAX");
        instructionContext.addInstruction("jnz fffffffd");
        instructionContext.addInstruction("nop");
        instructionContext.compile();
        instructionContext.run();
        log("EAX: "+ registerContainer.getValue("EAX"));
        instructionContext.flush();

        log("%cBasic Loop test eax (init 0->5) jne, ", "font-size: 18px;font-weight:bold");
        instructionContext.addInstruction("inc EAX");
        instructionContext.addInstruction("cmp EAX 5");
        instructionContext.addInstruction("jne fffffffd");
        instructionContext.addInstruction("nop");
        instructionContext.compile();
        instructionContext.run();
        log("EAX: "+ registerContainer.getValue("EAX"));
        instructionContext.flush();

        log("%cBasic Loop test eax (init 5) je, ", "font-size: 18px;font-weight:bold");
        instructionContext.addInstruction("mov EAX 5");
        instructionContext.addInstruction("dec EAX");
        instructionContext.addInstruction("cmp EAX 0");
        instructionContext.addInstruction("je 1");
        instructionContext.addInstruction("jmp fffffffc");
        instructionContext.addInstruction("mov EAX deadbeef");
        instructionContext.compile();
        instructionContext.run();
        log("EAX: "+ registerContainer.getHexString("EAX"));
        instructionContext.flush();

        // Simple loop ja
        log("%cBasic Loop cmp eax (init 5) 1 ja, ", "font-size: 18px;font-weight:bold");
        instructionContext.addInstruction("mov EAX 5");
        instructionContext.addInstruction("dec EAX");
        instructionContext.addInstruction("cmp EAX 1");
        instructionContext.addInstruction("ja fffffffd");
        instructionContext.addInstruction("nop");
        instructionContext.compile();
        instructionContext.run();
        log("EAX: "+ registerContainer.getValue("EAX"));
        instructionContext.flush();

        log("%cBasic Loop cmp eax (init 5) 1 jnbe, ", "font-size: 18px;font-weight:bold");
        instructionContext.addInstruction("mov EAX 5");
        instructionContext.addInstruction("dec EAX");
        instructionContext.addInstruction("cmp EAX 1");
        instructionContext.addInstruction("jnbe fffffffd");
        instructionContext.addInstruction("nop");
        instructionContext.compile();
        instructionContext.run();
        log("EAX: "+ registerContainer.getValue("EAX"));
        instructionContext.flush();

        log("%cBasic Loop cmp eax (init 5) 1 jnb, ", "font-size: 18px;font-weight:bold");
        instructionContext.addInstruction("mov EAX 5");
        instructionContext.addInstruction("dec EAX");
        instructionContext.addInstruction("cmp EAX 1");
        instructionContext.addInstruction("jnb fffffffd");
        instructionContext.addInstruction("nop");
        instructionContext.compile();
        instructionContext.run();
        log("EAX: "+ registerContainer.getValue("EAX"));
        instructionContext.flush();
}

function doFlagTesting(registerContainer, instructionContext, flags) {
        // Set up
        let r1 = new Register("EAX", "AX", "AH", "AL");
        let r2 = new Register("EIP", "IX", "IH", "IL");
        registerContainer.addRegister(r1);
        registerContainer.addRegister(r2);
        registerContainer.setInstructionPointer(r2);
    
        flags.addFlag(new Flag("ZF"));
        flags.addFlag(new Flag("CF"));
        flags.addFlag(new Flag("SF"));
        flags.addFlag(new Flag("OF"));
    
        flags.figureOut = (value, extraInfo)=>{
    
            // flags.zero();
            if (!extraInfo)
                extraInfo = {};
    
            if (extraInfo.zero)
                flags.set("ZF", 1);
            if (extraInfo.carry)
                flags.set("CF", 1);
            if (extraInfo.sign)
                flags.set("SF", 1);
            if (extraInfo.overflow)
                flags.set("OF", 1);
        }
    
    
        // Arithmetic instruction
        log("%cmov EAX 1: No flags should be set", "font-size: 18px;font-weight:bold");
        instructionContext.addInstruction("mov EAX 1");
        instructionContext.compile();
        instructionContext.run();
        log("EAX: "+ registerContainer.getValue("EAX"));
        log(flags.toString())
        instructionContext.flush();

        // Carry flag check
        log("%cadd AL (0xff) 1: CF and ZF should be set", "font-size: 18px;font-weight:bold");
        instructionContext.addInstruction("mov AL 0xff");
        instructionContext.addInstruction("add AL 0x1");
        instructionContext.compile();
        instructionContext.run();
        log("AL: "+ registerContainer.getValue("AL"));
        log("EAX: "+ registerContainer.getValue("EAX"));
        log(flags.toString())
        instructionContext.flush();

        log("%csub AL (0x0) 1: CF and SF should be set", "font-size: 18px;font-weight:bold");
        instructionContext.addInstruction("sub AL 0x1");
        instructionContext.compile();
        instructionContext.run();
        log("AL: "+ registerContainer.getValue("AL"));
        log("EAX: "+ registerContainer.getValue("EAX"));
        log(flags.toString())
        instructionContext.flush();

        log("%cadd AL (0x7f) 0x7f: OF and SF should be set", "font-size: 18px;font-weight:bold");
        instructionContext.addInstruction("mov AL 0x7f");
        instructionContext.addInstruction("add AL 0x7f");
        instructionContext.compile();
        instructionContext.run();
        log("AL: "+ registerContainer.getValue("AL"));
        log("EAX: "+ registerContainer.getValue("EAX"));
        log(flags.toString())
        instructionContext.flush();

        log("%cadd AL (0x80) 0x80: OF, CF and ZF should be set", "font-size: 18px;font-weight:bold");
        instructionContext.addInstruction("mov AL 0x80");
        instructionContext.addInstruction("add AL 0x80");
        instructionContext.compile();
        instructionContext.run();
        log("AL: "+ registerContainer.getValue("AL"));
        log("EAX: "+ registerContainer.getValue("EAX"));
        log(flags.toString())
        instructionContext.flush();

        log("%csub AL (0x80) 0x7f: OF should be set", "font-size: 18px;font-weight:bold");
        instructionContext.addInstruction("mov AL 0x80");
        instructionContext.addInstruction("sub AL 0x7f");
        instructionContext.compile();
        instructionContext.run();
        log("AL: "+ registerContainer.getValue("AL"));
        log("EAX: "+ registerContainer.getValue("EAX"));
        log(flags.toString())
        instructionContext.flush();
}

function doMemoryTesting(registerContainer, instructionContext, flags, memory) {
    // Set up
    let r1 = new Register("EAX", "AX", "AH", "AL");
    let r2 = new Register("EBX", "BX", "BH", "BL");
    let r3 = new Register("EIP", "IX", "IH", "IL");
    registerContainer.addRegister(r1);
    registerContainer.addRegister(r2);
    registerContainer.addRegister(r3);
    registerContainer.setInstructionPointer(r3);

    log("%cmov [100] 1", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("mov [64] 1");
    instructionContext.compile();
    instructionContext.run();
    log("[100]: "+ memory.getHexString(100));
    instructionContext.flush();

    log("%cmov [100] 0xdeadbeef: Testing get with eax", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("mov [64] 0xdeadbeef");
    instructionContext.compile();
    instructionContext.run();
    log("[100]: " + memory.getHexString(100));
    instructionContext.flush();
    instructionContext.addInstruction("mov [64] 0xdeadbeef");
    instructionContext.addInstruction("mov eax [64]");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getHexString("EAX"));
    instructionContext.flush();
    instructionContext.addInstruction("mov [64] 0xdeadbeef");
    instructionContext.addInstruction("mov ax [64]");
    instructionContext.compile();
    instructionContext.run();
    log("AX: "+ registerContainer.getHexString("AX"));
    instructionContext.flush();
    instructionContext.addInstruction("mov [64] 0xdeadbeef");
    instructionContext.addInstruction("mov ah [64]");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: "+ registerContainer.getHexString("EAX"));
    log("AH: "+ registerContainer.getHexString("AH"));
    instructionContext.flush();
    instructionContext.addInstruction("mov [64] 0xdeadbeef");
    instructionContext.addInstruction("mov al [64]");
    instructionContext.compile();
    instructionContext.run();
    log("AL: "+ registerContainer.getHexString("AL"));
    instructionContext.flush();

    log("%cmov [eax] 0xdeadbeef: Testing set with eax", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("mov eax 0xdeadbeef");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: " + registerContainer.getHexString("EAX"));
    instructionContext.flush();
    instructionContext.addInstruction("mov eax 0xdeadbeef");
    instructionContext.addInstruction("mov [64] eax");
    instructionContext.compile();
    instructionContext.run();
    log("EAX->[100]: "+ memory.getHexString(100));
    instructionContext.flush();
    instructionContext.addInstruction("mov eax 0xdeadbeef");
    instructionContext.addInstruction("mov [64] ax");
    instructionContext.compile();
    instructionContext.run();
    log("AX->[100]: "+ memory.getHexString(100, 2));
    instructionContext.flush();
    instructionContext.addInstruction("mov eax 0xdeadbeef");
    instructionContext.addInstruction("mov [64] ah");
    instructionContext.compile();
    instructionContext.run();
    log("AH->[100]: "+ memory.getHexString(100, 1));
    instructionContext.flush();
    instructionContext.addInstruction("mov eax 0xdeadbeef");
    instructionContext.addInstruction("mov [64] al");
    instructionContext.compile();
    instructionContext.run();
    log("AL->[100]: "+ memory.getHexString(100, 1));
    instructionContext.flush();

    log("%cmov [eax+4*ebx] 0xdeadbeef, EAX=96, EBX=1", "font-size: 18px;font-weight:bold");
    instructionContext.addInstruction("mov eax 60");
    instructionContext.addInstruction("mov ebx 1");
    instructionContext.addInstruction("mov [eax + 4*ebx] 0xdeadbeef");
    instructionContext.compile();
    instructionContext.run();
    log("EAX: " + registerContainer.getHexString("EAX"));
    log("EBX: " + registerContainer.getHexString("EBX"));
    log("[100]: "+ memory.getHexString(100));
    instructionContext.flush();
}