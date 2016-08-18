import EventDispatcher  from "../core/event/EventDispatcher";
import DisplayTreeEvent from "./DisplayTreeEvent";

import DisplayBase from "./DisplayBase";
import BaseEvent   from "./BaseEvent";

import TextMetrics from "./TextMetrics";

import cssComputeLayout from "css-layout";

export default class DisplayTree extends EventDispatcher{
    constructor(){
        super();

        this._base = new DisplayBase();

        let self = this;
        this.base.addEventListener(BaseEvent.UPDATE_LAYOUT,function onBaseUpdateLayout(){
            self.updateLayout();
            self.dispatchEvent(new DisplayTreeEvent(DisplayTreeEvent.UPDATE_LAYOUT));
        });
        this.base.addEventListener(BaseEvent.UPDATE_DRAW, function onBaseUpdateDraw(){
            self.dispatchEvent(new DisplayTreeEvent(DisplayTreeEvent.UPDATE_LAYOUT));
        });
    }

    updateLayout(){

        function measure(maxWidth = 0, maxHeight = 0){
            let layout = this._layoutNode.layout;
            let style  = this._layoutNode.style;

            let borderWidth = style.borderWidth || 0;

            let paddingTop    = style.paddingTop || 0;
            let paddingRight  = style.paddingRight || 0;
            let paddingLeft   = style.paddingLeft || 0;
            let paddingBottom = style.paddingBottom || 0;

            if(style.padding){
                paddingTop = paddingRight = paddingBottom = paddingLeft = style.padding;
            }

            let width  = 0;
            let height = 0;

            let options = {
                fontFamily : style.fontFamily,
                fontSize :   style.fontSize,
                lineHeight : style.lineHeight
            };

            switch(style.whiteSpace){
                case 'nowrap':
                    width  = TextMetrics.measureText(this._textContent,options).width;
                    height = options.fontSize;
                    break;

                case 'normal':
                default:
                    options.maxWidth = Math.max(layout.width, maxWidth) - (paddingRight + paddingLeft + borderWidth * 2);
                    let size = TextMetrics.measureText(this._textContent, options);
                    width  = size.width;
                    height = size.height;
                    break;
            }

            return {
                width : Math.max(width, maxWidth),
                height : Math.max(height, maxHeight)
            };
        }

        function inject(node){
            let style = node.layoutNode.style;

            if(node.textContent && node.textContent.length !== 0){
                style.measure = style.measure || measure.bind(node);
            }else if(style.measure){
                delete style.measure;
            }

            for(let child of node.children){
                inject(child);
            }
        }

        inject(this._base);
        cssComputeLayout(this._base.layoutNode);
    }

    get base(){
        return this._base
    }
}