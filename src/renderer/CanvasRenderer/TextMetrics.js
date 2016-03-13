import validateOptions from "validate-option";

const DEFAULT_FONT_OPTIONS = {
    fontSize   : 10,
    fontFamily : 'Arial',
    lineHeight : 1.5,
    maxWidth   : null
};

export function measureText(ctx, str, options){
    options = validateOptions(options,DEFAULT_FONT_OPTIONS);

    //only supports 'fontSize fontFamily' format
    let fontProperties = ctx.font.split(' ');
    let fontSize       = options.fontSize;
    let fontFamily     = options.fontFamily;
    let lineHeight     = options.lineHeight * fontSize;
    let changeFont     = fontSize !== fontProperties[0] || fontFamily !== fontProperties[1];

    if(changeFont){
        ctx.save();
        ctx.font = `${fontSize}px ${fontFamily}`;
    }

    if(options.maxWidth === null){
        if(changeFont){
            ctx.restore();
        }
        return {
            width : ctx.measureText(str).width,
            height : fontSize
        };
    }

    let words = str.split(' ');
    let line = '';
    let lineWidth = 0;
    let lineOffset = fontSize;

    while(words.length > 0){
        let word = words[0];
        let wordWidth = ctx.measureText(word).width;

        if(lineWidth + wordWidth >= options.maxWidth){
            lineOffset += lineHeight;
            line = '';
            lineWidth = 0;
        }

        line += word + ' ';
        lineWidth = ctx.measureText(line).width;
        words.shift();
    }

    if(changeFont){
        ctx.restore();
    }
    return {
        width : options.maxWidth,
        height : lineOffset
    }
}

export function nearestCaretPos(ctx, x, str, options){
    options = validateOptions(options,DEFAULT_FONT_OPTIONS);

    let fontProperties = ctx.font.split(' ');
    let fontSize       = options.fontSize;
    let fontFamily     = options.fontFamily;
    let changeFont     = fontSize !== fontProperties[0] || fontFamily !== fontProperties[1];

    if(changeFont){
        ctx.save();
        ctx.font = `${fontSize}px ${fontFamily}`;
    }
    let chars = str.split('');
    let string = '';
    let position = 0;
    let index = 0;

    while(position < x && chars.length !== 0){
        string += chars.shift();
        position = ctx.measureText(string).width;
        index++;
    }
    if(changeFont){
        ctx.restore();
    }
    return index - 1;
}

export function measureTextAtCaretPos(ctx,caretPos,str,options){
    options = validateOptions(options);
    str = str.substr(0,caretPos);
    return measureText(ctx,str,options).width;
}