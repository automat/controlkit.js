function CKOptions()
{
    var node     = this._rootNode = new CKNode(CKNodeType.DIV);
    var listNode = this._listNode = new CKNode(CKNodeType.LIST);

    node.setStyleClass(CKCSS.Options);
    node.addChild(listNode);

    this._selectedIndex = null;
    this._selectHover   = false;
    this._callbackOut = function(){};

    this._unfocusable = false;

    document.addEventListener(CKDocumentEventType.MOUSE_DOWN,this._onDocumentMouseDown.bind(this));
    document.addEventListener(CKDocumentEventType.MOUSE_UP,  this._onDocumentMouseUp.bind(this));
}

CKOptions.prototype =
{

    _onDocumentMouseDown : function()
    {
        if(!this._unfocusable)return;
        this._callbackOut();
    },

    _onDocumentMouseUp : function()
    {
        this._unfocusable = true;
    },

    build : function(entries,selected,element,callbackSelect,callbackOut)
    {
        this._clearList();

        var rootNode = this._rootNode,
            listNode = this._listNode;

        var self = this;

        // build list
        var itemNode,entry;
        var i = -1;
        while(++i < entries.length)
        {
            entry = entries[i];

            itemNode = listNode.addChild(new CKNode(CKNodeType.LIST_ITEM));
            itemNode.setProperty('innerHTML',entry);
            if(entry == selected)itemNode.setStyleClass(CKCSS.OptionsSelected);

            itemNode.setEventListener(CKNodeEventType.MOUSE_DOWN,
                                      function()
                                      {
                                          self._selectedIndex = Array.prototype.indexOf.call(this.parentNode.children,this);
                                          callbackSelect();

                                      });

        }

        //position, set width and show

        var elementPos    = element.getPositionGlobal(),
            elementWidth  = element.getWidth(),
            elementHeight = element.getHeight();

        var listWidth  = listNode.getWidth(),
            listHeight = listNode.getHeight();

        rootNode.setWidth( listWidth < elementWidth ? elementWidth : listWidth);
        rootNode.setHeight(listHeight);
        rootNode.setPositionGlobal(elementPos[0],elementPos[1]+elementHeight-CKCSS.OptionsPadding);
        rootNode.setStyleProperty('visibility','visible');


        this._callbackOut = callbackOut;
        this._unfocusable = false;
    },


    _clearList : function()
    {
        this._listNode.removeAllChildren();
        this._selectedIndex  = null;
        this._build          = false;

        this._rootNode.setWidth(0);
        this._rootNode.setHeight(0);
    },

    clear : function()
    {
        this._clearList();


        this._callbackOut = function(){};


        var node = this._rootNode;
        node.setPositionGlobal(-1,-1);
        node.setStyleProperty('visibility','hidden');

    },

    isBuild     : function(){return this._build;},
    getNode     : function(){return this._rootNode; },
    getSelectedIndex : function(){return this._selectedIndex;}
};

CKOptions.init        = function(){CKOptions._instance = new CKOptions();};
CKOptions.getInstance = function(){return CKOptions._instance;};