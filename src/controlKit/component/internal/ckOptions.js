ControlKit.CKOptions = function()
{
    var node     = this._rootNode = new ControlKit.CKNode(ControlKit.CKNodeType.DIV);
    var listNode = this._listNode = new ControlKit.CKNode(ControlKit.CKNodeType.LIST);

    node.setStyleClass(ControlKit.CKCSS.Options);
    node.addChild(listNode);

    this._selectedIndex = null;
    this._selectHover   = false;
    this._callbackOut = function(){};

    this._unfocusable = false;

    document.addEventListener(ControlKit.CKDocumentEventType.MOUSE_DOWN,this._onDocumentMouseDown.bind(this));
    document.addEventListener(ControlKit.CKDocumentEventType.MOUSE_UP,  this._onDocumentMouseUp.bind(this));
};

ControlKit.CKOptions.prototype =
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

    build : function(entries,selected,element,callbackSelect,callbackOut,paddingRight)
    {
        this._clearList();

        var rootNode = this._rootNode,
            listNode = this._listNode;

        paddingRight = paddingRight || 0;

        var self = this;

        // build list
        var itemNode,entry;
        var i = -1;
        while(++i < entries.length)
        {
            entry = entries[i];

            itemNode = listNode.addChild(new ControlKit.CKNode(ControlKit.CKNodeType.LIST_ITEM));
            itemNode.setProperty('innerHTML',entry);
            if(entry == selected)itemNode.setStyleClass(ControlKit.CKCSS.OptionsSelected);

            itemNode.setEventListener(ControlKit.CKNodeEventType.MOUSE_DOWN,
                function()
                {
                    self._selectedIndex = Array.prototype.indexOf.call(this.parentNode.children,this);
                    callbackSelect();

                });

        }

        //position, set width and show

        var elementPos    = element.getPositionGlobal(),
            elementWidth  = element.getWidth() - paddingRight,
            elementHeight = element.getHeight();

        var listWidth  = listNode.getWidth(),
            listHeight = listNode.getHeight();

        rootNode.setWidth( listWidth < elementWidth ? elementWidth : listWidth);
        rootNode.setHeight(listHeight);
        rootNode.setPositionGlobal(elementPos[0],elementPos[1]+elementHeight-ControlKit.CKCSS.OptionsPadding);
        rootNode.setStyleProperty('visibility','visible');


        this._callbackOut = callbackOut;
        this._unfocusable = false;
    },

    _entriesAreColors : function(entries)
    {
        return false;
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

ControlKit.CKOptions.init        = function(){ControlKit.CKOptions._instance = new ControlKit.CKOptions();};
ControlKit.CKOptions.getInstance = function(){return ControlKit.CKOptions._instance;};