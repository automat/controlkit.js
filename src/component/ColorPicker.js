import createHtml from '../util/createHtml';

import {CSSColorStringMap} from './ColorString';

/*--------------------------------------------------------------------------------------------------------------------*/
// Template
/*--------------------------------------------------------------------------------------------------------------------*/

const template =
    `<div id="control-kit-color-picker" class="panel">
        <div class="panel-head">
            <label>Color Picker</label>
        </div>
        <div class="color-picker-wrap">
            <div class="color-picker-settings">
                <div class="color-space-slider input-background">
                    <div class="color-space">
                        <canvas width="154" height="154"></canvas>
                        <div class="color-slider"></div>
                    </div>
                </div>
                <div class="color-hue-slider input-background">
                    <div class="color-hue">
                        <canvas width="14" height="154"></canvas>
                        <div class="color-slider"></div>
                    </div>
                </div>
                <div class="color-components">
                    <ul>
                        <li><label>H</label><input type="number" min="0" max="360" step="1" value="0"></li>
                        <li><label>R</label><input type="number" min="0" max="255" step="1" value="0"></li>
                        <li><label>S</label><input type="number" min="0" max="100" step="1" value="0"></li>
                        <li><label>G</label><input type="number" min="0" max="255" step="1" value="0"></li>
                        <li><label>B</label><input type="number" min="0" max="100" step="1" value="0"></li>
                        <li><label>B</label><input type="number" min="0" max="255" step="1" value="0"></li>
                        <li class="color-compare">
                            <div class="input-background">
                                <div class="color-compare-left"></div>
                                <div class="color-compare-right"></div>
                            </div>
                        </li>
                    </ul>
                    <div class="color-input-wrap">
                        <input class="color-input" " type="text" value="#333333">
                    </div>
                </div>
            </div>
            <div class="color-picker-controls">
                <button class="btn-pick">Pick</button>
                <button class="btn-cancel">Cancel</button>
            </div>
        </div>
    </div>`;

/*--------------------------------------------------------------------------------------------------------------------*/
// Utils
/*--------------------------------------------------------------------------------------------------------------------*/

const noop = function(){};

export const ColorMode = Object.freeze({
    RGB : 'rgb',
    HEX : 'hex',
    HSV : 'hsv',
    RGB_F : 'rgbf'
});

export function isRgbaString(color){
    return (typeof color === 'string' || color instanceof String) && color.indexOf('rgb') === 0;
}

export function isHexString(color){
    return (typeof color === 'string' || color instanceof String) && color[0] === '#';
}

const regexRgbaStrElements = /\(([^)]+)\)/;

function HSBToRGBF(hsb){
    const hue = hsb[0];
    const saturation = hsb[1] / 100;
    const brightness = hsb[2] / 100;

    const hs = hue / 60;
    const i = Math.floor(hs);
    const f = hs - i;
    const p = brightness * (1.0 - saturation);
    const q = brightness * (1.0 - saturation * f);
    const t = brightness * (1.0 - saturation * (1.0 - f));

    let r,g,b;
    switch(i){
        case 0:r = brightness;g = t;b = p;break;
        case 1:r = q;g = brightness;b = p;break;
        case 2:r = p;g = brightness;b = t;break;
        case 3:r = p;g = q;b = brightness;break;
        case 4:r = t;g = p;b = brightness;break;
        default:r = brightness;g = p;b = q;break;
    }

    return [r,g,b];
}

function RGBFToHSB(rgbf){
    const r = rgbf[0];
    const g = rgbf[1];
    const b = rgbf[2];
    const cmax = Math.max(r,g,b);
    const cmin = Math.min(r,g,b);
    const brightness = cmax;
    let saturation;
    let hue;
    if(cmax !== 0){
        saturation = (cmax - cmin) / cmax;
    } else {
        saturation = 0;
    }
    if(saturation === 0){
        hue = 0;
    } else {
        const rc = (cmax - r) / (cmax - cmin);
        const gc = (cmax - g) / (cmax - cmin);
        const bc = (cmax - b) / (cmax - cmin);
        if(r === cmax){
            hue = bc - gc;
        } else if(g === cmax){
            hue = 2.0 + rc - bc;
        } else {
            hue = 4.0 + gc - rc;
        }
        hue = hue / 6.0;
        if(hue < 0.0){
            hue += 1.0;
        }
    }
    return [Math.floor(hue * 360),Math.floor(saturation * 100),Math.floor(brightness * 100)];
}

/*--------------------------------------------------------------------------------------------------------------------*/
// Color-Picker
/*--------------------------------------------------------------------------------------------------------------------*/

export default class ColorPicker{
    constructor(){
        if(ColorPicker.__shared){
            throw new Error('ColorPicker already initialized.');
        }
        this._state = {
            x : 0,
            y : 0,
            enabled : false,
            dragging : false,
            draggingColorSpace : false,
            draggingColorHue : false,
            colorMode : 'hsb',
            colorHSB : [0,0,100],
            colorRGB : [255,255,255],
            colorCompareLeft : '#ffffff',
            colorCompareRight : '#ffffff',
            pickCallback : noop
        };

        //element root
        this._element = createHtml(template);
        this._elementHead = this._element.querySelector('.panel-head');
        //elements color space
        this._elementColorSpace = this._element.querySelector('.color-space-slider');
        this._elementColorSpaceHandle = this._elementColorSpace.querySelector('.color-slider');
        this._canvasColorSpace = this._elementColorSpace.querySelector('canvas');
        this._ctxColorSpace = this._canvasColorSpace.getContext('2d');
        this._imgDataColorSpace = this._ctxColorSpace.createImageData(this._canvasColorSpace.width,this._canvasColorSpace.height);
        //elements color hue
        this._elementColorHue = this._element.querySelector('.color-hue-slider');
        this._elementColorHueHandle = this._elementColorHue.querySelector('.color-slider');
        this._canvasColorHue = this._elementColorHue.querySelector('canvas');
        //element inputs
        this._elementColorCompareLeft = this._element.querySelector('.color-compare-left');
        this._elementColorCompareRight = this._element.querySelector('.color-compare-right');
        this._elementColorInput = this._element.querySelector('.color-input');
        this._elementColorComponents = this._element.querySelector('.color-components ul');
        this._elementColorCompHSBH = this._elementColorComponents.children[0].children[1];
        this._elementColorCompHSBS = this._elementColorComponents.children[2].children[1];
        this._elementColorCompHSBB = this._elementColorComponents.children[4].children[1];
        this._elementColorCompRGBR = this._elementColorComponents.children[1].children[1];
        this._elementColorCompRGBG = this._elementColorComponents.children[3].children[1];
        this._elementColorCompRGBB = this._elementColorComponents.children[5].children[1];
        //element controls
        this._elementBtnPick = this._element.querySelector('.btn-pick');
        this._elementBtnCancel = this._element.querySelector('.btn-cancel');

        //render slider hue initial
        {
            const ctx = this._canvasColorHue.getContext('2d');
            const width = this._canvasColorHue.width;
            const height = this._canvasColorHue.height;
            const imgData = ctx.createImageData(width,height);

            for(let y = 0; y < height; ++y){
                for(let x = 0; x < width; ++x){
                    const index = (y * width + x) * 4;
                    const rgb = HSBToRGBF([(1.0 - y / (height - 1)) * 360, 100.0, 100.0]);
                    imgData.data[index]   = Math.floor(rgb[0] * 255.0);
                    imgData.data[index+1] = Math.floor(rgb[1] * 255.0);
                    imgData.data[index+2] = Math.floor(rgb[2] * 255.0);
                    imgData.data[index+3] = 255.0;
                }
            }

            ctx.putImageData(imgData,0,0);
        }

        //prevent text-selection while dragging
        const disableUserSelect = ()=>{
            this._element.parentNode.classList.add('non-selectable');
        };
        const enableUserSelect = ()=>{
            this._element.parentNode.classList.remove('non-selectable');
        };

        //input listeners color space
        const setColorSpaceValue = (x,y)=>{
            const rect = this._canvasColorSpace.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
            const x_ = Math.max(0,Math.min(x - rect.left,width) / width);
            const y_ = 1.0 - Math.max(0,Math.min(y - rect.top,height) / height);
            this._state.colorHSB[1] = Math.floor(x_ * 100.0);
            this._state.colorHSB[2] = Math.floor(y_ * 100.0);
            this._state.colorMode = 'hsb';
            this.sync();
        };
        const onColorSpaceMouseDown = (e)=>{
            this._state.draggingColorSpace = true;
            setColorSpaceValue(e.pageX,e.pageY);
            disableUserSelect();
        };
        const onColorSpaceMouseMove = (e)=>{
            if(!this._state.draggingColorSpace){
                return;
            }
            setColorSpaceValue(e.pageX,e.pageY);
        };
        const onColorSpaceMouseUp = (e)=>{
            if(!this._state.draggingColorSpace){
                return;
            }
            this._state.draggingColorSpace = false;
            setColorSpaceValue(e.pageX,e.pageY);
            enableUserSelect();
        };
        this._elementColorSpace.addEventListener('mousedown',onColorSpaceMouseDown);
        document.addEventListener('mousemove',onColorSpaceMouseMove);
        document.addEventListener('mouseup',onColorSpaceMouseUp);

        //input listeners color hue
        const setColorHueValue = (y)=>{
            const rect = this._canvasColorHue.getBoundingClientRect();
            const height = rect.height;
            const y_ = 1.0 - Math.max(0,Math.min(y - rect.top,height) / height);
            this._state.colorHSB[0] = Math.floor(y_ * 360.0);
            this._state.colorMode = 'hsb';
            this.sync();
        };
        const onColorHueMouseDown = (e)=>{
            this._state.draggingColorHue = true;
            setColorHueValue(e.pageY);
            disableUserSelect();
        };
        const onColorHueMouseMove = (e)=>{
            if(!this._state.draggingColorHue){
                return;
            }
            setColorHueValue(e.pageY);
        };
        const onColorHueMouseUp = (e)=>{
            if(!this._state.draggingColorHue){
                return;
            }
            this._state.draggingColorHue = false;
            setColorHueValue(e.pageY);
            enableUserSelect();
        };
        this._elementColorHue.addEventListener('mousedown',onColorHueMouseDown);
        document.addEventListener('mousemove',onColorHueMouseMove);
        document.addEventListener('mouseup',onColorHueMouseUp);

        const self = this;
        this._elementColorCompHSBH.addEventListener('input',function(){
            this.value = Math.min(Math.max(this.min,+this.value),this.max);
            self.colorHue = this.value;
        });
        this._elementColorCompHSBS.addEventListener('input',function(){
            this.value = Math.min(Math.max(this.min,+this.value),this.max);
            self.colorSaturation = this.value;
        });
        this._elementColorCompHSBB.addEventListener('input',function(){
            this.value = Math.min(Math.max(this.min,+this.value),this.max);
            self.colorBrightness = this.value;
        });
        this._elementColorCompRGBR.addEventListener('input',function(){
            this.value = Math.min(Math.max(this.min,+this.value),this.max);
            self.colorR = this.value;
        });
        this._elementColorCompRGBG.addEventListener('input',function(){
            this.value = Math.min(Math.max(this.min,+this.value),this.max);
            self.colorG = this.value;
        });
        this._elementColorCompRGBB.addEventListener('input',function(){
            this.value = Math.min(Math.max(this.min,+this.value),this.max);
            self.colorB = this.value;
        });

        this._elementBtnPick.addEventListener('click',()=>{
            this._state.pickCallback({color:this._state.colorRGB});
            this.close();
        });
        this._elementBtnCancel.addEventListener('click',()=>{
            this.close();
        });

        //picker positioning drag
        let offsetX = 0;
        let offsetY = 0;
        const setPositionOffseted = (x,y)=>{
            this.x = x - offsetX;
            this.y = y - offsetY;
        };
        const onPanelMouseDown = (e)=>{
            this._state.dragging = true;
            const rect = this._element.getBoundingClientRect();
            offsetX = e.pageX - rect.left;
            offsetY = e.pageY - rect.top;
        };
        const onPanelMouseMove = (e)=>{
            if(!this._state.dragging){
                return;
            }
            setPositionOffseted(e.pageX,e.pageY);
        };
        const onPanelMouseUp = (e)=>{
            if(!this._state.dragging){
                return;
            }
            this._state.dragging = false;
            setPositionOffseted(e.pageX,e.pageY);
        };
        this._elementHead.addEventListener('mousedown',onPanelMouseDown);
        document.addEventListener('mousemove',onPanelMouseMove);
        document.addEventListener('mouseup',onPanelMouseUp);

        //handle position on resize
        const onWindowResize = ()=>{
            this.x = this.x;
            this.y = this.y;
        };
        window.addEventListener('resize',onWindowResize);

        this._removeEventListeners = function(){
            document.removeEventListener('mousemove',onColorSpaceMouseMove);
            document.removeEventListener('mouseup',onColorSpaceMouseUp);
            document.removeEventListener('mousemove',onColorHueMouseMove);
            document.removeEventListener('mouseup',onColorHueMouseUp);
            document.removeEventListener('mousemove',onPanelMouseMove);
            document.removeEventListener('mouseup',onPanelMouseUp);
            window.removeEventListener('resize',onWindowResize);
        };

        //render initial
        this._elementColorCompareLeft.style.background = this._state.colorCompareLeft;
        this._elementColorCompareRight.style.background = this._state.colorCompareRight;
        this.sync();
    }

    _removeEventListeners(){};

    /**
     * Returns the color-pickers x position.
     * @param value
     */
    set x(value){
        this._state.x = Math.max(0,Math.min(value,window.innerWidth - this.width));
        this._element.style.left = this._state.x + 'px';
    }

    /**
     * Returns the color-pickers current x position.
     * @return {number}
     */
    get x(){
        return this._state.x;
    }

    /**
     * Sets the color-pickers y position.
     * @param value
     */
    set y(value){
        this._state.y = Math.max(0,Math.min(value,window.innerHeight - this.height));
        this._element.style.top = this._state.y + 'px';
    }

    /**
     * Returns the color-pickers current y position.
     * @return {number}
     */
    get y(){
        return this._state.y;
    }

    /**
     * Returns the with of the color-picker.
     * @return {*|number}
     */
    get width(){
        return this._element.offsetWidth;
    }

    /**
     * Returns the height of the color-picker.
     * @return {*|number}
     */
    get height(){
        return this._element.offsetHeight;
    }

    /**
     * Opens the color-picker.
     * @param config
     */
    open(config){
        this._state.enabled = true;
        this._state.pickCallback = config.onPick || noop;
        this._element.classList.remove('hide');
    }

    /**
     * Closes the color-picker.
     */
    close(){
        this._state.enabled = false;
        this._element.classList.add('hide');
    }

    sync(){
        let hsb,rgb;

        switch(this._state.colorMode){
            case 'hsb':{
                hsb = this._state.colorHSB;
                const rgbf = HSBToRGBF(hsb);
                rgb = this._state.colorRGB = [Math.floor(rgbf[0] * 255.0),Math.floor(rgbf[1] * 255.0),Math.floor(rgbf[2] * 255.0)]
            }break;
            case 'rgb':
                rgb = this._state.colorRGB;
                hsb = RGBFToHSB([rgb[0] / 255.0,rgb[1] / 255.0,rgb[2] / 255.0]);
                this._state.colorHSB = hsb;
            break;
        }

        //update handles
        this._elementColorSpaceHandle.style.left = hsb[1] / 100.0 * this._canvasColorSpace.offsetWidth + 'px';
        this._elementColorSpaceHandle.style.top = (1.0 - hsb[2] / 100.0) * this._canvasColorSpace.offsetHeight + 'px';
        this._elementColorHueHandle.style.top = (1.0 - hsb[0] / 360.0) * this._canvasColorHue.offsetHeight + 'px';


        //update display
        const width = this._canvasColorSpace.width;
        const height = this._canvasColorSpace.height;
        const imgData = this._imgDataColorSpace;
        for(let y = 0; y < height; ++y){
            for(let x = 0; x < width; ++x){
                const index = (y * width + x) * 4;
                const rgb = HSBToRGBF([
                    hsb[0],
                    x / width * 100,
                    (1.0 - y / height) * 100
                ]);
                imgData.data[index]   = Math.floor(rgb[0] * 255.0);
                imgData.data[index+1] = Math.floor(rgb[1] * 255.0);
                imgData.data[index+2] = Math.floor(rgb[2] * 255.0);
                imgData.data[index+3] = 255.0;
            }
        }
        this._ctxColorSpace.putImageData(imgData,0,0);

        //update components
        const hex = this.colorHEX;
        this._elementColorCompHSBH.value = hsb[0];
        this._elementColorCompHSBS.value = hsb[1];
        this._elementColorCompHSBB.value = hsb[2];
        this._elementColorCompRGBR.value = rgb[0];
        this._elementColorCompRGBG.value = rgb[1];
        this._elementColorCompRGBB.value = rgb[2];
        this._elementColorInput.value = hex;
        this._elementColorCompareLeft.style.background = hex;
    }

    /**
     * Sets the color r component.
     * @param value
     */
    set colorR(value){
        const rgb = this.colorRGB;
        this.colorRGB = [value,rgb[1],rgb[2]];
    };

    /**
     * Returns the current color r component.
     * @return {number}
     */
    get colorR(){
        return this.colorRGB[0];
    };

    /**
     * Sets the color g component.
     * @param value
     */
    set colorG(value){
        const rgb = this.colorRGB;
        this.colorRGB = [rgb[0],value,rgb[2]];
    };

    /**
     * Returns the current color g component.
     * @return {number}
     */
    get colorG(){
        return this.colorRGB[1];
    };

    /**
     * Sets the color b component.
     * @param value
     */
    set colorB(value){
        const rgb = this.colorRGB;
        this.colorRGB = [rgb[0],rgb[1],value];
    };

    /**
     * Returns the current color b component.
     * @return {number}
     */
    get colorB(){
        return this.colorRGB[2];
    };

    /**
     * Sets the color from rgb components.
     * @param value
     */
    set colorRGB(value){
        this._state.colorMode = 'rgb';
        this._state.colorRGB = value;
        this.sync();
    };

    /**
     * Returns the current color value in rgbf [1,1,1] representation.
     * @returns {number[]}
     */
    get colorRGB(){
        const rgbf = HSBToRGBF(this._state.colorHSB);
        return [Math.floor(rgbf[0] * 255.0),Math.floor(rgbf[1] * 255.0),Math.floor(rgbf[2] * 255.0)]
    };

    /**
     * Sets the color from rgb string.
     * @param value
     */
    set colorRGBString(value){
        if(!isRgbaString(value)){
            throw new Error("Input string not using 'rgb(r,g,b)' or 'rgba(r,g,b,a) format.'");
        }
        const raw = regexRgbaStrElements.exec(value);
        const elements = raw[1].split(',');
        this.colorRGB = [+elements[0],+elements[1],+elements[2]];
    };

    /**
     * Returns the current color value in rgb string rgb(255,255,255) representation.
     * @returns {string}
     */
    get colorRGBString(){
        const rgb = this.colorRGB;
        return `rgb(${rgb[0] / 255.0},${rgb[1] / 255.0},${rgb[2] / 255.0})`;
    };

    /**
     * Sets the color from hsb.
     * @param value
     */
    set colorHSB(value){
        this._state.colorMode = 'hsb';
        this._state.colorHSB = value;
        this.sync();
    };

    /**
     * Returns the current color value in hsb [hue,saturation,brightness] representation.
     * @returns {number[]}
     */
    get colorHSB(){
        return this._state.colorHSB.slice(0);
    };

    /**
     * Sets the current color hsb hue component.
     * @param value
     */
    set colorHue(value){
        this._state.colorHSB[0] = value;
        this.colorHSB = this._state.colorHSB;
    };

    /**
     * Returns the current color hsb hue component.
     * @returns {number}
     */
    get colorHue(){
        return this._state.colorHSB[0];
    };

    /**
     * Sets the current color hsb saturation component.
     * @param value
     */
    set colorSaturation(value){
        this._state.colorHSB[1] = value;
        this.colorHSB = this._state.colorHSB;
    };

    /**
     * Returns the current color hsb saturation value.
     * @returns {number}
     */
    get colorSaturation(){
        return this._state.colorHSB[1];
    };

    /**
     * Set the color hsb brightness component.
     * @param value
     */
    set colorBrightness(value){
        this._state.colorHSB[2] = value;
        this.colorHSB = this._state.colorHSB;
    };

    /**
     * Returns the current color hsb brightness component.
     * @returns {number}
     */
    get colorBrightness(){
        return this._state.colorHSB[2];
    };

    /**
     * Sets the color in hex format.
     * @param value
     */
    set colorHEX(value){
        let hex = CSSColorStringMap[value] || CSSColorStringMap[value.toUpperCase()] || value;
        hex = hex.substring(1);
        hex = hex.length === 3 ? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}` : hex;
        this.colorRGB = [
            parseInt(hex.substring(0, 2), 16),
            parseInt(hex.substring(2, 4), 16),
            parseInt(hex.substring(4, 6), 16)
        ];
    };

    /**
     * Returns the current color value in hex #ffffff format.
     * @returns {string}
     */
    get colorHEX(){
        const rgb = this.colorRGB;
        return `#${((rgb[0] | rgb[1] << 8 | rgb[2] << 16) | 1 << 24).toString(16).slice(1)}`;
    };

    /**
     * Sets the color in rgbf format.
     * @param value
     */
    set colorRGBF(value){
        this.colorHSB = RGBFToHSB(value);
    };

    /**
     * Returns the current color value in rgbf [1,1,1] format.
     * @returns {number[]}
     */
    get colorRGBF(){
        return HSBToRGBF(this._state.colorHSB);
    };

    /**
     * Returns the underlying HTMLElement.
     * @returns {HTMLElement}
     */
    get element(){
        return this._element;
    }

    /**
     * Returns a reference to the current color picker.
     * @return {ColorPicker|null}
     */
    static sharedPicker(){
        if(!ColorPicker.__shared){
            ColorPicker.__shared = new ColorPicker();
        }
        return ColorPicker.__shared;
    }

    static dispose(){
        ColorPicker.__shared._removeEventListeners();
        ColorPicker.__shared = null;
    }
}

ColorPicker.__shared = null;