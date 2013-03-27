

function CKNode(type)
{
    this._type = type;

    switch (this._type)
    {
        case CKNode.Type.DIV :
            this._element = document.createElement('div');
            break;

        case CKNode.Type.INPUT_TEXT :
            this._element = document.createElement('input');
            this._element.type = 'text';
            break;

        case CKNode.Type.INPUT_BUTTON :
            this._element = document.createElement('input');
            this._element.type = 'button';
            break;

        case CKNode.Type.INPUT_SELECT :
            this._element = document.createElement('select');
            break;

        case CKNode.Type.INPUT_CHECKBOX :
            this._element = document.createElement('input');
            this._element.type = 'checkbox';
            break;

        case CKNode.Type.OPTION :
            this._element = document.createElement('option');
            break;

        case CKNode.Type.LIST :
            this._element = document.createElement('ul');
            break;

        case CKNode.Type.LIST_ITEM :
            this._element = document.createElement('li');
            break;
    }


    this._parent   = null;
    this._children = [];
}

CKNode.Type =
{
    DIV            : 0,
    INPUT_TEXT     : 1,
    INPUT_BUTTON   : 2,
    INPUT_SELECT   : 3,
    INPUT_CHECKBOX : 4,
    OPTION         : 5,
    LIST           : 6,
    LIST_ITEM      : 7
};


CKNode.Event =
{
    MOUSE_DOWN : 'onmousedown',
    MOUSE_UP   : 'onmouseup',
    MOUSE_MOVE : 'onmousemove',
    MOUSE_OUT  : 'onmouseout',
    KEY_DOWN   : 'onkeydown',
    KEY_UP     : 'onkeyup',
    CHANGE     : 'onchange',
    FINISH     : 'onfinish',
    ON_CLICK   : 'onclick'
};



CKNode.prototype =
{
    addChild   : function(node)
    {
        node._parent = this;
        this._element.appendChild(node.getElement());
        this._children.push(node);
        return node;
    },

    addChildAt : function(node,index)
    {
        node._parent = this;
        this._element.insertBefore(node.getElement(),this._element.children[index]);
        this._children.splice(index,0,node);
        return node;
    },

    removeChild : function(node)
    {
        if(!this.contains(node))return null;

        node._parent = null;
        this._element.removeChild(node.getElement());
        this._children.splice(this._children.indexOf(node),1);
        return node;
    },

    removeChildAt : function(node,index)
    {
        if(!this.contains(node))return null;

        node._parent = null;
        this._element.removeChild(node.getElement());
        this._children.splice(index,1);
        return node;
    },

    removeAllChildren : function()
    {
        this._children = [];
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



    setListener : function(type,func){this._element[type] = func; return this;},

    setStyleClass      : function(style)         {this._element.className = style; return this;},
    setStyleProperty   : function(property,value){this._element.style[property] = value; return this;},
    setStyleProperties : function(properties)    {for(var p in properties)this._element.style[p] = properties[p];return this;},


    getChildAt     : function(index) {return this._children[index];},
    getChildIndex  : function(node)  {return this._children.indexOf(node);},
    getChildren    : function()      {return this._children;},
    getNumChildren : function()      {return this._children.length;},
    getFirstChild  : function()      {return this._children[0];},
    getLastChild   : function()      {return this._children[this._children.length-1];},
    contains       : function(node)  {return this._children.indexOf(node) != -1;},

    setProperty   : function(property, value){this._element[property] = value;return this;},
    setProperties : function(properties)     {for(var p in properties)this._element[p] = properties[p];return this;},
    getProperty   : function(property)       {return this._element[property];},

    getElement : function(){ return this._element;},
    getType    : function(){ return this._type; },

    getParent  : function(){ return this._parent; }
};