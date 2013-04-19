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


function ControlKit(params)
{

    var manager = CKManager.getInstance();

    /*---------------------------------------------------------------------------------*/

    params            = params || {};
    params.valign     = params.valign     || CKLayout.ALIGN_TOP;
    params.align      = params.align      || CKLayout.ALIGN_LEFT;
    params.position   = params.position   || [20,20];
    params.width      = params.width      ||  300;
    params.height     = params.height     ||  manager.getWindow().height - params.position[1];
    params.ratio      = params.ratio      ||  40;
    params.label      = params.label      || 'Controls';

    /*---------------------------------------------------------------------------------*/

    //TODO:FIXME CLEANMEUP
    //cache
    var attributes = this._attributes = {
                                            valign   : params.valign,
                                            align    : params.align,
                                            position : params.position,
                                            width    : params.width,
                                            height   : params.height,
                                            ratio    : params.ratio,
                                            label    : params.label
                                        };

    /*---------------------------------------------------------------------------------*/


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

    /*---------------------------------------------------------------------------------*/

    manager.setKitPosition(this);
    rootNode.setWidth(attributes.width);
    lablNode.setProperty('innerHTML',attributes.label);

    /*---------------------------------------------------------------------------------*/

    headNode.setEventListener(CKNodeEvent.MOUSE_DOWN,function(){});

    /*---------------------------------------------------------------------------------*/

    this._blocks = [];

    /*---------------------------------------------------------------------------------*/

    headNode.addChild(lablNode);
    wrapNode.addChild(listNode);
    rootNode.addChild(headNode);
    rootNode.addChild(wrapNode);

    manager.addKit(this);
}

/*---------------------------------------------------------------------------------*/

ControlKit.prototype =
{
    addBlock : function(label,params)
    {
        var block = new CKBlock(this,label,params);
        this._blocks.push(block);
        return block;
    },

    getBlocks     : function(){return this._blocks;},
    forceUpdate   : function(){CKManager.getInstance().forceKitsUpdate();},
    getAttributes : function(){return this._attributes;},
    getNode       : function(){return this._node;},
    getList       : function(){return this._listNode;}


};

/*---------------------------------------------------------------------------------*/

ControlKit.init = function(parentDomElementId){CKManager.init(parentDomElementId);};
ControlKit.update = function(){CKManager.getInstance().update();};


