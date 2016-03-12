export function measureText(ctx, str, options = {}){
    options.fontSize   = options.fontSize === undefined ? 16 : options.fontSize;
    options.lineHeight = options.lineHeight === undefined ? 1.5 : options.lineHeight;

    if(options.maxWidth === undefined){
        return {
            width : ctx.measureText(str).width,
            height : options.fontSize
        };
    }

    let lineHeight = options.lineHeight * options.fontSize;

    let words = str.split(' ');
    let line = '';
    let lineWidth = 0;
    let lineOffset = options.fontSize;

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

    return {
        width : options.maxWidth,
        height : lineOffset
    }
}

export function nearestCaretPos(ctx, x, str){
    let chars = str.split('');
    let string = '';
    let position = 0;
    let index = 0;
    while(position < x && chars.length !== 0){
        string += chars.shift();
        position = ctx.measureText(string).width;
        index++;
    }
    return index;
}

export function measureTextAtCaretPos(ctx,caretPos,str){
    str = str.substr(0,caretPos);
    return ctx.measureText(str).width;
}