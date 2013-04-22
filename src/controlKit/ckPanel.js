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


function CKPanel(controlKit,params)
{
    var parent = this._parent = controlKit;

    /*---------------------------------------------------------------------------------*/

    params            = params || {};
    params.valign     = params.valign     || CKLayout.ALIGN_TOP;
    params.align      = params.align      || CKLayout.ALIGN_LEFT;
    params.position   = params.position   || [20,20];
    params.width      = params.width      ||  300;
    params.maxHeight  = params.maxHeight  ||  parent.getWindow().height - params.position[1];
    params.ratio      = params.ratio      ||  40;
    params.label      = params.label      || 'Control Panel';
    params.fixed      = params.fixed      || true;  //TODO:FIXME

    /*---------------------------------------------------------------------------------*/

    this._valign    = params.valign;
    this._align     = params.align;
    this._position  = params.position;
    this._width     = params.width;
    this._maxHeight = params.maxHeight;
    this._ratio     = params.ratio;
    var   label     = params.label;

    /*---------------------------------------------------------------------------------*/


    var rootNode = this._rootNode = new CKNode(CKNodeType.DIV),
        headNode = new CKNode(CKNodeType.DIV),
        lablNode = new CKNode(CKNodeType.SPAN),
        wrapNode = new CKNode(CKNodeType.DIV),
        listNode = this._listNode = new CKNode(CKNodeType.LIST);

    /*---------------------------------------------------------------------------------*/

    controlKit.getRootNode().addChild(rootNode);

    /*---------------------------------------------------------------------------------*/

    rootNode.setStyleClass(CKCSS.Panel);
    headNode.setStyleClass(CKCSS.Head);
    lablNode.setStyleClass(CKCSS.Label);
    wrapNode.setStyleClass(CKCSS.Wrap);

    /*---------------------------------------------------------------------------------*/

    controlKit.setPanelPosition(this);
    rootNode.setWidth(this._width);
    lablNode.setProperty('innerHTML',label);

    /*---------------------------------------------------------------------------------*/

    if(params.fixed === false)
    {

    }


    headNode.setEventListener(CKNodeEvent.MOUSE_DOWN,function(){});

    /*---------------------------------------------------------------------------------*/

    this._groups = [];

    /*---------------------------------------------------------------------------------*/

    headNode.addChild(lablNode);
    wrapNode.addChild(listNode);
    rootNode.addChild(headNode);
    rootNode.addChild(wrapNode);

    /*---------------------------------------------------------------------------------*/


}

/*---------------------------------------------------------------------------------*/

CKPanel.prototype =
{
    addGroup : function(params)
    {
        var group = new CKGroup(this,params);
        this._groups.push(group);
        return group;
    },

    getGroups     : function(){return this._groups;},
    forceUpdate   : function(){this._parent.forcePanelUpdate();},
    getNode       : function(){return this._rootNode;},
    getList       : function(){return this._listNode;},

    /*---------------------------------------------------------------------------------*/

    getWidth      : function(){return this._width;},
    getAlignment  : function(){return this._align;},
    getPosition   : function(){return this._position;}


};

/*---------------------------------------------------------------------------------*/



