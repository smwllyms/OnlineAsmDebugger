const Memory = class {
    constructor(size) {
        this.size = size;
        this.memoryMap = new Map();
    }
    
    clear = function() {
        this.memoryMap.clear();
    }

    checkByteOffset = function (offset, size) {
        if (size < 1 || size > 4)
            return false;
        if (size == 1)
            return true;
        if ((offset % 2 == 0) && size == 2)
            return true;
        if (offset == 0 && size == 4)
            return true;
        return false;
    }


    setValue = function(location, value, size) {

        if (!size) size = 4;

        let oldValue = this.memoryMap.get(location);
        this.memoryMap.delete(location);

        if (!oldValue)
            oldValue = new Uint32Array(1);

        let byteOffset = location % 4;

        if (!this.checkByteOffset(byteOffset, size)) {
            log(("%cCould not set value at " + location+": bad offset ["+"o:"+byteOffset+",sz:"+size+"]"), "color:red");
            return;
        }

        let newValue = new Uint32Array(1);

        if (size == 4)
            newValue[0] = value;
        else if (size == 2) {
            if (byteOffset == 0)
                newValue[0] = (oldValue[0] & 0xffff0000) | value;
            else if (byteOffset == 2)
                newValue[0] = (oldValue[0] & 0x0000ffff) | (value << 16);
        }
        else if (size == 1) {
            let tmp = (oldValue[0] 
                & ( ( (0xff000000 >> 8*(3-byteOffset) ) << 8) | (0x00ffffff >> 8*(3-byteOffset) ) ) )
                | (value << 8*byteOffset); 

            newValue[0] = tmp;
        }


        this.memoryMap.set(location, newValue);
    }


    getValue = function(location, size) {

        if (!size) size = 4;

        let value = this.memoryMap.get(location);

        if (!value) {
            log(("%cCould not get value at "+location+": not found"), "color:red");
            return;
        }

        let byteOffset = location % 4;

        if (!this.checkByteOffset(byteOffset, size)) {
            log(("%cCould not get value at " + location+": bad offset ["+"o:"+byteOffset+",sz:"+size+"]"), "color:red");
            return;
        }

        if (size == 4)
            return value[0];
        if (size == 2)
            if (byteOffset == 0)
                return value[0] & 0xffff;
            if (byteOffset == 2)
                return (value[0] & 0xffff0000) >>> 16;
        if (size == 1)
            return (value[0] & (0xff << (8 * byteOffset) )) >>> (8 * byteOffset);

        return NaN;
    }

    getHexString = function (location, numBytes) {

        let val = this.getValue(location);
        if (isNaN(val)) 
            return;

        if (!numBytes)
            numBytes = 4;

        let str = val.toString(16);
        return "0x" + "0".repeat((numBytes * 2)-str.length) + str;
    }
}