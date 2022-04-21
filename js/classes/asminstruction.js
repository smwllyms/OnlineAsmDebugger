/**
 * Permitted instructions (32 bit):
 * 
 * note: r/mX register or mem location of size X bits
 * Another note: We will interpret size for instruction based on input register
 * e.g. AL = 8 bits, AX = 16 bits, EAX = 32 bits
 * 
 * // Arithmetic
 * y mov r/m (dest), r/m | add r/m (dest), imm
 * y add r/m (dest), r/m | add r/m (dest), imm
 * y sub reg (dest), r/m | sub r/m (dest), imm [ subtract op2 from op1 ]
 * y inc r/m (dest)
 * y dec r/m (dest)
 * y and r/m (dest), r/m | and r/m (dest) 
 * y or  r/m (dest), r/m | and r/m (dest) 
 * y xor r/m (dest), r/m | and r/m (dest) 
 * y mul // unsigned
 * y div // unsigned
 * y imul // signed
 * y idiv // signed
 * 
 * // Conditionality
 * test
 * cmp
 * 
 * // Jump
 * jmp
 * jeq / jz
 * jne
 * ja
 * jae
 * jb
 * jbe
 * jg
 * jge
 * jl
 * jle
 * 
 * // Stack
 * push
 * pop
 * call
 * ret
 * 
 */
// Helper function for setting arithmetic flags
// https://teaching.idallen.com/dat2343/10f/notes/040_overflow.txt
const getArithmeticFlags = function (instr, arg1, arg2, result) {

    let sign1 = (arg1.signed < 0);
    let sign2 = (arg2.signed < 0);
    let signR = (result.signed < 0);

    let extraInfo = {};

    // Carry
    if ((instr === "add") && (result.unsigned < arg1.unsigned)) {
        // Case 1: Hi bit was carried
        extraInfo.carry = true;
    }
    else if ((instr === "sub") && (result.unsigned > arg1.unsigned)) {
        // Case 2 hi bit was borrowed
        extraInfo.carry = true;
    }

    // Overflow
    if (instr === "add") {
        if (sign1 == sign2 && sign1 != signR) {
            // 0 0 1 (adding two positives should be positive)
            // 1 1 0 (adding two negatives should be negative)
            extraInfo.overflow = true;
        }
    }
    else if (instr === "sub") {
        if ((sign1 != sign2) && (sign1 != signR)) {
            // 0 1 1 (subtracting a negative is the same as adding a positive)
            // 1 0 0 (subtracting a positive is the same as adding a negative)
            extraInfo.overflow = true;
        }
    }

    // Sign
    if (signR)
        extraInfo.sign = true;
    
    // Zero
    if (result.unsigned == 0)
        extraInfo.zero = true;

    return extraInfo;
}

const Instruction = class {
    constructor(name, func) {
        this.name = name;
        this.func = func;
    }
}
const InstructionList = class {
    constructor() {
        // Contains our instructions
        this.instructions = new Map();

        // No op
        this.instructions.set("nop", new Instruction("nop",
            function (unused, unused2, flags) {
                // Nothing
            }
        ));        

        // Arithmetic

        // mov r/m (dest), r/m | add r/m (dest), imm
        this.instructions.set("mov", new Instruction("mov",
            function (arg1, arg2, flags) {
                // TODO flags? no
                arg1.setValue(arg2.getValue());
            }
        ));

        // Add sets flags
        this.instructions.set("add", new Instruction("add",
            function (arg1, arg2, flags, bypassFlags) {
                let result = arg1.getValue() + arg2.getValue();

                let ogVal1 = {signed:arg1.getValueSigned(), unsigned:arg1.getValue()};
                arg1.setValue(result);
                let extraInfo = getArithmeticFlags("add", ogVal1, 
                    {signed:arg2.getValueSigned(), unsigned:arg2.getValue()}, 
                    {signed:arg1.getValueSigned(), unsigned:arg1.getValue()});
                    
                if (!bypassFlags) {
                    flags.zero();
                    flags.figureOut(result, extraInfo);
                }
            }
        ));

        // Sub sets flags
        this.instructions.set("sub", new Instruction("sub",
            function (arg1, arg2, flags, bypassFlags) {
                let result = arg1.getValue() - arg2.getValue();

                let ogVal1 = {signed:arg1.getValueSigned(), unsigned:arg1.getValue()};
                arg1.setValue(result);
                let extraInfo = getArithmeticFlags("sub", ogVal1, 
                    {signed:arg2.getValueSigned(), unsigned:arg2.getValue()}, 
                    {signed:arg1.getValueSigned(), unsigned:arg1.getValue()});

                if (!bypassFlags) {
                    flags.zero();
                    flags.figureOut(result, extraInfo);
                }
            }
        ));

        this.instructions.set("inc", new Instruction("inc",
            function (arg1, unused, flags) {
                let result = arg1.getValue() + 1;
                arg1.setValue(result);
            }
        ));
        
        this.instructions.set("dec", new Instruction("dec",
            function (arg1, unused, flags) {
                let result = arg1.getValue() - 1;
                arg1.setValue(result);
            }
        ));

        this.instructions.set("and", new Instruction("and",
            function (arg1, arg2, flags) {
                let result = arg1.getValue() & arg2.getValue();
                arg1.setValue(result);
            }
        ));

        this.instructions.set("or", new Instruction("or",
            function (arg1, arg2, flags) {
                let result = arg1.getValue() | arg2.getValue();
                arg1.setValue(result);
            }
        ));

        this.instructions.set("xor", new Instruction("xor",
            function (arg1, arg2, flags) {
                let result = arg1.getValue() ^ arg2.getValue();
                arg1.setValue(result);
            }
        ));

        // Mull and div
        this.instructions.set("mul", new Instruction("mul",
            function (arg1, arg2, flags) {
                let result = arg1.getValue() * arg2.getValue();

                let ogVal1 = {signed:arg1.getValueSigned(), unsigned:arg1.getValue()};
                arg1.setValue(result);
                let extraInfo = getArithmeticFlags("mul", ogVal1, 
                    {signed:arg2.getValueSigned(), unsigned:arg2.getValue()}, 
                    {signed:arg1.getValueSigned(), unsigned:arg1.getValue()});
                    
                flags.zero();
                flags.figureOut(result, extraInfo);
            }
        ));

        this.instructions.set("div", new Instruction("div",
            function (arg1, arg2, flags) {
                let result = parseInt(arg1.getValue() / arg2.getValue());

                let ogVal1 = {signed:arg1.getValueSigned(), unsigned:arg1.getValue()};
                arg1.setValue(result);
                let extraInfo = getArithmeticFlags("div", ogVal1, 
                    {signed:arg2.getValueSigned(), unsigned:arg2.getValue()}, 
                    {signed:arg1.getValueSigned(), unsigned:arg1.getValue()});
                    
                flags.zero();
                flags.figureOut(result, extraInfo);
            }
        ));

        this.instructions.set("imul", new Instruction("imul",
            function (arg1, arg2, flags) {
                let result = arg1.getValueSigned() * arg2.getValueSigned();

                let ogVal1 = {signed:arg1.getValueSigned(), unsigned:arg1.getValue()};
                arg1.setValue(result);
                let extraInfo = getArithmeticFlags("imul", ogVal1, 
                    {signed:arg2.getValueSigned(), unsigned:arg2.getValue()}, 
                    {signed:arg1.getValueSigned(), unsigned:arg1.getValue()});
                    
                flags.zero();
                flags.figureOut(result, extraInfo);
            }
        ));

        this.instructions.set("idiv", new Instruction("idiv",
            function (arg1, arg2, flags) {
                let result = parseInt(arg1.getValueSigned() / arg2.getValueSigned());

                let ogVal1 = {signed:arg1.getValueSigned(), unsigned:arg1.getValue()};
                arg1.setValue(result);
                let extraInfo = getArithmeticFlags("idiv", ogVal1, 
                    {signed:arg2.getValueSigned(), unsigned:arg2.getValue()}, 
                    {signed:arg1.getValueSigned(), unsigned:arg1.getValue()});
                    
                flags.zero();
                flags.figureOut(result, extraInfo);
            }
        ));
        
        
        
        // Conditionality 

        this.instructions.set("test", new Instruction("test",
            function (arg1, unused, flags) {
                let result = arg1.getValue();

                let extraInfo = {zero: (arg1.getValue() == 0)}
                    
                flags.zero();
                flags.figureOut(result, extraInfo);                
            }
        ));

        this.instructions.set("cmp", new Instruction("cmp",
            function (arg1, arg2, flags) {
                let result = arg1.getValue() - arg2.getValue();

                /*
                CF - 1 if unsigned op2 > unsigned op1
                OF - 1 if sign bit of OP1 != sign bit of result
                SF - 1 if MSB (aka sign bit) of result = 1
                ZF - 1 if Result = 0 (i.e. op1=op2)
                AF - 1 if Carry in the low nibble of result
                PF - 1 if Parity of Least significant byte is even
                */

                let ogVal1 = {signed:arg1.getValueSigned(), unsigned:arg1.getValue()};

                // Don't change value

                // NOTE: Marked as sub
                let extraInfo = getArithmeticFlags("sub", ogVal1, 
                    {signed:arg2.getValueSigned(), unsigned:arg2.getValue()}, 
                    {signed:result, unsigned:new Uint32Array([result])[0]});
                    
                flags.zero();
                flags.figureOut(result, extraInfo);   
            }
        ));


        // Jumps
        // https://faydoc.tripod.com/cpu/jg.htm


        this.instructions.set("jmp", new Instruction("jmp", 
        function (arg1, eip, flags) {

            let newAddr = eip.getValue() + arg1.getValueSigned();

            eip.setValue(newAddr);
            return true;
        }
    ));


        // Jump Greater
        this.instructions.set("jg", new Instruction("jg", 
            function (arg1, eip, flags) {

                let newAddr = eip.getValue() + arg1.getValueSigned();

                if (!flags.getFlag("ZF").value && flags.getFlag("OF").value == flags.getFlag("SF").value) {
                    eip.setValue(newAddr);
                    return true;
                }

                // We did not update EIP
                return false;
            }
        ));
        this.instructions.set("jnle", this.getInstruction("jg"));

        this.instructions.set("jge", new Instruction("jge", 
            function (arg1, eip, flags) {

                let newAddr = eip.getValue() + arg1.getValueSigned();

                if (flags.getFlag("OF").value == flags.getFlag("SF").value) {
                    eip.setValue(newAddr);
                    return true;
                }

                // We did not update EIP
                return false;
            }
        ));
        this.instructions.set("jnl", this.getInstruction("jge"));

        this.instructions.set("jl", new Instruction("jl", 
            function (arg1, eip, flags) {

                let newAddr = eip.getValue() + arg1.getValueSigned();

                if (!flags.getFlag("ZF").value && flags.getFlag("OF").value != flags.getFlag("SF").value) {
                    eip.setValue(newAddr);
                    return true;
                }

                // We did not update EIP
                return false;
            }
        ));
        this.instructions.set("jnge", this.getInstruction("jl"));

        this.instructions.set("jle", new Instruction("jle", 
            function (arg1, eip, flags) {

                let newAddr = eip.getValue() + arg1.getValueSigned();

                if (flags.getFlag("OF").value != flags.getFlag("SF").value) {
                    eip.setValue(newAddr);
                    return true;
                }

                // We did not update EIP
                return false;
            }
        ));
        this.instructions.set("jng", this.getInstruction("jle"));
        


        // Above and below

        this.instructions.set("ja", new Instruction("ja", 
        function (arg1, eip, flags) {

            let newAddr = eip.getValue() + arg1.getValueSigned();

            if (!flags.getFlag("ZF").value && !flags.getFlag("CF").value) {
                eip.setValue(newAddr);
                return true;
            }

            // We did not update EIP
            return false;
        }
    ));
    this.instructions.set("jnbe", this.getInstruction("ja"));

    this.instructions.set("jae", new Instruction("jae", 
        function (arg1, eip, flags) {

            let newAddr = eip.getValue() + arg1.getValueSigned();

            if (!flags.getFlag("CF").value) {
                eip.setValue(newAddr);
                return true;
            }

            // We did not update EIP
            return false;
        }
    ));
    this.instructions.set("jnb", this.getInstruction("jae"));

    this.instructions.set("jb", new Instruction("jb", 
        function (arg1, eip, flags) {

            let newAddr = eip.getValue() + arg1.getValueSigned();

            if (!flags.getFlag("ZF").value && flags.getFlag("CF").value) {
                eip.setValue(newAddr);
                return true;
            }

            // We did not update EIP
            return false;
        }
    ));
    this.instructions.set("jnae", this.getInstruction("jb"));

    this.instructions.set("jbe", new Instruction("jbe", 
        function (arg1, eip, flags) {

            let newAddr = eip.getValue() + arg1.getValueSigned();

            if (flags.getFlag("CF").value) {
                eip.setValue(newAddr);
                return true;
            }

            // We did not update EIP
            return false;
        }
    ));
    this.instructions.set("jna", this.getInstruction("jbe"));
        
        
        
        
        
        this.instructions.set("jnz", new Instruction("jnz", 
            function (arg1, eip, flags) {

                let newAddr = eip.getValue() + arg1.getValueSigned();

                if (!flags.getFlag("ZF").value) {
                    eip.setValue(newAddr);
                    return true;
                }

                // We did not update EIP
                return false;
            }
        ));
        this.instructions.set("jne", this.getInstruction("jnz")); 

        this.instructions.set("jz", new Instruction("jz", 
            function (arg1, eip, flags) {

                let newAddr = eip.getValue() + arg1.getValueSigned();

                if (flags.getFlag("ZF").value) {
                    eip.setValue(newAddr);
                    return true;
                }

                // We did not update EIP
                return false;
            }
        ));
        this.instructions.set("je", this.getInstruction("jz")); 


        // Stack functions

        // Push and pop (here but not implemented)
        this.instructions.set("push", new Instruction("push", ()=>{}));
        this.instructions.set("pop", new Instruction("pop", ()=>{}));

        this.instructions.set("call", new Instruction("call", ()=>{}));
        this.instructions.set("ret", new Instruction("ret", ()=>{}));        


        // LEA has been modified in instruction context
        this.instructions.set("lea", this.instructions.get("mov"));

    }
    
    
    getInstruction(instr) {
        return this.instructions.get(instr.toLowerCase());
    }

    setInstructionPointer(ipRegister) {
        this.ipRegister = ipRegister;
    }
}