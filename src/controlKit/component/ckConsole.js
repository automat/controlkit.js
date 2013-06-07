//TODO: fix
ControlKit.Console = function(parent,params)
{
    ControlKit.Component.apply(this,[parent,'none']);

    /*---------------------------------------------------------------------------------*/

    var textArea = this._textArea = new ControlKit.Node(ControlKit.NodeType.TEXTAREA),
        wrapNode = this._wrapNode,
        rootNode = this._node;

    textArea.setProperty('readOnly',true);
    wrapNode.addChild(textArea);


    if(params.height)
    {
        if(params.height != 'auto')
        {
            var textAreaWrap = new ControlKit.Node(ControlKit.NodeType.DIV);
            textAreaWrap.setStyleClass(ControlKit.CSS.TextAreaWrap);
            wrapNode.addChild(textAreaWrap);
            textAreaWrap.addChild(textArea);

            var height  = this._height = params.height,
                padding = 6;

            textArea.setHeight(Math.max(height  ,ControlKit.Constant.MIN_HEIGHT));
            wrapNode.setHeight(textArea.getHeight() +6 );
            rootNode.setHeight(wrapNode.getHeight() +4);

            this._scrollbar = new ControlKit.ScrollBar(textAreaWrap,textArea,height);
        }

        //TODO: Add auto height
    }

    if(params.wrap)textArea.setStyleProperty('white-space','pre-wrap');

    this._string = '';
};

ControlKit.Console.prototype = Object.create(ControlKit.Component.prototype);


ControlKit.Console.log = function(arg,params)
{

};