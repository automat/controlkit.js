var SCHEME = {
    background   : null, //hex,rgbf
    width        : null, //0
    height       : null, //0
    padding      : null, //[0,0,0,0]
    align        : null, //'left','right','center'
    borderRadius : null, //[0,0,0,0]
    overflow     : null, //'visible','hidden','auto'
};

function validate(style){
    for(var p in style){
        if(SCHEME[p] === undefined){
            throw new Error('Style property "' + p + '" not supported.');
        }
    }
}

function copy(style){
    var out = {};
    for(var p in style){
        var prop = style[p];
        if(prop instanceof Array){
            prop = prop.slice(0);
        }
        out[p] = prop;
    }
    return out;
}

function isHex(color){

}

function isRGBfv(color){

}

function isGradient(color){

}

module.exports = {
    validate : validate,
    copy     : copy,

    isHex      : isHex,
    isRGBfv    : isRGBfv,
    isGradient : isGradient
};