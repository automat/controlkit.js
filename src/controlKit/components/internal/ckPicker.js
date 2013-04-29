function CKPicker()
{
    var node = this._rootNode = new CKNode(CKNodeType.DIV),
        head = new CKNode(CKNodeType.DIV),
        labl = new CKNode(CKNodeType.Label),
        wrap = new CKNode(CKNodeType.DIV);

        node.setStyleClass(CKCSS.Picker);
        head.setStyleClass(CKCSS.Head);
        wrap.setStyleClass(CKCSS.Wrap);

        var paletteWrap = new CKNode(CKNodeType.DIV);
        paletteWrap.setStyleClass(CKCSS.PalleteWrap);

    var paletteWrapInner = new CKNode(CKNodeType.DIV);
        paletteWrapInner.setStyleClass(CKCSS.PaletteWrapInner);

    var sliderWrapInner  = new CKNode(CKNodeType.DIV);
        sliderWrapInner.setStyleClass(CKCSS.PaletteWrapInner);


    var paletteCanvas = this._paletteCanvas = new CKCanvas(paletteWrapInner);
    paletteCanvas.setAntialias(false);
    paletteCanvas.setSize(154,154);


    var sliderCanvas  = this._sliderCanvas  = new CKCanvas(sliderWrapInner);
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

CKPicker.prototype =
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



CKPicker.init        = function(){CKPicker._instance = new CKPicker();};
CKPicker.getInstance = function(){return CKPicker._instance;};