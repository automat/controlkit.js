export function rect(ctx, x, y, width, height, inset = 0){
    ctx.rect(x + inset * 0.5, y + inset * 0.5, width - inset, height - inset);
}

export function roundedRect1(ctx, x, y, width, height, radius, inset = 0){
    x += inset * 0.5;
    y += inset * 0.5;
    width -= inset;
    height -= inset;

    radius = Math.min(Math.min(width, height) * 0.5, radius);

    ctx.moveTo(x, y + radius);
    ctx.lineTo(x, y + height - radius);
    ctx.quadraticCurveTo(x, y + height, x + radius, y + height);
    ctx.lineTo(x + width - radius, y + height);
    ctx.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
    ctx.lineTo(x + width, y + radius);
    ctx.quadraticCurveTo(x + width, y, x + width - radius, y);
    ctx.lineTo(x + radius, y);
    ctx.quadraticCurveTo(x, y, x, y + radius);
}

export function roundedRect4(ctx, x, y, width, height, tl, tr, br, bl, inset = 0){
    x += inset * 0.5;
    y += inset * 0.5;
    width -= inset;
    height -= inset;

    let min = Math.min(width, height) * 0.5;
    tl = Math.min(min, tl);
    bl = Math.min(min, bl);
    br = Math.min(min, br);
    tr = Math.min(min, tr);

    ctx.moveTo(x, y + tl);
    ctx.lineTo(x, y + height - bl);
    ctx.quadraticCurveTo(x, y + height, x + bl, y + height);
    ctx.lineTo(x + width - br, y + height);
    ctx.quadraticCurveTo(x + width, y + height, x + width, y + height - br);
    ctx.lineTo(x + width, y + tr);
    ctx.quadraticCurveTo(x + width, y, x + width - tr, y);
    ctx.lineTo(x + tl, y);
    ctx.quadraticCurveTo(x, y, x, y + tl);
}

export function fillTextMultiline(ctx, str, x = 0, y = 0, options = {}){
    options.fontSize   = options.fontSize === undefined ? 16 : options.fontSize;
    options.lineHeight = options.lineHeight === undefined ? 1.5 : options.lineHeight;
    options.textAlign  = options.textAlign === undefined ? 'left' : options.textAlign;

    let lineHeight = options.lineHeight * options.fontSize;

    let words = str.split(' ');
    let line = '';
    let lineWidth = 0;
    let lineOffset = y;

    function offset(){
        switch(options.textAlign){
            default:
            case 'left':
                return 0;
                break;
            case 'center':
                return (options.maxWidth - lineWidth) * 0.5;
                break;
            case 'right':
                return options.maxWidth - lineWidth;
                break;
        }
    }

    if(options.maxWidth === undefined){
        ctx.fillText(str, x + offset(), y);
        return;
    }

    while(words.length > 0){
        let word = words[0];
        let wordWidth = ctx.measureText(word).width;

        if(lineWidth + wordWidth >= options.maxWidth){
            ctx.fillText(line, x + offset(), lineOffset);
            lineOffset += lineHeight;
            line = '';
            lineWidth = 0;
        }

        line += word + ' ';
        lineWidth = ctx.measureText(line).width;
        words.shift();

        if(words.length == 0){
            ctx.fillText(line, x + offset(), lineOffset);
        }
    }
}

export function line(ctx, x0, y0, x1, y1){
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
}

export function lines(ctx, lines){
    for(let i = 0, l = lines.length; i < l; i += 4){
        ctx.moveTo(lines[i], lines[i + 1]);
        ctx.lineTo(lines[i + 2], lines[i + 2])
    }
}

export function lineH(ctx, x0, x1, y){
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
}

export function lineV(ctx, x, y0, y1){
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
}
