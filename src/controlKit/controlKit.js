/**
 *
 * controlKit.js - A lightweight controller library
 *
 * controlKit.js is available under the terms of the MIT license.  The full text of the
 * MIT license is included below.
 *
 * MIT License
 * ===========
 *
 * Copyright (c) 2013 Henryk Wollik. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */

function ControlKit(parentDomElementId)
{
    if(!ControlKit._instance)
    {
        var node = null;

        if(!parentDomElementId)
        {
            node = new CKNode(CKNodeType.DIV);
            document.body.addChild(node.getElement());
        }
        else
        {
            node = CKNode.getNodeById(parentDomElementId);
        }

        this._rootNode   = node;
        this._panels = [];

        /*---------------------------------------------------------------------------------*/

        CKMouse.init();
        CKOptions.init();

        node.addChild(CKOptions.getInstance().getNode());

        /*---------------------------------------------------------------------------------*/

        this._window = {width :window.innerWidth,height:window.innerHeight};

        /*---------------------------------------------------------------------------------*/

        window.addEventListener("resize", this.onWindowResize.bind(this), false);

        /*---------------------------------------------------------------------------------*/

        ControlKit._instance = this;
    }

    return ControlKit._instance;
}

/*---------------------------------------------------------------------------------*/

ControlKit.prototype =
{
    onWindowResize : function()
    {
        this._window.width  = window.innerWidth;
        this._window.height = window.innerHeight;

        var kits = this._panels;
        var i = -1;

        while(++i < kits.length)this.setPanelPosition(kits[i]);
    },

    /*---------------------------------------------------------------------------------*/

    addPanel : function(params)
    {
        var panel = new CKPanel(this,params);
        this._panels.push(panel);
        return panel;
    },

    /*---------------------------------------------------------------------------------*/

    forcePanelUpdate : function()
    {
        var i = -1, j, k;

        var panels = this._panels,
            groupList,
            components,
            component;

        while(++i < panels.length)
        {
            groupList = panels[i].getGroups();
            j=-1;
            while(++j < groupList.length)
            {
                components = groupList[j].getComponents();
                k=-1;
                while(++k < components.length)
                {
                    component = components[k];
                    if(component instanceof  CKObjectComponent)component.forceUpdate();

                }
            }
        }
    },

    /*---------------------------------------------------------------------------------*/

    update : function()
    {
        var i = -1, j, k;

        var panels   = this._panels,
            groupList,
            components,
            component;

        while(++i < panels.length)
        {
            groupList = panels[i].getGroups();
            j=-1;
            while(++j < groupList.length)
            {
                components = groupList[j].getComponents();
                k=-1;
                while(++k < components.length)
                {
                    component = components[k];
                    if(component instanceof CKValuePlotter ||
                       component instanceof CKStringOutput ||
                       component instanceof CKNumberOutput)
                    {
                        component.update();
                    }

                }
            }
        }
    },

    /*---------------------------------------------------------------------------------*/

    setPanelPosition : function(panel)
    {

        var window        = this._window,
            panelAlign    = panel.getAlignment(),
            panelPosition = panel.getPosition(),
            position      = panelAlign == CKLayout.ALIGN_LEFT   ? panelPosition :
                            panelAlign == CKLayout.ALIGN_RIGHT  ? [window.width - panel.getWidth() - panelPosition[0],panelPosition[1]] :
                            [0,0];

        panel.getNode().setPositionGlobal(position[0],position[1]);
    },

    /*---------------------------------------------------------------------------------*/

    getWindow : function(){return this._window;},

    /*---------------------------------------------------------------------------------*/

    getRootNode : function(){return this._rootNode;}

};

/*---------------------------------------------------------------------------------*/

ControlKit.getInstance = function(){return ControlKit._instance;};

