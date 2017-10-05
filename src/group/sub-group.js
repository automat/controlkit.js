import AbstractGroup from './abstract-group';
import validateOption from 'validate-option';
import validateType from '../util/validate-type';
import validateDescription from '../util/validate-description';
import createObjectPartial from '../util/create-object-partial';
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

const ComponentByTypeName = {};
ComponentByTypeName[Button.typeName] = Button;
ComponentByTypeName[Number_.typeName] = Number_;
ComponentByTypeName[String_.typeName] = String_;
ComponentByTypeName[Checkbox.typeName] = Checkbox;
ComponentByTypeName[Select.typeName] = Select;
ComponentByTypeName[Text.typeName] = Text;
ComponentByTypeName[Label.typeName] = Label;
ComponentByTypeName[Slider.typeName] = Slider;
ComponentByTypeName[Range.typeName] = Range;
ComponentByTypeName[Color.typeName] = Color;
ComponentByTypeName[Canvas.typeName] = Canvas;
ComponentByTypeName[Svg.typeName] = Svg;
ComponentByTypeName[Image_.typeName] = Image_;
ComponentByTypeName[FunctionPlotter.typeName] = FunctionPlotter;

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

    destroy(){
        for(const component of this._components){
            component.destroy();
        }
        this.parent.remove(this);
        super.destroy();
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

    /*----------------------------------------------------------------------------------------------------------------*/
    // Component Modifier
    /*----------------------------------------------------------------------------------------------------------------*/

    /**
     * Adds a component
     * @param config
     * @return {SubGroup}
     */
    add(config){
        const type = config.type;
        if(!ComponentByTypeName[type]){
            throw new Error(`Invalid component type "${type}"`);
        }

        // extract component config
        config = createObjectPartial(config,['type']);

        // create component
        let component = null;
        switch(type){
            // Button
            case Button.typeName:
                const name = config.name;
                config = createObjectPartial(config,['name']);
                component = new Button(this,name,config);
                break;

            // Text
            case Text.typeName:
                const title = config.title;
                const text = config.text;
                component = new Text(title,text);
                break;

            // Label
            case Label.typeName:
                const label = config.label;
                component = new Label(this,label);
                break;

            // Image
            case Image_.typeName:
                const image = config.image;
                config = createObjectPartial(config,['image']);
                component = new Image_(this,image,config);
                break;

            // Pad. Canvas, Svg, config only
            case Pad.typeName:
            case Canvas.typeName:
            case Svg.typeName:
                component = new ComponentByTypeName[type](this,config);
                break;

            // All Component with default init scheme (object,key,config)
            default:
                const object = config.object;
                const key = config.key;
                config = createObjectPartial(config,['object','key']);
                component = new ComponentByTypeName[type](this,object,key,config);
        }

        // add component
        this._components.push(component);
        component.labelRatio = this._labelRatio;
        component.on('size-change',()=>{
            this.updateHeight();
        });
        this.updateHeight();

        // return root
        return this;
    }

    /**
     * Removes a component.
     * @param component
     * @return {SubGroup}
     */
    remove(component){
        const index = this._components.indexOf(component);
        if(index === -1){
            throw new Error('Invalid component. Component not part of sub-group.');
        }
        this._elementList.removeChild(component.element);
        this._components.splice(index,1);
        this.emit('size-change');
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
}