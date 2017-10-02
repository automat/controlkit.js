import AbstractGroup from './abstract-group';
import validateOption from 'validate-option';
import validateType from '../util/validate-type';
import validateDescription from '../util/validate-description';
import createHtml from '../util/create-html';

import ObjectComponent from '../component/object-component';

//Components
import Button,{DefaultConfig as ButtonDefaultConfig} from '../component/button';
import Number_,{DefaultConfig as NumberDefaultConfig} from '../component/number';
import String_,{DefaultConfig as StringDefaultConfig} from  '../component/string';
import Checkbox,{DefaultConfig as CheckboxDefaultConfig} from  '../component/checkbox';
import Select,{DefaultConfig as SelectDefaultConfig} from '../component/select';
import Text from '../component/text';
import Label,{DefaultConfig as LabelDefaultConfig} from '../component/label';
import Slider,{DefaultConfig as SliderDefaultConfig} from '../component/slider';
import Range, {DefaultConfig as RangeDefaultConfig} from '../component/range';
import Color,{DefaultConfig as ColorDefaultConfig} from '../component/color';
import Pad,{DefaultConfig as PadDefaultConfig} from '../component/pad';
import Canvas,{DefaultConfig as CanvasDefaultConfig} from '../component/canvas';
import Svg, {DefaultConfig as SvgDefaultConfig} from '../component/svg';
import Image_,{DefaultConfig as ImageDefaultConfig} from '../component/image';
import FunctionPlotter, {DefaultConfig as FunctionPlotterConfig} from '../component/function-plotter';

/*--------------------------------------------------------------------------------------------------------------------*/
// Template / Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

const template =
    `<li class="sub-group">
        <div class="sub-group-head">
            <label>sub-group</label>
            <button class="btn-close"></button>
        </div>
        <ul class="component-list"></ul>
    </li>`;

export const DefaultConfig = Object.freeze({
    id : null,
    label  : null,
    labelRatio : null,
    enable : true,
    height : null
});

/*--------------------------------------------------------------------------------------------------------------------*/
// SubGroup
/*--------------------------------------------------------------------------------------------------------------------*/

export default class SubGroup extends AbstractGroup{
    constructor(parent,config){
        config = validateOption(config,DefaultConfig);
        super(parent,{
            id : config.id,
            label  : config.label,
            labelRatio : config.labelRatio,
            enable : config.enable,
            height : config.height
        });

        // state
        this._components = [];

        // node
        this._element = this._parent.elementList.appendChild(createHtml(template));
        this._elementHead  = this._element.querySelector('.sub-group-head');
        this._elementLabel = this._element.querySelector('label');
        this._elementList  = this._element.querySelector('.component-list');
        this._scrollContainer.target = this._elementList;

        // listener
        this._elementHead.addEventListener('mousedown',()=>{
            this.enable = !this.enable;
        });

        // state initial
        this.label = this._label;
        this.enable = this._enable;
        this.componentLabelRatio = this._labelRatio;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // Query Elements
    /*----------------------------------------------------------------------------------------------------------------*/

    /**
     * Return the underlying control kit instance.
     * @return {*}
     */
    get root(){
        return this._parent.parent.root;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // Appearance Modifier
    /*----------------------------------------------------------------------------------------------------------------*/

    /**
     * Forces height update from content.
     */
    updateHeight(){
        const height = this._maxHeight ?
                       Math.min(this._elementList.offsetHeight,this._maxHeight) :
                       this._elementList.offsetHeight;
        this._scrollContainer.setHeight(height);
    }

    /**
     * Sets the groups global label / component width ratio.
     * @param value
     */
    set componentLabelRatio(value){
        super.componentLabelRatio = value;
        for(const component of this._components){
            component.labelRatio = value;
        }
        this.emit('size-change');
    }

    _addComponent(component){
        this._components.push(component);
        component.labelRatio = this._labelRatio;
        component.on('size-change',()=>{
            this.updateHeight();
        });
        this.updateHeight();
        return this;
    }

    /**
     * Removes a component from the sub-group.
     * @param component
     * @return {SubGroup}
     * @private
     */
    _removeComponent(component){
        const index = this._components.indexOf(component);
        if(index == -1){
            throw new Error('Invalid component. Component not part of sub-group.');
        }
        this._elementList.removeChild(component.element);
        this._components.splice(index,1);
        this.emit('size-change');
        return this;
    }

    /**
     * Adds a button component.
     * @param name
     * @param [config - Button configuration]
     * @param [config.label]
     * @param [config.onChange]
     * @returns {*}
     */
    addButton(name,config){
        return this._addComponent(new Button(this,name,config));
    }

    /**
     * Adds a number component.
     * @param object
     * @param key
     * @param [config]
     * @param [config.label]
     * @param [config.readonly]
     * @param [config.preset]
     * @param [config.min]
     * @param [config.max]
     * @param [config.fd]
     * @param [config.step]
     * @param [config.onChange]
     * @param [config.annotation]
     * @returns {*}
     */
    addNumber(object,key,config){
        return this._addComponent(new Number_(this,object,key,config));
    }

    /**
     * Adds a string component.
     * @param object
     * @param key
     * @param [config]
     * @param [config.label]
     * @param [config.readonly]
     * @param [config.multiline]
     * @param [config.maxLines]
     * @param [config.preset]
     * @param [config.onChange]
     * @param [config.annotation]
     * @returns {*}
     */
    addString(object,key,config){
        return this._addComponent(new String_(this,object,key,config));
    }

    /**
     * Adds a checkbox component.
     * @param object
     * @param key
     * @param [config]
     * @param [config.label]
     * @param [config.onChange]
     * @param [config.annotation]
     * @returns {*}
     */
    addCheckbox(object,key,config){
        return this._addComponent(new Checkbox(this,object,key,config));
    }

    /**
     * Adds a select component.
     * @param object
     * @param key
     * @param [config]
     * @param [config.label]
     * @param [config.onChange]
     * @param [config.annotation]
     * @returns {*}
     */
    addSelect(object,key,config){
        return this._addComponent(new Select(this,object,key,config));
    }

    /**
     * Adds a text component.
     * @param title
     * @param text
     * @returns {*}
     */
    addText(title,text){
        return this._addComponent(new Text(this,title,text));
    }

    /**
     * Adds a label component.
     * @param label
     * @param config
     * @returns {*}
     */
    addLabel(label,config){
        return this._addComponent(new Label(this,label,config));
    }

    /**
     * Adds a slider component.
     * @param object
     * @param key
     * @param [config]
     * @param [config.label]
     * @param [config.labelRatio]
     * @param [config.fd]
     * @param [config.step]
     * @param [config.range]
     * @param [config.numberInput]
     * @param [config.onChange]
     * @param [config.annotation]
     * @returns {*}
     */
    addSlider(object,key,config){
        return this._addComponent(new Slider(this,object,key,config));
    }

    /**
     * Adds a range component.
     * @param object
     * @param key
     * @param [config]
     * @param [config.label]
     * @param [config.labelRatio]
     * @param [config.fd]
     * @param [config.step]
     * @param [config.range]
     * @param [config.numberInput]
     * @param [config.onChange]
     * @param [config.annotation]
     * @return {*}
     */
    addRange(object,key,config){
        return this._addComponent(new Range(this,object,key,config));
    }

    addColor(object,key,config){

    }

    addPad(object,key,config){
        return this._addComponent(new Pad(this,object,key,config));
    }

    addCanvas(config){
        return this._addComponent(new Canvas(this,config));
    }

    addSvg(config){
        return this._addComponent(new Svg(this,config));
    }

    addImage(image,config){
        return this._addComponent(new Image_(this,image,config));
    }

    addFunctionPlotter(object,key,config){
        return this._addComponent(new FunctionPlotter(this,object,key,config));
    }

    /**
     * Adds components from description.
     * @param description
     * @return {SubGroup}
     *
     * @example
     * //single component
     * subGroup.add({type:'number', object:obj, key:'propertyKey'});
     *
     * @example
     * //multiple components
     * subGroup.add([
     *     {type:'number', object:obj, key:'propertyKey'},
     *     {type:'number', object:obj, key:'propertyKey'}
     * ]);
     *
     */
    add(description){
        if(description instanceof Array){
            for(const item of description){
                this.add(item);
            }
            return this;
        }
        if(!description.type){
            throw new Error('Invalid component description. Component type missing.');
        }
        switch(description.type){
            case Button.typeName:{
                const config = validateDescription(description,ButtonDefaultConfig,['type','name']);
                this.addButton(description.name,config);
            }break;
            case Number_.typeName:{
                const config = validateDescription(description,NumberDefaultConfig,['type','object','key']);
                this.addNumber(description.object,description.key,config);
            }break;
            case String_.typeName:{
                const config = validateDescription(description,StringDefaultConfig,['type','object','key']);
                this.addString(description.object,description.key,config);
            }break;
            case Slider.typeName:{
                const config = validateDescription(description,SliderDefaultConfig,['type','object','key']);
                this.addSlider(description.object,description.key,config);
            }break;
            case Checkbox.typeName:{
                const config = validateDescription(description,CheckboxDefaultConfig,['type','object','key']);
                this.addCheckbox(description.object,description.key,config);
            }break;
            case Select.typeName:{

            }break;
            case Text.typeName:{

            }break;
            case Label.typeName:{
                const config = validateDescription(description,LabelDefaultConfig,['type']);
                this.addLabel(config.label);
            }break;
            case Pad.typeName:{
                const config = validateDescription(description,PadDefaultConfig,['type','object','key']);
                this.addPad(description.object,description.key,config);
            }break;
            case Canvas.typeName:{
                const config = validateDescription(description,CanvasDefaultConfig,['type']);
                this.addCanvas(config);
            }break;
            case Image_.typeName:{
                const config = validateDescription(description,ImageDefaultConfig,['type','image']);
                this.addImage(description.image,config);
            }break;
            case FunctionPlotter.typeName:{
                const config = validateDescription(description,FunctionPlotterConfig,['type','object','key']);
                this.addFunctionPlotter(description.object,description.key,config);
            }break;
            default:
                throw new Error(`Invalid component type "${description.type}".`);
        }
        return this;
    }

    sync(){
        for(const component of this._components){
            if(!component instanceof ObjectComponent){
                continue;
            }
            component.sync();
        }
    }

    destroy(){
        for(const component of this._components){
            component.destroy();
        }
        super.destroy();
    }
}