ControlKit.CKPicker = function()
{
    var node = this._rootNode = new ControlKit.CKNode(ControlKit.CKNodeType.DIV),
        head = new ControlKit.CKNode(ControlKit.CKNodeType.DIV),
        labl = new ControlKit.CKNode(ControlKit.CKNodeType.Label),
        wrap = new ControlKit.CKNode(ControlKit.CKNodeType.DIV);

        node.setStyleClass(ControlKit.CKCSS.Picker);
        head.setStyleClass(ControlKit.CKCSS.Head);
        wrap.setStyleClass(ControlKit.CKCSS.Wrap);

        var paletteWrap = new ControlKit.CKNode(ControlKit.CKNodeType.DIV);
        paletteWrap.setStyleClass(ControlKit.CKCSS.PalleteWrap);

    var paletteWrapInner = new ControlKit.CKNode(ControlKit.CKNodeType.DIV);
        paletteWrapInner.setStyleClass(ControlKit.CKCSS.PaletteWrapInner);

    var sliderWrapInner  = new ControlKit.CKNode(ControlKit.CKNodeType.DIV);
        sliderWrapInner.setStyleClass(ControlKit.CKCSS.PaletteWrapInner);


    var paletteCanvas = this._paletteCanvas = new ControlKit.CKCanvas(paletteWrapInner);
    paletteCanvas.setAntialias(false);
    paletteCanvas.setSize(154,154);


    var sliderCanvas  = this._sliderCanvas  = new ControlKit.CKCanvas(sliderWrapInner);
    sliderCanvas.setAntialias(false);
    sliderCanvas.setSize(24,154);



    head.setProperty('innerHTML','Color Picker');

    node.addChild(head);
    node.addChild(wrap);

    wrap.addChild(paletteWrap);
    paletteWrap.addChild(paletteWrapInner);
    paletteWrap.addChild(sliderWrapInner);

    this._drawPalette();
    this._drawSlider();



    //for testing
    node.setPositionGlobal(300,200);
}

ControlKit.CKPicker.prototype =
{
    getNode : function(){return this._rootNode;},

    _drawPalette : function()
    {
        var c = this._paletteCanvas;

        var width  = c.width,
            height = c.height;

        c.clear();
        c.noStroke();
        c.push();
        {
            c.translateHalfFloat();
            c.fill(255);
            c.rect(0,0,width,height);
        }
        c.pop();
    },

    _drawSlider : function()
    {
        var c = this._sliderCanvas;

        c.clear();
        c.noStroke();
        c.push();
        {
            c.translateHalfFloat();
            c.fill(255);
            //c.rect(0,0,width,height);
        }
        c.pop();
    }
};



ControlKit.CKPicker.init        = function(){ControlKit.CKPicker._instance = new ControlKit.CKPicker();};
ControlKit.CKPicker.getInstance = function(){return ControlKit.CKPicker._instance;};