
function ControlGroup(params)
{

    var manager = CKManager.getInstance();

    /*---------------------------------------------------------------------------------*/

    params            = params || {};
    params.valign     = params.valign     || CKLayout.ALIGN_TOP;
    params.align      = params.align      || CKLayout.ALIGN_LEFT;
    params.position   = params.position   || [20,20];
    params.width      = params.width      ||  300;
    params.height     = params.height     ||  manager.getWindow().height - params.position[1];
    params.ratio      = params.ratio      ||  40;
    params.label      = params.label      || 'Controls';

    /*---------------------------------------------------------------------------------*/

    //TODO:FIXME CLEANMEUP
    //cache
    var attributes = this._attributes = {
        valign   : params.valign,
        align    : params.align,
        position : params.position,
        width    : params.width,
        height   : params.height,
        ratio    : params.ratio,
        label    : params.label
    };

    /*---------------------------------------------------------------------------------*/


    this._maxHeight = params.maxHeight || window.innerHeight;

    var rootNode = this._node = new CKNode(CKNodeType.DIV),
        headNode = new CKNode(CKNodeType.DIV),
        lablNode = new CKNode(CKNodeType.SPAN),
        wrapNode = new CKNode(CKNodeType.DIV),
        listNode = this._listNode = new CKNode(CKNodeType.LIST);

    rootNode.setStyleClass(CKCSS.Kit);
    headNode.setStyleClass(CKCSS.Head);
    lablNode.setStyleClass(CKCSS.Label);
    wrapNode.setStyleClass(CKCSS.Wrap);

    /*---------------------------------------------------------------------------------*/

    manager.setKitPosition(this);
    rootNode.setWidth(attributes.width);
    lablNode.setProperty('innerHTML',attributes.label);

    /*---------------------------------------------------------------------------------*/

    headNode.setEventListener(CKNodeEvent.MOUSE_DOWN,function(){});

    /*---------------------------------------------------------------------------------*/

    this._blocks = [];

    /*---------------------------------------------------------------------------------*/

    headNode.addChild(lablNode);
    wrapNode.addChild(listNode);
    rootNode.addChild(headNode);
    rootNode.addChild(wrapNode);

    manager.addKit(this);
}

/*---------------------------------------------------------------------------------*/

ControlGroup.prototype =
{
    addBlock : function(label,params)
    {
        var block = new CKBlock(this,label,params);
        this._blocks.push(block);
        return block;
    },

    getBlocks     : function(){return this._blocks;},
    forceUpdate   : function(){CKManager.getInstance().forceKitsUpdate();},
    getAttributes : function(){return this._attributes;},
    getNode       : function(){return this._node;},
    getList       : function(){return this._listNode;}


};




