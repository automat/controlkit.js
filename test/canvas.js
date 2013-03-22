//
//
//
//  Created by henryk Wollik on 30.10.12.
//
//


_InternalCanvasOptions = {};

_InternalCanvasOptions.DEFAULT_WIDTH  = 300;
_InternalCanvasOptions.DEFAULT_HEIGHT = 300;
_InternalCanvasOptions.EMPTY_STYLE = 'rgba(0,0,0,0)';

/*
 *
 *  Font
 *
 */

Canvas.FONT_STYLE_NON_ITALIC = '';
Canvas.FONT_STYLE_ITALIC = 'italic';
Canvas.FONT_WEIGHT_REGULAR = 'normal';
Canvas.FONT_WEIGHT_BOLD = 'bold';

/*
 *
 *  Text
 *
 */

Canvas.TEXT_BASELINE_BOTTOM = 'bottom';
Canvas.TEXT_BASELINE_TOP = 'top';
Canvas.TEXT_BASELINE_MIDDLE = 'middle';

Canvas.TEXT_ALIGN_START = 'start';
Canvas.TEXT_ALIGN_END = 'end';
Canvas.TEXT_ALIGN_LEFT = 'left';
Canvas.TEXT_ALIGN_RIGHT = 'right';
Canvas.TEXT_ALIGN_CENTER = 'center';

/*
 *
 *  Convenience wrapper for canvas
 *
 */

function Canvas(parentDomElementId)
{
    this.parent = document.getElementById(parentDomElementId);
    this._size = {width: _InternalCanvasOptions.DEFAULT_WIDTH ,
                  height:_InternalCanvasOptions.DEFAULT_HEIGHT};
    this._canvas = document.createElement('canvas');
    this._antialias    = true;
    this.setSize(_InternalCanvasOptions.DEFAULT_WIDTH,
                 _InternalCanvasOptions.DEFAULT_HEIGHT);
    this._canvas.style.position = 'absolute';
    this._canvas.style.left = '0px';
    this._canvas.style.top = '0px';
    this.parent.appendChild(this._canvas);
    this.context = this._canvas.getContext('2d');

    this._fontProperties = {style:'', weight:'bold', size:20, family:'Arial'};
    this._textProperties = {lineHeight:1};
    this._applyFontStyle();

    this._pixelPerfect = true;

}

Canvas.prototype.setPixelPerfect = function(bool)
{
    this._pixelPerfect = bool;
};

Canvas.prototype.setAntialias = function(bool)
{
    this._antialias = bool;

    this.setSize(this._size.width,this._size.height);
};


/**
 * Sets the font style
 *
 * @param {Object} style The style (reg...) of the font
 *
 */

Canvas.prototype.setFontStyle = function (style)
{
    this._fontProperties.style = style;
    this._applyFontStyle();
};

/**
 * Sets the font weight
 *
 * @param {Object} weight The weight (bold,normal) of the font
 *
 */


Canvas.prototype.setFontWeight = function (weight)
{
    this._fontProperties.weight = weight;
    this._applyFontStyle();
};

/**
 * Sets the font size
 *
 * @param {Number} size The size of the font
 *
 */

Canvas.prototype.setFontSize = function (size)
{
    this._fontProperties.size = size;
    this._applyFontStyle();
};

/**
 * Sets the font family
 *
 * @param {String} family The font family
 *
 */

Canvas.prototype.setFontFamily = function (family)
{
    this._fontProperties.family = family;



    this._applyFontStyle();
};

/**
 * Sets the font properties
 *
 * @param {Object} fontProperties The font properties in an object
 *
 */

Canvas.prototype.setFontProperties = function (fontProperties)
{
    for (var p in fontProperties)
    {
        this._fontProperties[p] = fontProperties[p];
    }

    this._applyFontStyle();
};

/**
 * Internal - Applies the font style
 */

Canvas.prototype._applyFontStyle = function ()
{
    this.context.font = this._fontProperties.weight + " " +
                        this._fontProperties.size + "px " +
                        this._fontProperties.family;
};



Canvas.prototype.setTextBaseLine = function (textBaseLine)
{
    this.context.textBaseline = textBaseLine;
};

Canvas.prototype.setTextAlign = function (textAlign)
{
    this.context.textAlign = textAlign;
};

Canvas.prototype.setTextLineHeight = function(lineHeight)
{
    this._textProperties.lineHeight = lineHeight;

};

Canvas.prototype.text = function (string, x, y)
{
    this.context.fillText(string, Math.round(x) - 0.5, Math.round(y) - 0.5);
};

Canvas.prototype.textWrap = function(string,x,y,width,height)
{
    var ctx = this.context;
    var lines   = this._wrapText(string,width - ctx.measureText('A').width);
    var size    = this._fontProperties.size;
    var lHeight = this._textProperties.lineHeight;
    var cHeight = 0;
    var rHeight = 0;
    lines.forEach(function(line,i){cHeight=i*size*lHeight;rHeight+=cHeight;ctx.fillText(line,x,y+cHeight);});

    return rHeight*0.5;
};

Canvas.prototype.textWrapWithBackgroundColor = function(string,x,y,width,height,textColor,backColor)
{
    var ctx = this.context;
    var lines   = this._wrapText(string,width - ctx.measureText('A').width);
    var size    = this._fontProperties.size;
    var lHeight = this._textProperties.lineHeight;
    var cHeight = 0;
    var rHeight = 0;
    lines.forEach(function (line, i)
    {
        ctx.fillStyle = backColor;
        cHeight = i * size * lHeight;
        rHeight += cHeight;
        ctx.fillRect(x, y, ctx.measureText(line).width, cHeight);
        ctx.fillStyle = textColor;
        ctx.fillText(line, x, y + cHeight);
    });

    return rHeight*0.5;
};


Canvas.prototype.getTextWidth = function (string)
{
    var metrics = this.context.measureText(string);
    return metrics.width;
};

Canvas.prototype.getTextHeight = function ()
{
    return this._fontProperties.size;
};

Canvas.prototype.getTextWidth = function (string)
{
    return this.context.measureText(string).width;
};

Canvas.prototype._wrapText = function(text, maxWidth) {

    var ctx = this.context;

    var words = text.split(' '),
        lines = [],
        line = "";
    if (ctx.measureText(text).width < maxWidth) {
        return [text];
    }
    while (words.length > 0) {
        while (ctx.measureText(words[0]).width >= maxWidth) {
            var tmp = words[0];
            words[0] = tmp.slice(0, -1);
            if (words.length > 1) {
                words[1] = tmp.slice(-1) + words[1];
            } else {
                words.push(tmp.slice(-1));
            }
        }
        if (ctx.measureText(line + words[0]).width < maxWidth) {
            line += words.shift() + " ";
        } else {
            lines.push(line);
            line = "";
        }
        if (words.length === 0) {
            lines.push(line);
        }
    }
    return lines;
};



Canvas.prototype.getSize = function ()
{
    return {width:this._size.width, height:this._size.height};
};

/**
   * Resize the canvas to given width and height
   *
   * @param {Number} width  The width
   * @param {Number} height The height
   *
   */

Canvas.prototype.setSize = function (width, height)
{
    this._size.width = width;
    this._size.height = height;

    this._canvas.style.width = this._size.width + 'px';
    this._canvas.style.height = this._size.height + 'px';

    var styleWidth  = parseInt(this._canvas.style.width);
    var styleHeight = parseInt(this._canvas.style.height);

    this._canvas.width  = styleWidth;
    this._canvas.height = styleHeight;

    if(this._antialias)
    {
        this._canvas.width  *= 2;
        this._canvas.height *= 2;

        this._canvas.getContext('2d').scale(2, 2);
    }

    this.width = this._size.width;
    this.height = this._size.height;
};

/**
 * Get the canvas 2d context
 *
 * @returns {Object} The context
 *
 */

Canvas.prototype.getContext = function ()
{
    return this.context;
};

Canvas.prototype.background = function()
{
    this.context.fillStyle = color.apply(this,arguments);
    this.noStroke();
    this.rect(0,0,this.width,this.height);

    this.applyFill();
};

/**
 * Draws a line between two points
 *
 * @param {Number} x0 X value of point 1
 * @param {Number} y0 y value of point 1
 * @param {Number} x1 X value of point 2
 * @param {Number} y1 y value of point 2
 *
 */

Canvas.prototype.line = function (x0, y0, x1, y1)
{
    var ctx = this.context;

    ctx.moveTo(Math.round(x0), Math.round(y0));
    ctx.lineTo(Math.round(x1), Math.round(y1));
    this.applyStroke();

};

/**
 * Draws a line between points
 *
 * @param {Array} array The collection of points in format [[x,y],...]
 *
 */

Canvas.prototype.lineArray = function (array)
{
    var ctx = this.context;
    var i = 0;

    ctx.beginPath();
    ctx.moveTo(array[0][0], array[0][1]);
    while (++i < array.length)
    {
        ctx.lineTo(array[i][0], array[i][1]);
    }

    this.applyStroke();
};

/**
 * Draws a polygon from points
 *
 * @param {Array} array The collection of points in format [[x,y],...]
 *
 */

Canvas.prototype.polygon = function (array)
{
    var ctx = this.context;
    var i = 0;

    ctx.moveTo(array[0][0], array[0][1]);
    while (++i < array.length)
    {
        ctx.lineTo(array[i][0], array[i][1]);
    }
    ctx.moveTo(array[array.length - 1][0], array[array.length - 1][1]);

    this.applyStroke();
    this.applyFill();
};

/**
 * Draws a circle
 *
 * @param {Number} x X value of the center point
 * @param {Number} y Y value of the center point
 * @param {Number} radius Radius of the circle
 *
 */

Canvas.prototype.circle = function (x, y, radius)
{
    var ctx = this.context;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2, true);
    ctx.closePath();

    this.applyStroke();
    this.applyFill();
};

/**
 * Draws a Rectangle
 *
 * @param {Number} x X value of the upper left point
 * @param {Number} y Y value of the upper left point
 * @param {Number} width  Width  of the rectangle
 * @param {Number} height Height of the rectangle
 *
 */


Canvas.prototype.rect = function (x, y, width, height)
{
    var ctx = this.context;

    ctx.fillRect(Math.round(x) - 0.5, Math.round(y) - 0.5, width, height);
    ctx.strokeRect(Math.round(x), Math.round(y), width, height);
};

Canvas.prototype.point = function (x, y)
{
    var ctx = this.context;

    if(this._pixelPerfect)
    {
        ctx.fillRect(Math.round(x) - 0.5, Math.round(y) - 0.5, 1, 1);
    }
    else if(!this._pixelPerfect)
    {
        ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
    }


    //ctx.strokeRect(Math.round(x), Math.round(y), 1, 1);
};

/*
 *
 *  Context Tools
 *
 */

Canvas.POINT_HALF_FLOAT = {x:0.5, y:0.5};

/**
 * Pushes a new state
 */

Canvas.prototype.push = function ()
{
    this.context.save();
};

/**
 * Pops a new states, restores the old state
 *
 */

Canvas.prototype.pop = function ()
{
    this.context.restore();
};

Canvas.prototype.translate = function (x, y)
{
    this.context.translate(x, y);
};

Canvas.prototype.rotate = function(angle)
{
    this.context.rotate(angle);
};

Canvas.prototype.translateHalfFloat = function()
{
    this.context.translate(Canvas.POINT_HALF_FLOAT.x,Canvas.POINT_HALF_FLOAT.y);
};

Canvas.prototype.scale = function (s)
{
    this.context.scale(s);
};

Canvas.prototype.applyFill = function ()
{
    this.context.fill();
};

Canvas.prototype.fill = function ()
{
    this.context.fillStyle = color.apply(this,arguments) || this.context.fillStyle;
};

Canvas.prototype.noFill = function ()
{
    this.context.fillStyle = _InternalCanvasOptions.EMPTY_STYLE;
};

Canvas.prototype.applyStroke = function ()
{
    this.context.stroke();
};

/**
 * Draws a Rectangle
 *
 * @param {Number} strokeStyle X value of the upper left point
 *
 */

Canvas.prototype.stroke = function (strokeStyle)
{
    this.context.strokeStyle = color.apply(this,arguments) || this.context.strokeStyle;
};

/**
 * Sets stroke to empty
 */

Canvas.prototype.noStroke = function ()
{
    this.context.strokeStyle = _InternalCanvasOptions.EMPTY_STYLE ;
};

/**
 * Opens the image data in a new window
 *
 */

Canvas.prototype.saveToPNG = function()
{
    var canvas =

    window.open(this._canvas.toDataURL('image/png'));
};

function color()
{
    var r, g, b, a = 1.0;
    var s = 'rgba';

    switch (arguments.length)
    {
        case 1:
            r = g = b = arguments[0];
            break;
        case 2:
            r = g = b = arguments[0];
            a = arguments[1];
            break;
        case 3:
            r = arguments[0];
            g = arguments[1];
            b = arguments[2];
            break;
        case 4:
            r = arguments[0];
            g = arguments[1];
            b = arguments[2];
            a = arguments[3];
            break;
    }

    return s + '(' + r + ',' + g + ',' + b + ',' + a + ')';
}
