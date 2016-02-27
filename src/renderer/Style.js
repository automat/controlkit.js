const STR_INVALID_ARRAY_LENGTH = 'Invalid array length';

function validateNumber(number){
    if(typeof number === 'number'){
        return;
    }
    const STR_INVALID_FORMAT = 'Invalid number format';
    if(typeof number !== 'string'){
        throw new Error(STR_INVALID_FORMAT);
    }
    number = number.split(new RegExp('px|%', 'g'));
    if(number.length > 2){
        throw new Error(STR_INVALID_FORMAT);
    }
    if(isNaN(+number[0])){
        throw new Error('Invalid number');
    }
}

function validateString(value){
    if(typeof value !== 'string'){
        throw new Error('Invalid string');
    }
}

const Default = {
    WIDTH : 0,
    HEIGHT : 0,
    MINWIDTH : 0,
    MINHEIGHT : 0,
    MAXWIDTH : 0,
    MAXHEIGHT : 0,
    BORDERWIDTH: 0,
    BORDERWIDTHTOP : 0,
    BORDERWIDTHRIGHT : 0,
    BORDERWIDTHBOTTOM : 0,
    BORDERWIDTHLEFT : 0,
    BORDERRADIUS : 0,
    BORDERRADIUSTOPLEFT : 0,
    BORDERRADIUSTOPRIGHT : 0,
    BORDERRADIUSBOTTOMRIGHT : 0,
    BORDERRADIUSBOTTOMLEFT : 0,
    FLEXDIRECTION : 'column',
    JUSTIFYCONTENT : 'flex-start',
    FLEX : 1,
    FLEXWRAP : 'wrap',
    POSITION : 'relative',
    FONTSIZE : 0,
    TEXTALIGN : 'ltr',
    //
    TOP : null,
    RIGHT : null,
    BOTTOM : null,
    LEFT : null,
    MARGIN : 0,
    MARGINTOP : 0,
    MARGINRIGHT: 0,
    MARGINBOTTOM : 0,
    MARGINLEFT : 0,
    PADDING : 0,
    PADDINGTOP : 0,
    PADDINGRIGHT: 0,
    PADDINGBOTTOM : 0,
    PADDINGLEFT : 0,
    OVERFLOW : 'visible',
    VISIBILITY : '',
    ZINDEX : 0
};

export default class Style{
    constructor(){
        this._width = Default.WIDTH;
        this._height = Default.HEIGHT;

        this._minWidth = Default.MINWIDTH;
        this._minHeight = Default.MINHEIGHT;
        this._maxWidth = Default.MAXWIDTH;
        this._maxHeight = Default.MAXHEIGHT;

        this._borderWidth = Default.BORDERWIDTH;
        this._borderWidthTop = Default.BORDERWIDTHTOP;
        this._borderWidthRight = Default.BORDERWIDTHRIGHT;
        this._borderWidthBottom = Default.BORDERWIDTHBOTTOM;
        this._borderWidthLeft = Default.BORDERWIDTHLEFT;
        this._borderRadius = Default.BORDERRADIUS;
        this._borderRadiusTopLeft = Default.BORDERRADIUSTOPLEFT;
        this._borderRadiusTopRight = Default.BORDERRADIUSTOPRIGHT;
        this._borderRadiusBottomRight = Default.BORDERRADIUSBOTTOMRIGHT;
        this._borderRadiusBottomLeft = Default.BORDERRADIUSBOTTOMLEFT;

        this._flexDirection = Default.FLEXDIRECTION;
        this._justifyContent = Default.JUSTIFYCONTENT;
        this._flex = Default.FLEX;
        this._flexWrap = Default.FLEXWRAP;
        this._position = Default.POSITION;

        /* box properties */
        this._top = Default.TOP;
        this._right = Default.RIGHT;
        this._bottom = Default.BOTTOM;
        this._left = Default.LEFT;
        this._margin = Default.MARGIN;
        this._marginTop = Default.MARGINTOP;
        this._marginRight = Default.MARGINRIGHT;
        this._marginBottom = Default.MARGINBOTTOM;
        this._marginLeft = Default.MARGINLEFT;
        this._padding = Default.PADDING;
        this._paddingTop = Default.PADDINGTOP;
        this._paddingRight = Default.PADDINGRIGHT;
        this._paddingBottom = Default.PADDINGBOTTOM;
        this._paddingLeft = Default.PADDINGLEFT;
        this._overflow = Default.OVERFLOW;
        this._visibility = Default.VISIBILITY;
        this._zIndex = Default.ZINDEX;

        this._fontSize = Default.FONTSIZE;
        this._textAign = Default.TEXTALIGN;

        this._propertiesSet = {};
    }

    copy(){
        return new Style().merge(this);
    }

    merge(style){
        let propertiesSet_ = style.propertiesSet;
        for(let property in propertiesSet_){
            this[property] = propertiesSet_[property];
        }
        this.isProcessed = false;
        return this;
    }

    removePropertySet(key){
        if(this._propertiesSet[key] === undefined){
            throw new Error(`Property "${key}" not set.`);
        }
        this['_' + key] = Default[key.toUpperCase()];

        const partials = [
            'Top','Right','Bottom','Left',
            'TopLeft','TopRight','BottomRight','BottomLeft'
        ];

        for(var partial of partials){
            let key_ = this[`${key}${partial}`];
            let key__ = '_' + key_;
            if(this[key__] === undefined){
                continue;
            }
            this[key__] = Default[key_.toUpperCase()];
            if(this._propertiesSet[key_] === undefined){
                continue;
            }
            delete this._propertiesSet[key_];
        }

        delete this._propertiesSet[key];
    }

    get propertiesSet(){
        var out = {};
        for(let key in this._propertiesSet){
            let property = this['_' + key];
            if(Array.isArray(property)){
                property = property.slice(0);
            }
            out[key] = property;
        }
        return out;
    }

    get propertiesSetString(){
        var obj = {};
        for(let property in this._propertiesSet){
            obj[property] = this._propertiesSet[property].toString();
        }
        return obj;
    }

    _setPropertyNumber(key,value){
        if(value === null){
            this.removePropertySet(key);
        } else {
            validateNumber(value);
            this['_'+key] = value;
            this._propertiesSet[key] = true;
        }
    }

    _setPropertyString(key,value){
        if(value === null){
            this.removePropertySet(key);
        } else {
            validateString(value);
            this['_'+key] = value;
            this._propertiesSet[key] = true;
        }
    }

    _setPropertyNumber4(key,value){
        if(value === null){
            this.removePropertySet(key);
        } else {
            if(!Array.isArray(value)){
                value = [value];
            }
            for(let number of value){
                validateNumber(number);
            }
            const partials = [
                'Top','Right','Bottom','Left',
                'TopLeft','BottomLeft','TopRight','BottomRight'
            ];
            let keys = [];
            for(let partial of partials){
                let key_ = `${key}${partial}`;
                if(this['_' + key_] === undefined){
                    continue;
                }
                keys.push(key_);
            }

            switch (value.length){
                case 1:
                    this['_' + key] = value[0];
                    this._propertiesSet[key] = true;
                    return;
                    break;
                case 2:
                    this[`_${keys[0]}`] = this[`_${keys[2]}`] = value[0];
                    this[`_${keys[3]}`] = this[`_${keys[1]}`] = value[1];
                    break;
                case 3:
                    this[`_${keys[0]}`] = value[0];
                    this[`_${keys[1]}`] = this[`_${keys[3]}`] = value[1];
                    this[`_${keys[2]}`] = value[2];
                    break;
                case 4:
                    this[`_${keys[0]}`] = value[0];
                    this[`_${keys[1]}`] = value[1];
                    this[`_${keys[2]}`] = value[2];
                    this[`_${keys[3]}`] = value[3];
                    break;
                default:
                    throw new Error(STR_INVALID_ARRAY_LENGTH);
            }

            this._propertiesSet[keys[0]] = true;
            this._propertiesSet[keys[1]] = true;
            this._propertiesSet[keys[2]] = true;
            this._propertiesSet[keys[3]] = true;
        }
    }

    set width(width){
        this._setPropertyNumber('width',width);
    }
    get width(){
        return this._width;
    }

    set height(height){
        this._setPropertyNumber('height',height);
    }
    get height(){
        return this._height;
    }

    set fontSize(size){
        this._setPropertyNumber('fontSize',size);
    }

    get fontSize(){
        return this._fontSize;
    }


    /*----------------------------------------------------------------------------------------------------------------*/
    // BORDER
    /*----------------------------------------------------------------------------------------------------------------*/

    set borderWidth(width){
        this._setPropertyNumber4('borderWidth',width);
    }

    get borderWidth(){
        return this._borderWidth.slice(0);
    }

    set borderWidthTop(width){
        this._setPropertyNumber('borderWidthTop',width);
    }

    get borderWidthTop(){
        return this._borderWidthTop;
    }

    set borderWidthRight(width){
        this._setPropertyNumber('borderWidthRight',width);
    }

    get borderWidthRight(){
        return this._borderWidthRight;
    }

    set borderWidthBottom(width){
        this._setPropertyNumber('borderWidthBottom',width);
    }

    get borderWidthBottom(){
        return this._borderWidthBottom;
    }

    set borderWidthLeft(width){
        this._setPropertyNumber('borderWidthLeft',width);
    }

    get borderWidthLeft(){
        return this._borderWidthLeft;
    }

    set borderRadius(radius){
        this._setPropertyNumber4('borderRadius',radius);
    }

    get borderRadius(){
        return this._borderRadius.slice(0);
    }

    set borderRadiusTopLeft(radius){
        this._setPropertyNumber('borderRadiusTopLeft',radius);
    }

    get borderRadiusTopLeft(){
        return this._borderRadiusTopLeft;
    }

    set borderRadiusTopRight(radius){
        this._setPropertyNumber('borderRadiusTopRight',radius);
    }

    get borderRadiusTopRight(){
        return this._borderRadiusTopRight;
    }

    set borderRadiusBottomRight(radius){
        this._setPropertyNumber('borderRadiusBottomRight',radius);
    }

    get borderRadiusBottomRight(){
        return this._borderRadiusBottomRight;
    }

    set borderRadiusBottomLeft(radius){
        this._setPropertyNumber('borderRadiusBottomLeft',radius);
    }

    get borderRadiusBottomLeft(){
        return this._borderRadiusBottomLeft;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // BOX PROPERTIES
    /*----------------------------------------------------------------------------------------------------------------*/

    set top(top){
        this._setPropertyNumber('top',top);
    }

    get top(){
        return this._top;
    }

    set right(right){
        this._setPropertyNumber('right',right);
    }

    get right(){
        return this._right;
    }

    set bottom(bottom){
        this._setPropertyNumber('bottom',bottom);
    }

    get bottom(){
        return this._bottom;
    }

    set left(left){
        this._setPropertyNumber('left',left);
    }

    get left(){
        return this._left;
    }

    set margin(margin){
        this._setPropertyNumber4('margin',margin);
    }

    get margin(){
        return this._margin;
    }

    set marginTop(margin){
        this._setPropertyNumber('marginTop',margin);
    }

    get marginTop(){
        return this._marginTop;
    }

    set marginRight(margin){
        this._setPropertyNumber('marginRight',margin);
    }

    get marginRight(){
        return this._marginRight;
    }

    set marginBottom(margin){
        this._setPropertyNumber('marginBottom',margin);
    }

    get marginBottom(){
        return this._marginBottom;
    }

    set marginLeft(margin){
        this._setPropertyNumber('marginLeft',margin);
    }

    get marginLeft(){
        return this._marginLeft;
    }

    set padding(padding){
        this._setPropertyNumber4('padding',padding);
    }

    get padding(){
        return this._padding;
    }

    set paddingTop(top){
        this._setPropertyNumber('paddingTop',top);
    }

    get paddingTop(){
        return this._paddingTop;
    }

    set paddingRight(right){
        this._setPropertyNumber('paddingRight',right);
    }

    get paddingRight(){
        return this._paddingRight;
    }

    set paddingBottom(bottom){
        this._setPropertyNumber('paddingBottom',bottom);
    }

    get paddingBottom(){
        return this._paddingBottom;
    }

    set paddingLeft(left){
        this._setPropertyNumber('paddingLeft',left);
    }

    get paddingLeft(){
        return this._paddingLeft;
    }

    set overflow(overflow){
        switch (overflow){
            case 'initial':
            case 'visible':
                this._overflow = 'visible';
                break;
            case 'scroll' :
            case 'hidden' :
                this._overflow = overflow;
                break;
            default:
                throw new Error('Overflow type "' + overflow + '" not supported.');
        }
        this._propertiesSet['overflow'] = true;
    }

    get overflow(){
        return this._overflow;
    }

    set visibility(visibility){
        switch (visibility){
            case 'initial':
            case 'visible':
                this._overflow = 'visible';
                break;
            case 'hidden' :
                this._overflow = visibility;
                break;
            default:
                throw new Error('Visibility type "' + visibility + '" not supported.');
        }
        this._propertiesSet['visibility'] = true;
    }

    get visibility(){
        return this._visibility;
    }

    set zIndex(index){
        this._zIndex = index;
        this._propertiesSet['zIndex'] = true;
    }

    get zIndex(){
        return this._zIndex;
    }

}