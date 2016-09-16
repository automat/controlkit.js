import AbstractGroup from './AbstractGroup';
import validateOption from 'validate-option';
import createHtml from '../util/createHtml';

import ObjectComponent from '../component/ObjectComponent';
import Button from '../component/Button';
import Number_ from '../component/Number';
import String_ from  '../component/String';
import Checkbox from  '../component/Checkbox';
import Select from '../component/Select';
import Text from '../component/Text';
import Label from '../component/Label';
import Slider from '../component/Slider';

const template =
    `<li class="sub-group">
        <div class="sub-group-head">
            <label>sub-group</label>
            <button class="btn-close"></button>
        </div>
        <ul class="component-list"></ul>
    </li>`;

const DefaultConfig = Object.freeze({
    label  : null,
    enable : true,
    height : null
});

export default class SubGroup extends AbstractGroup{
    constructor(parent,config){
        config = validateOption(config,DefaultConfig);
        super(parent,{
            label  : config.label,
            enable : config.enable,
            height : config.height
        });

        this._components = [];

        this._element = createHtml(template);
        this._elementHead  = this._element.querySelector('.sub-group-head');
        this._elementLabel = this._element.querySelector('label');
        this._elementList  = this._element.querySelector('.component-list');

        this._elementHead.addEventListener('mousedown',()=>{
            this.enable = !this.enable;
        });

        this.label = this._state.label;
        this.enable = this._state.enable;
    }

    _addComponent(component){
        this._components.push(component);
        this._elementList.appendChild(component.element);
        this.emit('size-change');
        return this;
    }

    addButton(name,config){
        return this._addComponent(new Button(this,name,config));
    }

    addNumber(object,key,config){
        return this._addComponent(new Number_(this,object,key,config));
    }

    addString(object,key,config){
        return this._addComponent(new String_(this,object,key,config));
    }

    addCheckbox(object,key,config){
        return this._addComponent(new Checkbox(this,object,key,config));
    }

    addSelect(object,key,config){
        return this._addComponent(new Select(this,object,key,config));
    }

    addText(title,text){
        return this._addComponent(new Text(this,title,text));
    }

    addLabel(label){
        return this._addComponent(new Label(this,label));
    }

    addSlider(object,key,config){
        return this._addComponent(new Slider(this,object,key,config));
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