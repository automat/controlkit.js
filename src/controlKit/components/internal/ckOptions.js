function CKOptions()
{
    var node     = this._rootNode = new CKNode(CKNodeType.DIV);
    var listNode = this._listNode = new CKNode(CKNodeType.LIST);

    node.setStyleClass(CKCSS.Options);
    node.addChild(listNode);

    this._selected = null;
    this._build    = false;

    this._callbackOut    = function(){};
    this._callbackSelect = function(){};



    var documentonmousedown = document.onmousedown || function(){};



}

CKOptions.prototype =
{

    build : function(entries,selected,element,callbackSelect,callbackOut)
    {
        this._listNode.removeAllChildren();

        this._selected    = null;
        this._build       = false;
        this._callbackOut = function(){};

        this._callbackSelect = callbackSelect;
        this._callbackOut    = callbackOut;


        var rootNode = this._rootNode,
            listNode = this._listNode;

        var entry,itemNode;


        var i = -1;
        while(++i<entries.length)
        {
            entry = entries[i];

            itemNode = listNode.addChild(new CKNode(CKNodeType.LIST_ITEM));
            itemNode.setProperty('innerHTML',entry);
            if(entry == selected)itemNode.setStyleClass(CKCSS.OptionsSelected);

            itemNode.setEventListener(CKNodeEvent.MOUSE_DOWN,this._callbackSelect);
        }


        var elementPos    = element.getPositionGlobal(),
            elementWidth  = element.getWidth(),
            elementHeight = element.getHeight();

        var listWidth  = listNode.getWidth(),
            listHeight = listNode.getHeight();

        rootNode.setWidth( listWidth < elementWidth ? elementWidth : listWidth);
        rootNode.setHeight(listHeight);
        rootNode.setPositionGlobal(elementPos[0],elementPos[1]+elementHeight-CKCSS.OptionsPadding);
        rootNode.setStyleProperty('visibility','visible');



        //this._build = true;






    },

    _getIndex : function(node){this._selected = this._rootNode.getChildIndex(node);},

    clear : function()
    {
        this._listNode.removeAllChildren();

        this._selected    = null;
        this._build       = false;
        this._callbackOut = function(){};

        var node = this._rootNode;

        node.setWidth(0);
        node.setHeight(0);
        node.setPositionGlobal(-1,-1);
        node.setStyleProperty('visibility','hidden');

    },

    isBuild     : function(){return this._build;},
    getNode     : function(){return this._rootNode; },
    getSelected : function(){return this._selected;}
};

CKOptions.init        = function(){CKOptions._instance = new CKOptions();};
CKOptions.getInstance = function(){return CKOptions._instance;};