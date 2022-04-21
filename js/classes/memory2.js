const Memory = class {
    constructor(size) {
        this.size = size;
        this.memoryArray = [];
        for (let i = 0; i < size; i++) this.memoryArray.push(new Uint8Array(1));
        log("RAM of size " + size + " initialized.")
    }
    
    clear = function() {
        for (let i = 0; i < this.size; i++) this.memoryArray[i] = 0;
    }

    // checkByteOffset = function (offset, size) {
    //     if (size < 1 || size > 4)
    //         return false;
    //     if (size == 1)
    //         return true;
    //     if ((offset % 2 == 0) && size == 2)
    //         return true;
    //     if (offset == 0 && size == 4)
    //         return true;
    //     return false;
    // }

    getMemory = function(location, size) {

        // ensure valid mem
        if (location < 0 || location > this.size)
            return null;

        let buffer = new ArrayBuffer(size);
        let uint8view = new Uint8Array(buffer);
        for (let i = 0; i < size; i++) uint8view[i] = this.memoryArray[location+i];
        if (size == 4)
            return new Uint32Array(buffer)[0];
        else if (size == 2)
            return new Uint16Array(buffer)[0];
        else 
            return uint8view[0];
    }

    setMemory = function(location, value, size) {
        let buffer = new ArrayBuffer(size);
        let arr;
        if (size == 4) 
            arr = new Uint32Array(buffer);
        else if (size == 2)
            arr = new Uint16Array(buffer);
        else
            arr = new Uint8Array(buffer);

        arr[0] = value;

        let uint8view = new Uint8Array(buffer);
        for (let i = 0; i < size; i++) this.memoryArray[location+i] = uint8view[i];

    }


    setValue = function(location, value, size) {

        if (!size) size = 4;

        let oldValue = this.getMemory(location, size);

        // let byteOffset = location % 4;
        let byteOffset = 0;

        // if (!this.checkByteOffset(byteOffset, size)) {
        //     log(("%cCould not set value at " + location+": bad offset ["+"o:"+byteOffset+",sz:"+size+"]"), "color:red");
        //     return;
        // }

        let newValue = 0

        if (size == 4)
            newValue = value;
        else if (size == 2) {
            if (byteOffset == 0)
                newValue = (oldValue & 0xffff0000) | value;
            else if (byteOffset == 2)
                newValue = (oldValue & 0x0000ffff) | (value << 16);
        }
        else if (size == 1) {
            let tmp = (oldValue 
                & ( ( (0xff000000 >> 8*(3-byteOffset) ) << 8) | (0x00ffffff >> 8*(3-byteOffset) ) ) )
                | (value << 8*byteOffset); 

            newValue = tmp;
        }


        this.setMemory(location, newValue, size);
    }


    getValue = function(location, size) {

        if (!size) size = 4;

        let value = this.getMemory(location, size)

        if (value == null) {
            // log(("%cCould not get value at "+location+": not found"), "color:red");
            return NaN;
        }

        let byteOffset = 0;

        if (size == 4)
            return value;
        if (size == 2)
            if (byteOffset == 0)
                return value & 0xffff;
            if (byteOffset == 2)
                return (value & 0xffff0000) >>> 16;
        if (size == 1)
            return (value & (0xff << (8 * byteOffset) )) >>> (8 * byteOffset);

        return NaN;
    }

    getHexString = function (location, numBytes) {

        let val = this.getValue(location, numBytes);
        if (isNaN(val)) 
            return;

        if (!numBytes)
            numBytes = 4;

        let str = val.toString(16);
        // console.log("numBytes: " + numBytes + ", str: " + str + ", val: " + val);
        return "0x" + "0".repeat((numBytes * 2)-str.length) + str;
    }
}