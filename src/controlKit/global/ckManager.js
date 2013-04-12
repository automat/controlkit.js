


function CKManager(parentDomElementId)
{
    var node = this._node = parentDomElementId ?
                            CKNode.getNodeById(parentDomElementId) :
                            new CKNode(CKNodeType.DIV);
    this._kits = [];

    this._window = {width :window.innerWidth,
                    height:window.innerHeight};

    node.addChild(CKOptions_Internal.getInstance().getNode());
    if(!parentDomElementId)document.body.appendChild(node.getElement());

    window.addEventListener("resize", this.onWindowResize.bind(this), false);
}

/*---------------------------------------------------------------------------------*/

CKManager.prototype =
{
    onWindowResize : function()
    {
        this._window.width  = window.innerWidth;
        this._window.height = window.innerHeight;

        var kits = this._kits;
        var i = -1;

        while(++i < kits.length)this.setKitPosition(kits[i]);
    },

    /*---------------------------------------------------------------------------------*/

    addKit :  function(kit)
    {
        this._kits.push(kit);
        this._node.addChild(kit.getNode());
    },

    /*---------------------------------------------------------------------------------*/

    forceKitsUpdate : function()
    {
        var i = -1, j, k;

        var kits   = this._kits,
            blocks,
            components;

        while(++i < kits.length)
        {
            blocks = kits[i].getBlocks();
            j=-1;
            while(++j < blocks.length)
            {
                components = blocks[j].getComponents();
                k=-1;
                while(++k < components.length)
                {
                    components[k].forceUpdate();
                }
            }
        }
    },

    /*---------------------------------------------------------------------------------*/

    setKitPosition : function(kit)
    {
        var attributes = kit.getAttributes(),
            window     = this._window,
            position   = attributes.align == CKLayout.ALIGN_LEFT  ? attributes.position :
                         attributes.align == CKLayout.ALIGN_RIGHT ? [window.width - attributes.width - attributes.position[0],attributes.position[1]] :
                         [0,0];

        kit.getNode().setPositionGlobal(position[0],position[1]);
    },

    /*---------------------------------------------------------------------------------*/

    getWindow : function(){return this._window;},

    /*---------------------------------------------------------------------------------*/

    getRootNode : function()
    {
        return this._node;
    }

};

/*---------------------------------------------------------------------------------*/

CKManager.init = function(parentDomElementId){if(!CKManager._instance)CKManager._instance = new CKManager(parentDomElementId);};
CKManager.getInstance = function(){if(!CKManager._instance)CKManager._instance = new CKManager();return CKManager._instance;};

