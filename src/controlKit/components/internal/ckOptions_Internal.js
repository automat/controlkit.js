function CKOptions_Internal()
{
    var node     = this._node     = new CKNode(CKNodeType.DIV);
    var listNode = this._listNode = new CKNode(CKNodeType.LIST);
        listNode.setStyleClass(CKCSS.Options);

    this._hover    = false;
    this._selected = null;
    this._build    = false;

    this._callbackOut   = null;
    this._callbackSelect = null;

    node.setEventListener(CKNodeEvent.MOUSE_OVER,function(){this._hover = true}.bind(this));
    node.setEventListener(CKNodeEvent.MOUSE_OUT, function(){this._hover = false}.bind(this));

    this._doconmousedownAdded = false;
}

CKOptions_Internal.prototype =
{
    build : function(entries,selected,element,callbackSelect,callbackOut)
    {
        this.clear();

        var node = this._node,
            entryNode;

        var getIndex = this._getIndex,
            hide     = this._hide;

        var cSelect = this._callbackSelect = callbackSelect,
            cOut    = this._callbackOut    = callbackOut;

        var i = -1;
        while(++i < entries.length)
        {
            entryNode = node.addChild(new CKNode(CKNodeType.LIST_ITEM));
            entryNode.setProperty('innerHTML',entries[i]);

            if(entryNode.getProperty('innerHTML') == selected)
            {
                entryNode.setStyleClass(CKCSS.OptionsSelected);
            }

            entryNode.setEventListener(CKNodeEvent.MOUSE_DOWN,function(){getIndex(this);hide();cSelect();});
        }

        var elementPos    = element.getPositionGlobal(),
            elemenWidth   = element.getWidth(),
            elementHeight = element.getHeight();

        var nodeWidth  = node.getWidth(),
            nodeHeight = node.getHeight();

        node.setWidth( nodeWidth < elemenWidth ? elemenWidth : nodeWidth);
        node.setHeight(nodeHeight);
        node.setProperty('visibility','visible');
        node.setPosition(elementPos[0],elementPos[1]);

        this._build = true;

        if(!this._doconmousedownAdded)
        {
            var doconmousedown = document.onmousedown || function(){};

            document.onmousedown = function()
            {
                doconmousedown();
                if(!this._hover)this._hide();
                this._callbackOut();

            }.bind(this);

            this._doconmousedownAdded = true;
        }
    },

    _getIndex : function(node){this._selected = this._node.getChildIndex(node);},

    clear : function()
    {
        this._listNode.removeAllChildren();
        this._selected = null;
        this._build    = false;

    },

    _hide : function()
    {
        this._clear();
        this._node.setProperty('visibility','hidden');
    },

    isBuild     : function(){return this._build;},
    getNode     : function(){return this._node; },
    getSelected : function(){return this._selected;}
};

CKOptions_Internal.init = function(parentNode){if(!CKOptions_Internal._instance)CKOptions_Internal._instance = new CKOptions_Internal();};
CKOptions_Internal.getInstance = function(){return CKOptions_Internal._instance;};