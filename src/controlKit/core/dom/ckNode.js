ControlKit.Node = function()
{
    this._element = null;

    if(arguments.length == 1)
    {
        var arg  = arguments[0];

        if(arg != ControlKit.NodeType.INPUT_TEXT   &&
           arg != ControlKit.NodeType.INPUT_BUTTON &&
           arg != ControlKit.NodeType.INPUT_SELECT &&
           arg != ControlKit.NodeType.INPUT_CHECKBOX)
        {
            this._element = document.createElement(arg);
        }
        else
        {
            this._element = document.createElement('input');
            this._element.type = arg;
        }
    }
};

ControlKit.Node.prototype =
{
    addChild   : function(node)
    {
        this._element.appendChild(node.getElement());
        return node;
    },

    addChildAt : function(node,index)
    {
        this._element.insertBefore(node.getElement(),this._element.children[index]);
        return node;
    },

    removeChild : function(node)
    {
        if(!this.contains(node))return null;
        this._element.removeChild(node.getElement());
        return node;
    },

    removeChildAt : function(node,index)
    {
        if(!this.contains(node))return null;
        this._element.removeChild(node.getElement());
        return node;
    },

    removeAllChildren : function()
    {
        var element = this._element;
        while(element.hasChildNodes())element.removeChild(element.lastChild);
        return this;
    },

    setWidth  : function(value){this._element.style.width = value + 'px'; return this;},
    getWidth  : function()     {return this._element.offsetWidth;},

    setHeight : function(value){this._element.style.height = value + 'px'; return this;},
    getHeight : function()     {return this._element.offsetHeight;},

    setPosition  : function(x,y){ return this.setPosition(x).setPosition(y);},
    setPositionX : function(x)  {this._element.style.marginLeft = x + 'px';return this;},
    setPositionY : function(y)  {this._element.style.marinTop   = y + 'px';return this;},

    setPositionGlobal  : function(x,y){return this.setPositionGlobalX(x).setPositionGlobalY(y);},
    setPositionGlobalX : function(x)  {this._element.style.left = x + 'px';return this;},
    setPositionGlobalY : function(y)  {this._element.style.top  = y + 'px';return this;},

    getPosition  : function(){return [this.getPositionX(),this.getPositionY()];},
    getPositionX : function(){return this._element.offsetLeft;},
    getPositionY : function(){return this._element.offsetTop;},

    getPositionGlobal : function()
    {
        var offset  = [0,0],
            element = this._element;

        while(element)
        {
            offset[0] += element.offsetLeft;
            offset[1] += element.offsetTop;
            element    = element.offsetParent;
        }

        return offset;
    },

    getPositionGlobalX : function()
    {
        var offset  = 0,
            element = this._element;

        while(element)
        {
            offset += element.offsetLeft;
            element = element.offsetParent;
        }



        return offset;
    },

    getPositionGlobalY : function()
    {
        var offset  = 0,
            element = this._element;

        while(element)
        {
            offset += element.offsetTop;
            element = element.offsetParent;
        }

        return offset;
    },



    setEventListener : function(event,func){this._element[event] = func; return this;},

    setStyleClass      : function(style)         {this._element.className = style; return this;},
    setStyleProperty   : function(property,value){this._element.style[property] = value; return this;},
    getStyleProperty   : function(property)      {return this._element.style[property];},
    setStyleProperties : function(properties)    {for(var p in properties)this._element.style[p] = properties[p];return this;},


    getChildAt     : function(index) {return new ControlKit.Node().setElement(this._element.children[index]);},
    getChildIndex  : function(node)  {return this._indexOf(this._element,node.getElement());},
    getNumChildren : function()      {return this._element.children.length;},
    getFirstChild  : function()      {return new ControlKit.Node().setElement(this._element.firstChild);},
    getLastChild   : function()      {return new ControlKit.Node().setElement(this._element.lastChild);},
    hasChildren    : function()      {return this._element.children.length != 0;},
    contains       : function(node)  {return this._indexOf(this._element,node.getElement()) != -1;},

    _indexOf       : function(parentElement,element){return Array.prototype.indexOf.call(parentElement.children,element);},

    setProperty   : function(property, value){this._element[property] = value;return this;},
    setProperties : function(properties)     {for(var p in properties)this._element[p] = properties[p];return this;},
    getProperty   : function(property)       {return this._element[property];},


    setElement : function(element){this._element = element;return this;},
    getElement : function()       { return this._element;},

    getStyle   : function()       {return this._element.style;},

    getParent  : function(){ return new ControlKit.Node().setElement(this._element.parentNode); }
};

ControlKit.Node.getNodeByElement = function(element){return new ControlKit.Node().setElement(element);};
ControlKit.Node.getNodeById      = function(id)     {return new ControlKit.Node().setElement(document.getElementById(id));};

