ControlKit.Picker = function()
{
    var node = this._rootNode = new ControlKit.Node(ControlKit.NodeType.DIV),
        head = new ControlKit.Node(ControlKit.NodeType.DIV),
        labl = new ControlKit.Node(ControlKit.NodeType.Label),
        wrap = new ControlKit.Node(ControlKit.NodeType.DIV);

        node.setStyleClass(ControlKit.CSS.Picker);
        head.setStyleClass(ControlKit.CSS.Head);
        wrap.setStyleClass(ControlKit.CSS.Wrap);

        var paletteWrap = new ControlKit.Node(ControlKit.NodeType.DIV);
        paletteWrap.setStyleClass(ControlKit.CSS.PalleteWrap);

    var paletteWrapInner = new ControlKit.Node(ControlKit.NodeType.DIV);
        paletteWrapInner.setStyleClass(ControlKit.CSS.PaletteWrapInner);

    var sliderWrapInner  = new ControlKit.Node(ControlKit.NodeType.DIV);
        sliderWrapInner.setStyleClass(ControlKit.CSS.PaletteWrapInner);


    var paletteCanvas = this._paletteCanvas = new ControlKit.Canvas(paletteWrapInner);
    paletteCanvas.setAntialias(false);
    paletteCanvas.setSize(154,154);


    var sliderCanvas  = this._sliderCanvas  = new ControlKit.Canvas(sliderWrapInner);
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
};

ControlKit.Picker.prototype =
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



ControlKit.Picker.init        = function(){ControlKit.Picker._instance = new ControlKit.Picker();};
ControlKit.Picker.getInstance = function(){return ControlKit.Picker._instance;};