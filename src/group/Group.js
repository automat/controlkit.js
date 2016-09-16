import AbstractGroup from './AbstractGroup';
import validateOption from 'validate-option';
import createHtml from '../util/createHtml';

import SubGroup from './SubGroup';

const template =
    `<li class="group">
        <div class="group-head">
            <label></label>
        </div>
        <ul class="sub-group-list"></ul>
    </li>`;

const DefaultConfig = Object.freeze({
    label  : null,
    labelRatio : null,
    enable : true,
    height : null
});

export default class Group extends AbstractGroup{
    constructor(parent,config){
        config = validateOption(config,DefaultConfig);
        super(parent,{
            label  : config.label,
            labelRatio : config.labelRatio,
            enable : config.enable,
            height : config.height
        });

        this._state.labelRatio = config.labelRatio;

        this._element = createHtml(template);
        this._elementHead  = this._element.querySelector('.group-head');
        this._elementLabel = this._element.querySelector('label');
        this._elementList  = this._element.querySelector('.sub-group-list');

        this._groups = [];

        this._elementHead.addEventListener('mousedown',()=>{
            this.enable = !this.enable;
        });

        this.label = this._state.label;
        this.enable = this._state.enable;
        this.componentLabelRatio = this._state.labelRatio;
    }

    /**
     * Sets the groups global label / component width ratio.
     * @param value
     */
    set componentLabelRatio(value){
        super.componentLabelRatio = value;
        for(const group of this._groups){
            group.componentLabelRatio = value;
        }
    }

    _backSubGroupValid(){
        if(this._groups.length == 0){
            this.addSubGroup();
        }
        return this._groups[this._groups.length - 1];
    }

    addSubGroup(config){
        const group = new SubGroup(this,config);
        group.componentLabelRatio = this._state.labelRatio;
        this._groups.push(group);
        group.on('size-change',()=>{this.emit('size-change');});
        return this;
    }

    addButton(name,config){
        this._backSubGroupValid().addButton(name,config);
        return this;
    }

    addNumber(object,key,config){
        this._backSubGroupValid().addNumber(object,key,config);
        return this;
    }

    addString(object,key,config){
        this._backSubGroupValid().addString(object,key,config);
        return this;
    }

    addCheckbox(object,key,config){
        this._backSubGroupValid().addCheckbox(object,key,config);
        return this;
    }

    addSelect(object,key,config){
        this._backSubGroupValid().addSelect(object,key,config);
        return this;
    }

    addText(title,text){
        this._backSubGroupValid().addText(title,text);
        return this;
    }

    addLabel(label){
        this._backSubGroupValid().addLabel(label);
        return this;
    }

    addSlider(object,key,config){
        this._backSubGroupValid().addSlider(object,key,config);
        return this;
    }

    sync(){
        for(const group of this._groups){
            group.sync();
        }
    }

    clear(){
        for(const group in this._groups){
            group.clear();
        }
        this._groups = [];
        super.clear();
    }

}