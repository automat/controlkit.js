


function CKManager(parentDomElementId)
{
    var node = this._node = new CKNode(CKNodeType.DIV);
    this._kits  = [];

    node.addChild(CKOptions_Internal.getInstance().getNode());

    if(parentDomElementId){document.getElementById(parentDomElementId).appendChild(node.getElement());}
    else document.body.appendChild(node.getElement());
}

/*---------------------------------------------------------------------------------*/

CKManager.prototype =
{
    addKit :  function(kit)
    {
        this._kits.push(kit);
        this._node.addChild(kit.getNode());
    },

    getKitPosition : function(kit)
    {
        var properties = kit.properties;
        return properties.align == CKLayout.ALIGN_LEFT  ? properties.position :
               properties.align == CKLayout.ALIGN_RIGHT ? [window.innerWidth - properties.width - properties.position[0],properties.position[1]] :
               [0,0];

    },

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
    }

};

/*---------------------------------------------------------------------------------*/

CKManager.init = function(parentDomElementId){if(!CKManager._instance)CKManager._instance = new CKManager(parentDomElementId);};
CKManager.getInstance = function(){if(!CKManager._instance)CKManager._instance = new CKManager();return CKManager._instance;};

