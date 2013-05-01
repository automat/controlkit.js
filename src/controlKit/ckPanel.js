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
    CKEventDispatcher.apply(this,arguments);

    var parent = this._parent = controlKit;

    /*---------------------------------------------------------------------------------*/

    params            = params || {};
    params.valign     = params.valign        || CKLayout.ALIGN_TOP;
    params.align      = params.align         || CKLayout.ALIGN_LEFT;
    params.position   = params.position      || [20,20];
    params.width      = params.width         ||  300;
    params.maxHeight  = params.maxHeight     ||  parent.getWindow().height - params.position[1];
    params.ratio      = params.ratio         ||  40;
    params.label      = params.label         || 'Control Panel';
    params.fixed      = params.fixed === undefined ? true : params.fixed;


   // params.fixed      = params.fixed  || true;  //TODO:FIXME

    //console.log(params.fixed);

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
        headNode = this._headNode = new CKNode(CKNodeType.DIV),
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
    listNode.setStyleClass(CKCSS.GroupList);

    /*---------------------------------------------------------------------------------*/

    controlKit.setPanelPosition(this);
    rootNode.setWidth(this._width);
    lablNode.setProperty('innerHTML',label);

    /*---------------------------------------------------------------------------------*/

    if(!params.fixed)
    {
        //console.log('movable');

        this._headDragging = false;
        this._mouseOffset  = [0,0];

        headNode.setStyleProperty('cursor','pointer');

        headNode.setEventListener(CKNodeEventType.MOUSE_DOWN,this._onHeadMouseDown.bind(this));
        document.addEventListener(CKDocumentEventType.MOUSE_MOVE,this._onDocumentMouseMove.bind(this));
        document.addEventListener(CKDocumentEventType.MOUSE_UP,  this._onDocumentMouseUp.bind(this));
    }


    //window.addEventListener(CKEventType.WINDOW_RESIZE,this._onWindowResize.bind(this),false);

    this._cPosition = [0,0];



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

CKPanel.prototype = Object.create(CKEventDispatcher.prototype);

CKPanel.prototype.addGroup  = function(params)
{
    var group = new CKGroup(this,params);
    this._groups.push(group);
    return group;
};

CKPanel.prototype.getGroups     = function(){return this._groups;};
CKPanel.prototype.getNode       = function(){return this._rootNode;};
CKPanel.prototype.getList       = function(){return this._listNode;};


/*---------------------------------------------------------------------------------*
* Panel dragging
*----------------------------------------------------------------------------------*/

CKPanel.prototype._onHeadMouseDown = function()
{
    var nodePos   = this._rootNode.getPositionGlobal(),
        mousePos  = CKMouse.getInstance().getPosition(),
        offsetPos = this._mouseOffset;

    offsetPos[0] = mousePos[0] - nodePos[0];
    offsetPos[1] = mousePos[1] - nodePos[1];

    this._headDragging = true;

    this.dispatchEvent(new CKEvent(this,CKEventType.PANEL_MOVE_BEGIN));
    this.dispatchEvent(new CKEvent(this,CKEventType.INDEX_ORDER_CHANGED),{origin:this});
};

CKPanel.prototype._updatePosition = function()
{
    var mousePos  = CKMouse.getInstance().getPosition(),
        offsetPos = this._mouseOffset;

    var currPositionX = mousePos[0]-offsetPos[0],
        currPositionY = mousePos[1]-offsetPos[1];

    var position = this._constrainedPosition(currPositionX,currPositionY);

    this._rootNode.setPositionGlobal(position[0],position[1]);

    this.dispatchEvent(new CKEvent(this,CKEventType.PANEL_MOVE));
};

CKPanel.prototype._onDocumentMouseMove = function()
{
    if(!this._headDragging)return;
    this._updatePosition();
};

CKPanel.prototype._onDocumentMouseUp = function()
{
    if(!this._headDragging)return;
    this.dispatchEvent(new CKEvent(this,CKEventType.PANEL_MOVE_END));
    this._headDragging = false;
};

CKPanel.prototype._onWindowResize = function()
{
    var ckWindow = ControlKit.getInstance().getWindow();

};

/*---------------------------------------------------------------------------------*/

CKPanel.prototype._setPosition = function(x,y)
{

    this._rootNode.setPositionGlobal(x,y);

};

CKPanel.prototype._constrainedPosition = function(x,y)
{
    var node = this._rootNode,
        ckWindow = ControlKit.getInstance().getWindow();

    var maxX = ckWindow.width  - node.getWidth(),
        maxY = ckWindow.height - this._headNode.getHeight();

    this._cPosition[0] = (x<0)?0:(x>maxX)?maxX:x;
    this._cPosition[1] = (y<0)?0:(y>maxY)?maxY:y;

    return this._cPosition;
};

CKPanel.prototype._constrainedHeight = function(height)
{

};

CKPanel.prototype.getWidth      = function(){return this._width;};
CKPanel.prototype.getAlignment  = function(){return this._align;};
CKPanel.prototype.getPosition   = function(){return this._position;};

/*---------------------------------------------------------------------------------*/



