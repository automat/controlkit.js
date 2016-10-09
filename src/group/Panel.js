import validateOption from 'validate-option';
import createHtml from '../util/createHtml';
import Group from './Group';
import ScrollContainer from './ScrollContainer';

/*--------------------------------------------------------------------------------------------------------------------*/
// Template / Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

const template =
    `<div class="panel">
        <div class="panel-head">
            <label></label>
            <div class="head-menu">
                <button class="btn-close"></button>
                <button>save</button>
                <button>load</button>
            </div>
        </div>
        <ul class="group-list"></ul>
    </div>`;

/**
 * Panel default config
 * @type {Object}
 * @property {boolean} enabled - If true the panel will be displayed.
 * @property {boolean} fixed - If true the panel can be dragged and moved.
 * @property {number|null} x - The position x value for fixed panels.
 * @property {number|null} y - The position y value for fixed panels.
 * @property {number} width - The width of the panel.
 * @property {number|null} height - The panels maximum height.
 * @property {string|null} label - The panels head label.
 * @property {number|null} labelRatio
 * @property {number} ratio - The global component label / component width ratio.
 * @property {boolean} collapse - If true the panel get collapsed with only the panel head being visible.
 * @property {number} opacity - The global panel opacity.
 */
export const DefaultConfig = Object.freeze({
    enabled : true,
    fixed: true,
    x: null,
    y: null,
    width: 300,
    height: null,
    label: 'panel',
    labelRatio : null,
    ratio: 30,
    collapse: false,
    opacity: 1.0
});

/*--------------------------------------------------------------------------------------------------------------------*/
// Panel
/*--------------------------------------------------------------------------------------------------------------------*/

export default class Panel{
    constructor(controlKit,config){
        config = validateOption(config,DefaultConfig);

        this._root = controlKit;

        this._element = createHtml(template);
        this._root._element.appendChild(this._element);
        this._elementHead = this._element.querySelector('.panel-head');
        this._elementLabel = this._element.querySelector('.panel-head label');
        this._elementClose = this._element.querySelector('.head-menu button:nth-child(1)');
        this._elementSave = this._element.querySelector('.head-menu button:nth-child(2)');
        this._elementLoad = this._element.querySelector('.head-menu button:nth-child(3)');
        this._elementList = this._element.querySelector('.group-list');

        this._state = {
            enabled : config.enabled,
            height : null,
            maxHeight : config.height,
            label : config.label,
            labelRatio : config.labelRatio,
            position : [config.x,config.y],
            collapse : config.collapse,
            opacity : config.opacity,
            fixed : config.fixed,
            dragging : false
        };

        this._scrollContainer = new ScrollContainer(this._elementList);

        this._groups = [];

        /*------------------------------------------------------------------------------------------------------------*/
        // Listener
        /*------------------------------------------------------------------------------------------------------------*/

        //action collaps
        const onCollapse = ()=>{
            this.collapse = !this.collapse;
        };

        //panel drag
        let offsetX = 0;
        let offsetY = 0;
        const setPositionOffsetted = (x,y)=>{
            this.x = x - offsetX;
            this.y = y - offsetY;
        };
        const onHeadDragBegin = (e)=>{
            if(!this._state.fixed){
                return;
            }
            this._state.dragging = true;
            const rect = this._element.getBoundingClientRect();
            offsetX = e.pageX - rect.left;
            offsetY = e.pageY - rect.top;
            this._element.classList.add('dragging');
        };
        const onHeadDrag = (e)=>{
            if(!this._state.dragging){
                return;
            }
            setPositionOffsetted(e.pageX,e.pageY);
        };
        const onHeadDragEnd = (e)=>{
            if(!this._state.dragging){
                return;
            }
            setPositionOffsetted(e.pageX,e.pageY);
            offsetX = 0;
            offsetY = 0;
            this._state.dragging = false;
            this._element.classList.remove('dragging');
        };

        //menu save / load
        const onSave = ()=>{
            this._root.saveConfig();
        };
        const onLoad = ()=>{
            this._root.loadConfig();
        };

        //window resize
        const onWindowResize = ()=>{
            //constrain to viewport
            if(this._state.fixed){
                this.x = this.x;
                this.y = this.y;
            }
            this._constrainHeight();
        };

        //attach listeners head
        this._elementHead.addEventListener('mousedown',onHeadDragBegin);
        document.addEventListener('mousemove',onHeadDrag);
        document.addEventListener('mouseup',onHeadDragEnd);
        this._elementHead.addEventListener('dblclick',onCollapse);
        this._elementClose.addEventListener('click',onCollapse);
        this._elementLoad.addEventListener('click',onSave);
        this._elementSave.addEventListener('click',onLoad);

        //attach lisneters window
        window.addEventListener('resize',onWindowResize);

        this._removeEventListeners = ()=>{
            document.removeEventListener('mousemove',onHeadDrag);
            document.removeEventListener('mouseup',onHeadDragEnd);
            window.removeEventListener('resize',onWindowResize);
        };

        /*------------------------------------------------------------------------------------------------------------*/
        // Init
        /*------------------------------------------------------------------------------------------------------------*/

        this.fixed = this._state.fixed;
        this.label = this._state.label;
        this.enable = this._state.enabled;
        this.collapse = this._state.collapse;
        this.opacity = this._state.opacity;
        this.componentLabelRatio = this._state.labelRatio;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // Internal
    /*----------------------------------------------------------------------------------------------------------------*/

    _removeEventListeners(){}

    _constrainHeight(){
        const top = this._elementHead.getBoundingClientRect().bottom;
        const max = window.innerHeight;
        const height = this._state.maxHeight ?
                       Math.min(this._state.maxHeight,max - top) :
                       max < top ? max : null;
        this._scrollContainer.setHeight(height);
    }

    _removeGroup(group){
        const index = this._groups.indexOf(group);
        if(index === -1){
            throw new Error('Group not part of panel.');
        }
        this._groups.slice(index,1);
        this._elementList.removeChild(group.element);
        this._onGroupSizeChange();
    }

    render(){
        if(!this._enabled){

            return;
        }
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // Setter / Getter
    /*----------------------------------------------------------------------------------------------------------------*/

    /**
     * If true, the panels position can be set.
     * @param value
     */
    set fixed(value){
        this._state.fixed = value;
        this._element.classList[value ? 'add' : 'remove']('fixed');
    }

    /**
     * Returns true if fixed.
     * @return {*}
     */
    get fixed(){
        return this._state.fixed;
    }

    /**
     * Sets the panels x position (if fixed).
     * @param {number} value
     */
    set x(value){
        if(!this._state.fixed){
            return;
        }
        this._state.x = Math.max(0,Math.min(value,window.innerWidth - this.width));
        this._element.style.left = this._state.x + 'px';
    }

    /**
     * Returns the color-pickers current x position.
     * @return {number}
     */
    get x(){
        if(!this._state.fixed){
            return this._element.getBoundingClientRect().left;
        }
        return this._state.x;
    }

    /**
     * Sets the color-pickers y position (if fixed).
     * @param {number} value
     */
    set y(value){
        if(!this._state.fixed){
            return;
        }
        this._state.y = Math.max(0,Math.min(value,window.innerHeight - this._elementHead.getBoundingClientRect().height));
        this._constrainHeight();
        this._element.style.top = this._state.y + 'px';
    }

    /**
     * Returns the color-pickers current y position.
     * @return {number}
     */
    get y(){
        if(!this._state.fixed){
            return this._element.getBoundingClientRect().top;
        }
        return this._state.y;
    }

    /**
     * Returns the with of the color-picker.
     * @return {number}
     */
    get width(){
        return this._element.offsetWidth;
    }

    /**
     * Returns the height of the color-picker.
     * @return {number}
     */
    get height(){
        return this._element.offsetHeight;
    }

    /**
     * Sets the panel head label text.
     * @param {string} value
     */
    set label(value){
        this._state.label = value;
        this._elementLabel.innerHTML = value;
    }

    /**
     * Returns the panel head label text.
     * @return {string}
     */
    get label(){
        return this._state.label;
    }

    /**
     * Set a global group value for label and component width ratio.
     * @param {number} value
     */
    set componentLabelRatio(value){
        this._state.labelRatio = value;
        for(const group of this._groups){
            group.componentLabelRatio = value;
        }
    }

    /**
     * Returns the global group value for label and component width ratio.
     * Returns null if no global value set.
     * @return {number}
     */
    get componentLabelRatio(){
        return this._state.labelRatio;
    }

    /**
     * Sets a global panel opacity.
     * @param {number} value
     */
    set opacity(value){
        this._state.opacity = value;
        this._element.style.opacity = value === 1.0 ? null : value;
    }

    /**
     * Returns the global panel opacity set.
     * Returns null if no global value set.
     * @return {number}
     */
    get opacity(){
        return this._state.opacity;
    }

    /**
     * Collapsed / expands the panel.
     * @param {boolean} value
     */
    set collapse(value){
        this._state.collapse = value;
        this._element.classList[value ? 'add' : 'remove']('collapse');
    }

    /**
     * Returns true if the panel is collapsed.
     * @return {boolean}
     */
    get collapse(){
        return this._state.collapse;
    }

    /**
     * Enables / disables the panel.
     * @param {boolean} value
     */
    set enable(value){
        this._state.enabled = value;
        this._element.classList[value ? 'remove' : 'add']('hide');
    }

    /**
     * Returns true if the panel is enabled.
     * @return {boolean}
     */
    get enable(){
        return this._state.enabled;
    }

    /**
     * Returns the underlying HTMLElement.
     * @return {HTMLElement}
     */
    get element(){
        return this._element;
    }

    /**
     * Returns the list underlying HTMLElement.
     * @return {HTMLElement}
     */
    get elementList(){
        return this._elementList;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // Groups
    /*----------------------------------------------------------------------------------------------------------------*/

    _onGroupSizeChange(){
        this._constrainHeight();
    }

    addGroup(config){
        const group = new Group(this,config);
        this._groups.push(group);
        this._elementList.appendChild(group.element);
        group.componentLabelRatio = this._state.labelRatio;
        group.on('size-change',()=>{this._onGroupSizeChange();});
        this._onGroupSizeChange();
        return this;
    };

    addSubGroup(config){
        if(this._groups.length == 0){
            this.addGroup();
        }
        this._groups[this._groups.length - 1].addSubGroup(config);
        return this;
    };

    _backGroupValid(){
        if(this._groups.length == 0){
            this.addGroup();
        }
        return this._groups[this._groups.length - 1];
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // Components
    /*----------------------------------------------------------------------------------------------------------------*/

    addButton(name,config){
        this._backGroupValid().addButton(name,config);
        return this;
    };

    addCheckbox(object_or_boolean,key_or_config,config){
        this._backGroupValid().addCheckbox(object_or_boolean,key_or_config,config);
        return this;
    };

    addString(object_or_string,key_or_config,config){
        this._backGroupValid().addString(object_or_string,key_or_config,config);
        return this;
    };

    addNumber(object_or_number,key_or_config,config){
        this._backGroupValid().addNumber(object_or_number,key_or_config,config);
        return this;
    };

    addRange(object_or_array,key_or_config,config){};

    addXYPad(object_or_array,key_or_config,config){};

    addLabel(label){
        this._backGroupValid().addLabel(label);
        return this;
    };

    addText(title,text){
        this._backGroupValid().addText(title,text);
        return this;
    }

    addSelect(object,key_or_object,config){
        this._backGroupValid().addSelect(object,key_or_object,config);
        return this;
    };

    addSlider(object_or_number,key_or_array,config){
        this._backGroupValid().addSlider(object_or_number,key_or_array,config);
        return this;
    };

    addColor(object_or_color,key_or_config,config){};

    addImage(object_or_image,key_or_config,config){};

    addImageMatrix(object_or_image_array,key_or_config,config){};

    addVideo(object_or_video,key_or_config,config){};

    addVideoMatrix(object_or_video_array,key_or_config,config){};

    addFunctionPlotter(){};

    /*----------------------------------------------------------------------------------------------------------------*/
    // State
    /*----------------------------------------------------------------------------------------------------------------*/

    sync(){
        for(const group of this._groups){
            group.sync();
        }
    }

    clear(){
        for(const group of this._groups){
            group.clear();
        }
        this._groups = [];
        this._element.parentNode.removeChild(this._element);
        this._removeEventListeners();
    }

    getState(){
        const state = Object.assign({},this._state);
        state.groups = this._groups.map((item)=>{return item.getState();});
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // Factory
    /*----------------------------------------------------------------------------------------------------------------*/

    static createFromObject(object){
        //validate in object
    }
}

