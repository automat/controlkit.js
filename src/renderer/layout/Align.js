var Alignment = {
    TOP    : 'top',
    BOTTOM : 'bottom',
    CENTER : 'center',
    LEFT   : 'left',
    RIGHT  : 'right'
};

function horizontalTo(a,b,aAlignment,bAlignment,offsetx){
    if(aAlignment === undefined || bAlignment === undefined){
        throw new Error('No alignment specified.');

    } else if(aAlignment === Alignment.TOP ||
              aAlignment === Alignment.BOTTOM ||
              bAlignment === Alignment.TOP ||
              bAlignment === Alignment.BOTTOM){
       throw new Error('Wrong alignment type specified.');
    }

    var bbounds = b.getBoundsGlobal();

    a.setPositionX(offsetx || 0);

    var reference = 0;

    switch(bAlignment){
        case Alignment.LEFT:
            reference = bbounds[0];
            break;
        case Alignment.CENTER:
            reference = (bbounds[0] + bbounds[2]) * 0.5;
            break;
        case Alignment.RIGHT:
            reference = bbounds[2];
            break;
    }

    switch (aAlignment){
        case Alignment.LEFT:
            reference += 0;
            break;
        case Alignment.CENTER:
            reference -= a.getWidth() * 0.5;
            break;
        case Alignment.RIGHT:
            reference -= a.getWidth();
            break;
    }

    a.setPositionXAbsolute(reference);
}

function verticalTo(a,b,aAlignment,bAlignment,offsety){
    if(aAlignment === undefined || bAlignment === undefined){
        throw new Error('No alignment specified.');

    } else if(aAlignment === Alignment.LEFT ||
              aAlignment === Alignment.RIGHT ||
              bAlignment === Alignment.LEFT ||
              bAlignment === Alignment.RIGHT){
        throw new Error('Wrong alignment type specified.');
    }

    var bbounds = b.getBoundsGlobal();

    a.setPositionY(offsety || 0);

    var reference = 0;

    switch(bAlignment){
        case Alignment.TOP:
            reference = bbounds[1];
            break;
        case Alignment.CENTER:
            reference = (bbounds[1] + bbounds[3]) * 0.5;
            break;
        case Alignment.BOTTOM:
            reference = bbounds[3];
            break;
    }

    switch (aAlignment){
        case Alignment.TOP:
            reference += 0;
            break;
        case Alignment.CENTER:
            reference -= a.getHeight() * 0.5;
            break;
        case Alignment.BOTTOM:
            reference -= a.getHeight();
            break;
    }

    a.setPositionYAbsolute(reference);
}

function stackHorizontalTo(objs,aAlignment,bAlignment,offsetx){
    for(var i = 1, l = objs.length; i < l; ++i){
        horizontalTo(objs[i],objs[i-1],aAlignment,bAlignment,offsetx);
    }
}

function stackVerticalTo(objs,aAlignment,bAlignment,offsety){
    for(var i = 1, l = objs.length; i < l; ++i){
        verticalTo(objs[i],objs[i-1],aAlignment,bAlignment,offsety);
    }
}

module.exports = {
    TOP    : Alignment.TOP,
    BOTTOM : Alignment.BOTTOM,
    CENTER : Alignment.CENTER,
    LEFT   : Alignment.LEFT,
    RIGHT  : Alignment.RIGHT,

    horizontal : horizontalTo,
    vertical   : verticalTo,

    stackHorizontal : stackHorizontalTo,
    stackVertical   : stackVerticalTo
};
