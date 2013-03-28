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

function ControlKit(parentDomElementId, params)
{
    var parentElement = this._parentElement = document.getElementById(parentDomElementId);

    params            = params || {};
    params.position   = params.position   || [20,20];
    params.width      = params.width      ||  300;
    params.height     = params.height     ||  window.innerHeight;
    params.ratioLabel = params.ratioLabel ||  40;
    params.label      = params.label      || 'Controls';

    this._maxHeight = params.maxHeight || window.innerHeight;

    var rootNode = this._node = new CKNode(CKNodeType.DIV),
        headNode = new CKNode(CKNodeType.DIV),
        lablNode = new CKNode(CKNodeType.SPAN),
        wrapNode = new CKNode(CKNodeType.DIV),
        listNode = this._listNode = new CKNode(CKNodeType.LIST);

    rootNode.setStyleClass(CKCSS.Kit);
    headNode.setStyleClass(CKCSS.Head);
    lablNode.setStyleClass(CKCSS.Label);
    wrapNode.setStyleClass(CKCSS.Wrap);

    rootNode.setPositionGlobal(params.position[0],params.position[1]);
    rootNode.setWidth(params.width);
    lablNode.setProperty('innerHTML',params.label);

    headNode.addChild(lablNode);
    wrapNode.addChild(listNode);
    rootNode.addChild(headNode);
    rootNode.addChild(wrapNode);



    parentElement.appendChild(rootNode.getElement());

    headNode.setEventListener(CKNodeEvent.MOUSE_DOWN,function(){});

    this._blocks = [];

    if(!ControlKit.getMouse())ControlKit._mouse = new CKMouse();

}

ControlKit.getMouse = function(){return ControlKit._mouse;};

ControlKit.prototype =
{
    addBlock : function(label,params)
    {
        var block = new CKBlock(this,label,params);
        this._listNode.addChild(block.getNode());
        this._blocks.push(block);
        return block;
    },

    forceUpdate : function()
    {
        var i = -1, j;
        var blocks = this._blocks;
        var components;

        while(++i < blocks.length)
        {
            components = blocks[i].getComponents();
            j = -1;
            while(++j < components.length)
            {
                components[j].forceUpdate();
            }
        }
    }
};
