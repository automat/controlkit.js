import AbstractGroup from './AbstractGroup';
import validateOption from 'validate-option';
import createHtml from '../util/create-html';

import ObjectComponent from '../component/ObjectComponent';

//Components
import Button from '../component/Button';
import Number_ from '../component/Number';
import String_ from  '../component/String';
import Checkbox from  '../component/Checkbox';
import Select from '../component/Select';
import Text from '../component/Text';
import Label from '../component/Label';
import Slider from '../component/Slider';
import Color from '../component/Color';
import Pad from '../component/Pad';

//Component-Defaults
import {DefaultConfig as ButtonDefaultConfig} from '../component/Button';
import {DefaultConfig as NumberDefaultConfig} from '../component/Number';
import {DefaultConfig as StringDefaultConfig} from '../component/String';
import {DefaultConfig as CheckboxDefaultConfig} from '../component/Checkbox';
import {DefaultConfig as SelectDefaultConfig} from '../component/Select';
import {DefaultConfig as TextDefaultConfig} from '../component/Text';
import {DefaultConfig as LabelDefaultConfig} from '../component/Label';
import {DefaultConfig as SliderDefaultConfig} from '../component/Slider';
import {DefaultConifg as ColorDefaultConfig} from '../component/Color';
import {DefaultConfig as PadDefaultConfig} from '../component/Pad';

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
    label  : null,
    labelRatio : null,
    enable : true,
    height : null
});

/*--------------------------------------------------------------------------------------------------------------------*/
// Validation
/*--------------------------------------------------------------------------------------------------------------------*/

const ComponentConfigs = [
    ButtonDefaultConfig,
    NumberDefaultConfig,
    StringDefaultConfig,
    CheckboxDefaultConfig,
    SelectDefaultConfig,
    TextDefaultConfig,
    LabelDefaultConfig,
    SliderDefaultConfig
];

function validateCompConfigAll(config){
    for(const key in config){
        if(key === 'type' || key === 'object' || key === 'key'){
            continue;
        }
        let valid = false;
        for(const defaults of ComponentConfigs){
            if(defaults[key] !== undefined){
                valid = true;
                break;
            }
        }
        if(!valid){
            throw new Error(`Invalid component config with key "${key}".`);
        }
    }
}

function validateCompConfig(config,defaults){
    const dict = {};
    for(const key in config){
        if(key === 'type' || key === 'object' || key === 'key'){
            continue;
        }
        if(defaults[key] === undefined){
            throw Error(`Invalid component config with key "${key}". Keys available ${Object.keys(defaults).sort((a,b)=>{
                const a_ = a.toLowerCase();
                const b_ = b.toLowerCase();
                return a_ < b_ ? -1 : a_ > b_ ? 1 : 0;
            })}`);
        }
        dict[key] = config[key];
    }
    return dict;
}

/*--------------------------------------------------------------------------------------------------------------------*/
// SubGroup
/*--------------------------------------------------------------------------------------------------------------------*/

export default class SubGroup extends AbstractGroup{
    constructor(parent,config){
        config = validateOption(config,DefaultConfig);
        super(parent,{
            label  : config.label,
            labelRatio : config.labelRatio,
            enable : config.enable,
            height : config.height
        });

        this._element = this._parent.elementList.appendChild(createHtml(template));
        this._elementHead  = this._element.querySelector('.sub-group-head');
        this._elementLabel = this._element.querySelector('label');
        this._elementList  = this._element.querySelector('.component-list');

        this._scrollContainer.target = this._elementList;
        this._components = [];

        this._elementHead.addEventListener('mousedown',()=>{
            this.enable = !this.enable;
        });

        this.label = this._state.label;
        this.enable = this._state.enable;
        this.componentLabelRatio = this._state.labelRatio;
    }

    _updateHeight(){
        if(this._state.maxHeight == null){
            return;
        }
        const height = Math.min(this._elementList.offsetHeight,this._state.maxHeight);
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
        component.labelRatio = this._state.labelRatio;
        component.on('size-change',()=>{
            this._updateHeight();
            this.emit('size-change');
        });
        this._updateHeight();
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
     * @returns {*}
     */
    addLabel(label){
        return this._addComponent(new Label(this,label));
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

    addColor(object,key,config){

    }

    addPad(object,key,config){
        return this._addComponent(new Pad(this,object,key,config));
    }

    _addComponentFromDescription(description){
        if(!description){
            throw new Error('Invalid component description.');
        }
        //check if non-component config passed
        validateCompConfigAll(description);

        //check if enough component type info passed
        let type = description.type;
        if(!type && (!description.object || !description.key)){
            throw new Error('');
        }

        //non-object component creation
        switch(type){
            case 'button':
                return this.addButton(description.name,validateCompConfig(description,ButtonDefaultConfig));
            case 'label':
                return this.addLabel(description.label);
            case 'text':
                return this.addText(description.title,description.text);
        }

        //guess type component from property
        const object = description.object;
        const key = description.key;
        const property = object[key];
        type = type ? ((typeof property === 'number' || property instanceof Number) ? 'number' :
                       (typeof property === 'boolean' || property instanceof Boolean) ? 'boolean' :
                       (typeof property === 'string' || property instanceof String) ? 'string' : null) :
               null;
        if(!type){
            throw new Error(`Invalid property type "${typeof object[key]}"`);
        }

        //create type component
        switch(type){
            case 'number': {
                return this.addNumber(object,key,validateCompConfig(description,NumberDefaultConfig));
            }
            case 'boolean': {
                return this.addCheckbox(object,key,validateCompConfig(description,CheckboxDefaultConfig));
            }
            case 'string' : {
                return this.addString(object,key,validateCompConfig(description,StringDefaultConfig));
            }
        }
    }

    /**
     * Adds components from declaration.
     * @param description_or_descriptions
     * @returns {[]}
     * @example
     * //creates a number component
     * subgroup.add({type:'number',object:obj,key:'property'});
     *
     * //creates a number component with configuration
     * subgroup.add({type:'number',object:obj,key:'property',step:0.1,fd:2});
     *
     * //creates a number component without type specification
     * subgroup.add({object:obj,key:'property',step:0.1,fd:2});
     *
     * //creates multiple components
     * subgroup.add([
     *     {type:'number',object:obj,key:'propertyNumber'},
     *     {type:'string',object,obj,key:'propertyString'},
     *     {type:'button',onChange:()=>{console.log('pressed');},
     *     {type:'text',title:'Title',text:'Some text here'}
     * ]);
     */
    add(description_or_descriptions){
        if(description_or_descriptions instanceof Array){
            const components = new Array(description_or_descriptions.length);
            for(let i = 0; i < components.length; ++i){
                components[i] = this._addComponentFromDescription(description_or_descriptions[i]);
            }
            return components;
        }
        return [this._addComponentFromDescription(description_or_descriptions)];
    }

    sync(){
        for(const component of this._components){
            if(!component instanceof ObjectComponent){
                continue;
            }
            component.sync();
        }
    }

    clear(){
        for(const component in this._components){
            component.clear();
        }
        this._components = [];
        super.clear();
    }
}