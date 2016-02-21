var AbstractRenderer = require('../AbstractRenderer');

var Stage         = require('../Stage');
var DisplayObject = require('../DisplayNode');

function CanvasRenderer(canvas){
    AbstractRenderer.call(this);

    this._canvas = canvas;
    this._ctx    = this._canvas.getContext('2d');
    this._stage  = new Stage([this._canvas.width,this._canvas.height]);

    this._redrawBounds = [];
    this._layoutValid  = true;
}

CanvasRenderer.prototype = Object.create(AbstractRenderer.prototype);
CanvasRenderer.prototype.constructor = CanvasRenderer;


CanvasRenderer.prototype.createDisplayObject = function(){
    return new DisplayObject();
};

CanvasRenderer.prototype.updateLayout = function(){};


CanvasRenderer.prototype.drawBounds = function(bounds){
    var ctx = this._ctx;

    ctx.beginPath();
    ctx.moveTo(bounds[0],bounds[1]);
    ctx.lineTo(bounds[2],bounds[1]);
    ctx.lineTo(bounds[2],bounds[3]);
    ctx.lineTo(bounds[0],bounds[3]);
    ctx.closePath();
};

CanvasRenderer.prototype.drawRoundedRect = function(x,y,width,height,radii){

    //path.moveTo(x + radius, y);
    //path.lineTo(x + width - radius, y);
    //path.quadraticCurveTo(x + width, y, x + width, y + radius);
    //path.lineTo(x + width, y + height - radius);
    //path.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    //path.lineTo(x + radius, y + height);
    //path.quadraticCurveTo(x, y + height, x, y + height - radius);
    //path.lineTo(x, y + radius);
    //path.quadraticCurveTo(x, y, x + radius, y);
};

CanvasRenderer.prototype.drawRectStrokedFromBounds = function(bounds){
    var x = bounds[0];
    var y = bounds[1];
    var width  = bounds[2] - x;
    var height = bounds[3] - y;

    this.drawRectStroked(x,y,width,height);
};

CanvasRenderer.prototype.drawRectStroked = function(x,y,width,height){
    var ctx = this._ctx;
    var strokeWidth = ctx.lineWidth;

    var x0 = x + strokeWidth;
    var y0 = y + strokeWidth;
    var x1 = x + width - strokeWidth;
    var y1 = y + height - strokeWidth;

    ctx.beginPath();
    ctx.moveTo(x0,y0);
    ctx.lineTo(x1,y0);
    ctx.lineTo(x1,y1);
    ctx.lineTo(x0,y1);
    ctx.closePath();

    ctx.stroke();
};

CanvasRenderer.prototype.debugObject = function(obj){
    var ctx = this._ctx;

    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth   = 2;
    this.drawBounds(obj.getBoundsGlobal());
    ctx.stroke();

    ctx.fillStyle = '#0000ff';
    ctx.fillRect(obj.getPositionXAbsolute()-2,obj.getPositionYAbsolute()-2,4,4);
};


CanvasRenderer.prototype.drawObject = function(obj){
    var ctx   = this._ctx;
    var style = obj.getStyle();

    var styleOverflow = style.overflow;
    var masksChildren = false;

    ctx.save();

        if(styleOverflow){
            switch (styleOverflow){
                case 'visible' :
                    break;

                case 'hidden' :
                    masksChildren = true;
                    this.drawBounds(obj.getBoundsGlobal());
                    ctx.clip();
                    break;

                case 'auto' :
                    this.drawBounds(obj.getBoundsGlobal());
                    ctx.clip();
                    masksChildren = true;
                    break;
            }
        }

        this.debugObject(obj);
        for(var i = 0, l = obj.getNumChildren(); i < l; ++i){
            this.drawObject(obj.getChildAt(i));
        }

    ctx.restore();
};

CanvasRenderer.prototype.draw = function(){
    var stage = this._stage;
    for(var i = 0, l = stage.getNumChildren(); i < l; ++i){
        this.drawObject(stage.getChildAt(i));
    }
};

CanvasRenderer.prototype.onResize = function(e){
    this._stage.handleResize(e);
};

module.exports = CanvasRenderer;