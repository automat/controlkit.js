ControlKit.Options = function(parentNode)
{
    this._parenNode = parentNode;

    var node     = this._node = new ControlKit.Node(ControlKit.NodeType.DIV);
    var listNode = this._listNode = new ControlKit.Node(ControlKit.NodeType.LIST);

    node.setStyleClass(ControlKit.CSS.Options);
    node.addChild(listNode);

    this._selectedIndex = null;
    this._callbackOut = function(){};

    this._unfocusable = false;

    document.addEventListener(ControlKit.DocumentEventType.MOUSE_DOWN,this._onDocumentMouseDown.bind(this));
    document.addEventListener(ControlKit.DocumentEventType.MOUSE_UP,  this._onDocumentMouseUp.bind(this));

    this.clear();
};

ControlKit.Options.prototype =
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

    build : function(entries,selected,element,callbackSelect,callbackOut,paddingRight,areColors,colorMode)
    {
        this._clearList();

        this._parenNode.addChild(this.getNode());

        var rootNode = this._node,
            listNode = this._listNode;

        paddingRight = paddingRight || 0;

        var self = this;

        // build list
        var itemNode,entry;
        var i = -1;

        if(areColors)
        {
            colorMode = colorMode || ControlKit.ColorMode.HEX;

            listNode.setStyleClass(ControlKit.CSS.Color);

            var color,nodeColor;

            while(++i < entries.length)
            {
                entry    = entries[i];
                itemNode = listNode.addChild(new ControlKit.Node(ControlKit.NodeType.LIST_ITEM));
                color    = itemNode.addChild(new ControlKit.Node(ControlKit.NodeType.DIV));

                switch(colorMode)
                {
                    case ControlKit.ColorMode.HEX:   nodeColor = entry; break;
                    case ControlKit.ColorMode.RGB:   nodeColor = ControlKit.ColorUtil.RGB2HEX(  entry[0],entry[1],entry[2]); break;
                    case ControlKit.ColorMode.RGBfv: nodeColor = ControlKit.ColorUtil.RGBfv2HEX(entry[0],entry[1],entry[2]); break;
                    case ControlKit.ColorMode.HSV:   nodeColor = ControlKit.ColorUtil.HSV2RGB(  entry[0],entry[1],entry[2]); break;
                }

                color.getStyle().backgroundColor = nodeColor;
                color.getStyle().backgroundImage = 'linear-gradient( rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 100%)';
                color.setProperty('innerHTML',entry);

                if(entry == selected)itemNode.setStyleClass(ControlKit.CSS.OptionsSelected);

                itemNode.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,
                    function()
                    {
                        self._selectedIndex = Array.prototype.indexOf.call(this.parentNode.children,this);
                        callbackSelect();
                    });
            }

        }
        else
        {
            listNode.deleteStyleClass();

            while(++i < entries.length)
            {
                entry = entries[i];

                itemNode = listNode.addChild(new ControlKit.Node(ControlKit.NodeType.LIST_ITEM));
                itemNode.setProperty('innerHTML',entry);
                if(entry == selected)itemNode.setStyleClass(ControlKit.CSS.OptionsSelected);

                itemNode.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,
                    function()
                    {
                        self._selectedIndex = Array.prototype.indexOf.call(this.parentNode.children,this);
                        callbackSelect();
                    });
            }
        }

        //position, set width and enable

        var elementPos    = element.getPositionGlobal(),
            elementWidth  = element.getWidth() - paddingRight,
            elementHeight = element.getHeight();

        var listWidth    = listNode.getWidth(),
            listHeight   = listNode.getHeight(),
            strokeOffset = ControlKit.Metric.STROKE_SIZE * 2;

        var paddingOptions = ControlKit.Metric.PADDING_OPTIONS;

        var width   = (listWidth < elementWidth ? elementWidth : listWidth) -strokeOffset,
            posX    = elementPos[0],
            posY    = elementPos[1]+elementHeight-paddingOptions;

        var windowWidth  = window.innerWidth,
            windowHeight = window.innerHeight;

        var rootPosX = (posX + width)      > windowWidth  ? (posX - width + elementWidth - strokeOffset)    : posX,
            rootPosY = (posY + listHeight) > windowHeight ? (posY - listHeight * 0.5 - elementHeight * 0.5) : posY;

        listNode.setWidth(width);
        rootNode.setPositionGlobal(rootPosX,rootPosY);

        this._callbackOut = callbackOut;
        this._unfocusable = false;
    },

    _clearList : function()
    {
        this._listNode.removeAllChildren();
        this._listNode.deleteStyleProperty('width');
        this._selectedIndex  = null;
        this._build          = false;
    },

    clear : function()
    {
        this._clearList();
        this._callbackOut = function(){};
        this._parenNode.removeChild(this.getNode());

    },

    isBuild     : function(){return this._build;},
    getNode     : function(){return this._node; },
    getSelectedIndex : function(){return this._selectedIndex;}
};

ControlKit.Options.init        = function(parentNode){return ControlKit.Options._instance = new ControlKit.Options(parentNode);};
ControlKit.Options.getInstance = function(){return ControlKit.Options._instance;};