const STR_INVALID_ARRAY_LENGTH = 'Invalid array length';

/*----------------------------------------------------------------------------------------------------------------*/
// UTILS
/*----------------------------------------------------------------------------------------------------------------*/

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

/*----------------------------------------------------------------------------------------------------------------*/
// DEFAULTS
/*----------------------------------------------------------------------------------------------------------------*/

const Default = {
    // Dimension
    WIDTH : 0,
    HEIGHT : 0,
    MINWIDTH : 0,
    MINHEIGHT : 0,
    MAXWIDTH : 0,
    MAXHEIGHT : 0,
    // Border
    BORDERCOLOR : '#000',
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
    // Flex
    FLEXDIRECTION : 'column',
    JUSTIFYCONTENT : 'flex-start',
    ALIGNITEMS : 'flex-start',
    ALIGNSELF : 'flex-start',
    FLEX : null,
    FLEXWRAP : 'wrap',
    // Text
    FONTFAMILY : 'Arial',
    FONTSIZE : 0,
    LINEHEIGHT : 1.5,
    WHITESPACE : 'normal',
    TEXTALIGN : 'left',
    // Position abs
    TOP : null,
    RIGHT : null,
    BOTTOM : null,
    LEFT : null,
    // Margin
    MARGIN : 0,
    MARGINTOP : 0,
    MARGINRIGHT: 0,
    MARGINBOTTOM : 0,
    MARGINLEFT : 0,
    // Padding
    PADDING : 0,
    PADDINGTOP : 0,
    PADDINGRIGHT: 0,
    PADDINGBOTTOM : 0,
    PADDINGLEFT : 0,
    POSITION : 'relative',
    OVERFLOW : 'visible',
    VISIBILITY : 'visible',
    DISPLAY : 'flex',
    ZINDEX : 0
};

const CSS_PROPERTY_MAP = {
    width : 'width', height : 'height',
    minWidth : 'minWidth', minHeight : 'minHeight',
    maxWidth : 'maxWidth', maxHeight : 'maxHeight',
    borderWidth : 'borderWidth',
    borderRadius : 'borderRadius',
    flexDirection : 'flexDirection',
    alignItems : 'alignItems',
    alignSelf : 'alignSelf',
    justifyContent : 'justifyContent',
    flex : 'flex',
    flexWrap : 'flexWrap',
    position : 'position',
    top : 'top',
    bottom : 'bottom',
    left : 'left'
};

const PropertyType = {
    NUMBER : 'property-type-numeric',
    STRING : 'property-type-string',
    MULTI  : 'property-type-multi'
};

const PROPERTY_INFO = {
    //dimensions
    width : {type : PropertyType.NUMBER},
    height : {type : PropertyType.NUMBER},
    minWidth : {type : PropertyType.NUMBER},
    minHeight : {type : PropertyType.NUMBER},
    maxWidth : {type : PropertyType.NUMBER},
    maxHeight : {type : PropertyType.NUMBER},
    //border
    borderColor : {type : PropertyType.STRING},
    borderWidth : {type : PropertyType.NUMBER},
    borderRadius : {type : PropertyType.NUMBER},
    borderRadiusTopLeft : {type : PropertyType.NUMBER},
    borderRadiusTopRight : {type : PropertyType.NUMBER},
    borderRadiusBottomLeft : {type : PropertyType.NUMBER},
    borderRadiusBottomRight : {type : PropertyType.NUMBER},
    //flex
    flexDirection : {type : PropertyType.STRING},
    alignItems : {type : PropertyType.STRING},
    alignSelf : {type : PropertyType.STRING},
    justifyContent : {type : PropertyType.STRING},
    flex : {type : PropertyType.NUMBER},
    flexWrap : {type : PropertyType.STRING},
    //box
    position : {type : PropertyType.NUMBER},
    top : {type : PropertyType.NUMBER},
    right : {type : PropertyType.NUMBER},
    bottom : {type : PropertyType.NUMBER},
    left : {type : PropertyType.NUMBER},
    margin : {type : PropertyType.NUMBER},
    marginTop : {type : PropertyType.NUMBER},
    marginRight : {type : PropertyType.NUMBER},
    marginBottom : {type : PropertyType.NUMBER},
    marginLeft : {type : PropertyType.NUMBER},
    padding : {type : PropertyType.NUMBER},
    paddingTop : {type : PropertyType.NUMBER},
    paddingRight : {type : PropertyType.NUMBER},
    paddingBottom : {type : PropertyType.NUMBER},
    overflow : {type : PropertyType.STRING},
    visibility : {type : PropertyType.STRING},
    zIndex : {type : PropertyType.NUMBER},
    display : {type : PropertyType.STRING},
    //text
    fontSize : {type : PropertyType.NUMBER},
    fontFamily : {type : PropertyType.STRING},
    lineHeight : {type : PropertyType.NUMBER},
    textAlign : {type : PropertyType.STRING},
    whiteSpace:{type:PropertyType.STRING}
};

class Style{
    /*----------------------------------------------------------------------------------------------------------------*/
    // CONSTRUCTOR
    /*----------------------------------------------------------------------------------------------------------------*/

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

        // Flex
        this._flexDirection = Default.FLEXDIRECTION;
        this._alignItems = Default.ALIGNITEMS;
        this._alignSelf = Default.ALIGNSELF;
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
        this._display = Default.DISPLAY;

        this._fontSize = Default.FONTSIZE;
        this._fontFamily = Default.FONTFAMILY;
        this._lineHeight = Default.LINEHEIGHT;
        this._textAlign = Default.TEXTALIGN;
        this._whiteSpace = Default.WHITESPACE;

        this._propertiesSet = {};
    }

    copy(){
        return new Style().merge(this);
    }


    clear(){
        for(let key in this._propertiesSet){
            this['_'+key] = Default[key.toUpperCase()];
            delete this._propertiesSet[key];
        }
    }

    merge(style){
        let propertiesSet_ = style.propertiesSet;
        for(let property in propertiesSet_){
            this[property] = propertiesSet_[property];
        }
        return this;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // ACTIVE PROPERTIES
    /*----------------------------------------------------------------------------------------------------------------*/

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

    /*----------------------------------------------------------------------------------------------------------------*/
    // PROPERTY SETTER INTERNAL
    /*----------------------------------------------------------------------------------------------------------------*/

    _removePropertySet(key){
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

    _setPropertyNumber(key,value){
        if(value === null){
            this._removePropertySet(key);
        } else {
            validateNumber(value);
            this['_'+key] = value;
            this._propertiesSet[key] = true;
        }
    }

    _setPropertyString(key,value,valids){
        if(value === null){
            this._removePropertySet(key);
        } else {
            if(typeof value !== 'string'){
                throw new Error('Invalid string.');
            }
            if(valids && valids.length !== 0){
                if(valids.indexOf(value) === -1){
                    throw new Error(`Invalid enum "${value}". Use ${valids.map((item)=>{return `"${item}"`}).join(', ')}.`)
                }
            }

            this['_'+key] = value;
            this._propertiesSet[key] = true;
        }
    }

    _setPropertyNumber4(key,value){
        if(value === null){
            this._removePropertySet(key);
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

    /*----------------------------------------------------------------------------------------------------------------*/
    // DIMENSIONS
    /*----------------------------------------------------------------------------------------------------------------*/

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

    /*----------------------------------------------------------------------------------------------------------------*/
    // POSITION ABS
    /*----------------------------------------------------------------------------------------------------------------*/

    set position(position){
        this._setPropertyString('position',position,['relative','absolute']);
    }

    get position(){
        return this._position;
    }

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

    /*----------------------------------------------------------------------------------------------------------------*/
    // MARGIN
    /*----------------------------------------------------------------------------------------------------------------*/

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

    /*----------------------------------------------------------------------------------------------------------------*/
    // PADDING
    /*----------------------------------------------------------------------------------------------------------------*/

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

    /*----------------------------------------------------------------------------------------------------------------*/
    // FLEX
    /*----------------------------------------------------------------------------------------------------------------*/

    set flexDirection(direction){
        this._setPropertyString('flexDirection',direction,['row','row-reverse','column','column-reverse']);
    }

    get flexDirection(){
        return this._flexDirection;
    }

    set justifyContent(justify){
        this._setPropertyString('justifyContent',justify,['flex-start', 'center', 'flex-end', 'space-between', 'space-around']);
    }

    get justifyContent(){
        return this._justifyContent;
    }

    set alignItems(align){
        this._setPropertyString('alignItems',align,['flex-start', 'center', 'flex-end', 'stretch']);
    }

    get alignItems(){
        return this._alignItems;
    }

    set alignSelf(align){
        this._setPropertyString('alignSelf',align,['flex-start', 'center', 'flex-end', 'stretch']);
    }

    get alignSelf(){
        return this._alignSelf;
    }

    set flex(flex){
        this._setPropertyNumber('flex',flex);
    }

    get flex(){
        return this._flex;
    }

    set flexWrap(wrap){
        this._setPropertyString('flexWrap',wrap,['wrap','nowrap']);
    }

    get flexWrap(){
        return this._flexWrap;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // TEXT
    /*----------------------------------------------------------------------------------------------------------------*/

    set fontSize(size){
        this._setPropertyNumber('fontSize',size);
    }

    get fontSize(){
        return this._fontSize;
    }

    set fontFamily(family){
        this._setPropertyString('fontFamily',family);
    }

    get fontFamily(){
        return this._fontFamily;
    }

    set lineHeight(height){
        this._setPropertyNumber('lineHeight',height);
    }

    get lineHeight(){
        return this._lineHeight;
    }

    set textAlign(align){
        this._setPropertyString('textAlign',align,['left','center','right']);
    }

    get textAlign(){
        return this._textAlign;
    }

    set whiteSpace(whiteSpace){
        this._setPropertyString('whiteSpace',whiteSpace,['normal','nowrap']);
    }

    get whiteSpace(){
        return this._whiteSpace;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // BORDER
    /*----------------------------------------------------------------------------------------------------------------*/

    set borderWidth(width){
        this._setPropertyNumber4('borderWidth',width);
    }

    get borderWidth(){
        return this._borderWidth;
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
        return this._borderRadius;
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

    set overflow(overflow){
        this._setPropertyString('overflow',overflow,['visible','hidden','scroll']);
    }

    get overflow(){
        return this._overflow;
    }

    set visibility(visibility){
        this._setPropertyString('visibility',visibility,['visible','hidden'])
    }

    get visibility(){
        return this._visibility;
    }

    set display(display){
        this._setPropertyString('display',display,['flex','none']);
    }

    get display(){
        return this._display;
    }

    set zIndex(index){
        this._zIndex = index;
        this._propertiesSet['zIndex'] = true;
    }

    get zIndex(){
        return this._zIndex;
    }
}

Style.CSS_PROPERTY_MAP = CSS_PROPERTY_MAP;
Style.PROPERTY_INFO = PROPERTY_INFO;
Style.PropertyType = PropertyType;

export default Style;