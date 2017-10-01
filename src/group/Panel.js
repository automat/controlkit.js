import validateOption from 'validate-option';
import validateType from '../util/validate-type';
import validateValue from '../util/validate-value';
import validateDescription from '../util/validate-description';
import createHtml from '../util/create-html';
import Group, {DefaultConfig as GroupDefaultConfig} from './group';
import ScrollContainer from './scroll-container';
import EventEmitter from 'events';

/*--------------------------------------------------------------------------------------------------------------------*/
// Template / Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

const template =
    `<div class="panel">
        <div class="panel-head">
            <label></label>
            <div class="head-menu">
                <button class="btn-close"></button>
                <div class="head-state">
                    <button class="btn-save">save</button>
                    <button class="btn-load">load</button>
                </div>
            </div>
        </div>
        <ul class="group-list"></ul>
    </div>`;

/**
 * Panel horizontal alignment type
 * @type {Object}
 * @property {string} LEFT - align left
 * @property {string} RIGHT - align right
 */
export const AlignmentH = Object.freeze({
    NONE : null,
    LEFT : 'left',
    RIGHT : 'right'
});

/**
 * Panel vertical alignment type
 * @type {Object}
 * @property {string} TOP - align top
 * @property {string} BOTTOM - align bottom
 */
export const AlignmentV = Object.freeze({
    NONE : null,
    TOP : 'top',
    BOTTOM : 'bottom',
    TOP_STACK : 'top-stack',
    BOTTOM_STACK : 'bottom-stack'
});

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
    id : null,
    enabled : true,
    fixed: false,
    alignh : AlignmentH.RIGHT,
    alignv : AlignmentV.TOP,
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

export default class Panel extends EventEmitter{
    constructor(controlKit,config){
        config = validateOption(config,DefaultConfig);
        validateValue(config.alignh,AlignmentH);
        validateValue(config.alignv,AlignmentV);

        if(config.fixed && (config.alignh || config.alignv)){
            throw new Error('Panel position "fixed" not compatible with alignment options.');
        }

        super();
        this.setMaxListeners(0);

        // state
        this._id = config.id;
        this._enabled = config.enabled;
        this._height = null;
        this._maxHeight = config.height;
        this._label = config.label;
        this._labelRatio = config.labelRatio;
        this._position = config.position;
        this._collapse = config.collapse;
        this._opacity = config.opacity;
        this._fixed = config.fixed;
        this._alignh = config.alignh;
        this._alignv = config.alignv;
        this._dragging = false;

        // this._state = {
        //     id : config.id,
        //     enabled : config.enabled,
        //     height : null,
        //     maxHeight : config.height,
        //     label : config.label,
        //     labelRatio : config.labelRatio,
        //     position : [config.x,config.y],
        //     collapse : config.collapse,
        //     opacity : config.opacity,
        //     fixed : config.fixed,
        //     alignh : config.alignh,
        //     alignv : config.alignv,
        //     dragging : false
        // };


        // node
        this._root = controlKit;
        this._element = createHtml(template);
        this._root._element.appendChild(this._element);
        this._elementHead = this._element.querySelector('.panel-head');
        this._elementLabel = this._element.querySelector('.panel-head label');
        this._elementClose = this._element.querySelector('.btn-close');
        this._elementSave = this._element.querySelector('.btn-save');
        this._elementLoad = this._element.querySelector('.btn-load');
        this._elementList = this._element.querySelector('.group-list');

        // auto position
        this._element.style.position = 'absolute';
        if(this._alignv === AlignmentV.BOTTOM || this._alignv === AlignmentV.BOTTOM_STACK){
            this._elementHead.classList.add('flipped');
        }

        this._scrollContainer = new ScrollContainer(this._elementList);
        this._scrollContainer.on('size-change',()=>{this.emit('scroll-size-change');});
        this._groups = [];

        //action collapse
        const onCollapse = (e)=>{
            this.collapse = !this.collapse;
            if(!this.collapse){
                this.updateHeight();
            }
            e.stopPropagation();
        };

        //panel drag
        let offsetX = 0;
        let offsetY = 0;
        const setPositionOffsetted = (x,y)=>{
            this.x = x - offsetX;
            this.y = y - offsetY;
        };
        const onHeadDragBegin = (e)=>{
            if(!this._fixed){
                return;
            }
            this._dragging = true;
            const rect = this._element.getBoundingClientRect();
            offsetX = e.pageX - rect.left;
            offsetY = e.pageY - rect.top;
            this._element.classList.add('dragging');
        };
        const onHeadDrag = (e)=>{
            if(!this._dragging){
                return;
            }
            setPositionOffsetted(e.pageX,e.pageY);
        };
        const onHeadDragEnd = (e)=>{
            if(!this._dragging){
                return;
            }
            setPositionOffsetted(e.pageX,e.pageY);
            offsetX = 0;
            offsetY = 0;
            this._dragging = false;
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
            if(this._fixed){
                this.x = this.x;
                this.y = this.y;
            }
            this.updateHeight();
        };

        //attach listeners head
        this._elementHead.addEventListener('mousedown',onHeadDragBegin);
        document.addEventListener('mousemove',onHeadDrag);
        document.addEventListener('mouseup',onHeadDragEnd);
        this._elementHead.addEventListener('dblclick',onCollapse);
        this._elementClose.addEventListener('click',onCollapse);
        this._elementClose.addEventListener('dblclick',(e)=>{e.stopPropagation();});
        this._elementLoad.addEventListener('click',onSave);
        this._elementSave.addEventListener('click',onLoad);

        //attach lisneters window
        window.addEventListener('resize',onWindowResize);

        this._removeEventListeners = ()=>{
            document.removeEventListener('mousemove',onHeadDrag);
            document.removeEventListener('mouseup',onHeadDragEnd);
            window.removeEventListener('resize',onWindowResize);
        };

        //init
        this.fixed = this._fixed;
        this.label = this._label;
        this.enable = this._enabled;
        this.collapse = this._collapse;
        this.opacity = this._opacity;
        this.componentLabelRatio = this._labelRatio;
    }

    _removeGroup(group){
        const index = this._groups.indexOf(group);
        if(index === -1){
            throw new Error('Group not part of panel.');
        }
        this._groups.slice(index,1);
        this._elementList.removeChild(group.element);
        this.updateHeight();
    }

    render(){
        if(!this._enabled){

            return;
        }
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // Query Elements
    /*----------------------------------------------------------------------------------------------------------------*/

    /**
     * Returns the root control kit instance.
     * @return {*}
     */
    get root(){
        return this._root;
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
    // Alignment Setter / Getter
    /*----------------------------------------------------------------------------------------------------------------*/

    /**
     * If true, the panels position can be set.
     * @param value
     */
    set fixed(value){
        this._fixed = value;
        this._element.classList[value ? 'add' : 'remove']('fixed');
        this._element.style.right = null;
        this._element.style.bottom = null;
        this._root.updatePanelAutoPosition();
    }

    /**
     * Returns true if fixed.
     * @return {*}
     */
    get fixed(){
        return this._fixed;
    }

    /**
     * Sets the horizontal auto alignment.
     * @param {String|null} alignment
     */
    set alignh(alignment){
        validateValue(alignment,AlignmentH);
        this._alignh = alignment;
        this._root.updatePanelAutoPosition();
    }

    /**
     * Returns the horizontal auto alignment.
     * @return {String|null}
     */
    get alignh(){
        return this._alignh;
    }

    /**
     * Sets the vertical auto alignment.
     * @param {String|null} alignment
     */
    set alignv(alignment){
        validateValue(alignment,AlignmentV);
        this._alignv = alignment;
        this._root.updatePanelAutoPosition();
    }

    /**
     * Returns the vertical auto alignment.
     * @return {String|null}
     */
    get alignv(){
        return this._alignv;
    }

    /**
     * Sets the panels x position (if fixed).
     * @param {number} value
     */
    set x(value){
        if(!this._fixed){
            return;
        }
        this._position[0] = Math.max(0,Math.min(value,window.innerWidth - this.width));
        this._element.style.left = this._position[0] + 'px';
    }

    /**
     * Returns the panels current x position.
     * @return {number}
     */
    get x(){
        if(!this._fixed){
            return this._element.getBoundingClientRect().left;
        }
        return this._position[0];
    }

    /**
     * Sets the panels y position (if fixed).
     * @param {number} value
     */
    set y(value){
        if(!this._fixed){
            return;
        }
        this._position[1] = Math.max(0,Math.min(value,window.innerHeight - this._elementHead.getBoundingClientRect().height));
        this._element.style.top = this._position[1] + 'px';
        this.updateHeight();
    }

    /**
     * Returns the color-pickers current y position.
     * @return {number}
     */
    get y(){
        if(!this._fixed){
            return this._element.getBoundingClientRect().top;
        }
        return this._position[1];
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // Dimension Getter
    /*----------------------------------------------------------------------------------------------------------------*/

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

    /*----------------------------------------------------------------------------------------------------------------*/
    // Appearance Modifier
    /*----------------------------------------------------------------------------------------------------------------*/

    updateHeight(){
        const top = this._elementHead.getBoundingClientRect().bottom;
        const max = window.innerHeight;
        const height = this._maxHeight ? Math.min(this._maxHeight,max - top) :
                       max > top ? (max - top) : null;
        this._scrollContainer.setHeight(height);
        this._root.updatePanelAutoPosition();
    }

    /**
     * Sets the panel head label text.
     * @param {string} value
     */
    set label(value){
        this._label = value;
        this._elementLabel.innerHTML = value;
    }

    /**
     * Returns the panel head label text.
     * @return {string}
     */
    get label(){
        return this._label;
    }

    /**
     * Set a global group value for label and component width ratio.
     * @param {number} value
     */
    set componentLabelRatio(value){
        this._labelRatio = value;
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
        return this._labelRatio;
    }

    /**
     * Sets a global panel opacity.
     * @param {number} value
     */
    set opacity(value){
        this._opacity = value;
        this._element.style.opacity = value === 1.0 ? null : value;
    }

    /**
     * Returns the global panel opacity set.
     * Returns null if no global value set.
     * @return {number}
     */
    get opacity(){
        return this._opacity;
    }

    /**
     * Collapsed / expands the panel.
     * @param {boolean} value
     */
    set collapse(value){
        this._collapse = value;
        this._element.classList[value ? 'add' : 'remove']('collapse');
        this.updateHeight();
    }

    /**
     * Returns true if the panel is collapsed.
     * @return {boolean}
     */
    get collapse(){
        return this._collapse;
    }

    /**
     * Enables / disables the panel.
     * @param {boolean} value
     */
    set enable(value){
        this._enabled = value;
        this._element.classList[value ? 'remove' : 'add']('hide');
    }

    /**
     * Returns true if the panel is enabled.
     * @return {boolean}
     */
    get enable(){
        return this._enabled;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // Elements Modifier
    /*----------------------------------------------------------------------------------------------------------------*/

    /**
     * Returns ths last active group.
     * @return {Group}
     * @private
     */
    _backGroupValid(){
        if(this._groups.length === 0){
            this.addGroup();
        }
        return this._groups[this._groups.length - 1];
    }

    /**
     * Adds a new group to the panel.
     * @param config
     * @return {Panel}
     */
    addGroup(config){
        const group = new Group(this,config);
        this._groups.push(group);
        this._elementList.appendChild(group.element);
        group.componentLabelRatio = this._labelRatio;
        //update height if group changed
        group.on('size-change',()=>{this.updateHeight();});
        //update height to new group element
        this.updateHeight();
        return this;
    };

    /**
     * Adds a new sub-group to the active group.
     * @param config
     * @return {Panel}
     */
    addSubGroup(config){
        if(this._groups.length === 0){
            this.addGroup();
        }
        this._groups[this._groups.length - 1].addSubGroup(config);
        return this;
    };

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

    addPad(object_or_array,key_or_config,config){
        this._backGroupValid().addPad(object_or_array,key_or_config,config);
        return this;
    };

    addLabel(label,config){
        this._backGroupValid().addLabel(label,config);
        return this;
    };

    addText(title,text){
        this._backGroupValid().addText(title,text);
        return this;
    }

    addSelect(object,key,config){
        this._backGroupValid().addSelect(object,key,config);
        return this;
    };

    addSlider(object_or_number,key_or_array,config){
        this._backGroupValid().addSlider(object_or_number,key_or_array,config);
        return this;
    };

    addRange(object,key,config){
        this._backGroupValid().addRange(object,key,config);
        return this;
    }

    addCanvas(config){
        this._backGroupValid().addCanvas(config);
        return this;
    }

    addSvg(config){
        this._backGroupValid().addSvg(config);
        return this;
    }

    addImage(image,config){
        this._backGroupValid().addImage(image,config);
        return this;
    }

    addColor(object_or_color,key_or_config,config){};

    addImageMatrix(object_or_image_array,key_or_config,config){};

    addVideo(object_or_video,key_or_config,config){};

    addVideoMatrix(object_or_video_array,key_or_config,config){};

    addFunctionPlotter(object,key,config){
        this._backGroupValid().addFunctionPlotter(object,key,config);
        return this;
    };

    /**
     * Adds groups from description.
     * @param description
     * @return {Panel}
     *
     * @example
     * //single group
     * panel.add({label: 'group', subGroups : [
     *      {label: 'sub group' : components : [
     *          {type: 'number', object: obj, key: 'property'}
     *      ]
     * ]);
     *
     * @example
     * //multiple groups
     * panel.add([
     *     {label: 'group', subGroups : [
     *         {label: 'sub group' : components : [
     *             {type: 'number', object: obj, key: 'property'}
     *         ]
     *     ]},
     *     {label: 'group', subGroups : [
     *         {label: 'sub group' : components : [
     *             {type: 'number', object: obj, key: 'property'}
     *         ]
     *     ]}
     * ]);
     *
     * @example
     * //sub-group
     * panel.add({label:'sub-group', components:[
     *     {type: 'number', object: obj, key: 'property'}
     * ]});
     *
     * @example
     * //sub-groups
     * panel.add([{
     *     label:'sub-group-a', components:[
     *         {type: 'number', object: obj, key: 'property'}
     *     ]},{
     *     label:'sub-group-b', components:[
     *         {type: 'number', object: obj, key: 'property'}
     *     ]}
     * ]);
     *
     * @example
     * //component
     * panel.add({type: 'number', object: obj, key: 'property'});
     *
     * @example
     * //components
     * panel.add([
     *     {type: 'number', object: obj, key: 'property'},
     *     {type: 'number', object: obj, key: 'property'}
     * ]);
     */
    add(description){
        if(description instanceof Array){
            for(const item of description){
                this.add(item);
            }
            return this;
        }
        if(!description.subGroups && !description.components && !description.type ||
            description.subGroups && description.components ||
            description.subGroups && description.type ||
            description.components && description.type){
            throw new Error('Invalid group description. Use {...,subGroups:[...]} to create groups, {...,components:[...]} to create sub-groups or {type:...,...} to create components.');
        }
        let subGroups = null;
        //create group
        if(description.subGroups){
            validateType(description.subGroups,Array);
            const config = validateDescription(description,GroupDefaultConfig,['subGroups']);
            this.addGroup(config);
            subGroups = description.subGroups;
        }
        //append subgroups to last group
        else {
            subGroups = [description];
        }
        this._backGroupValid().add(subGroups);
        return this;
    }

    sync(){
        for(const group of this._groups){
            group.sync();
        }
    }

    destroy(){
        for(const group of this._groups){
            group.destroy();
        }
        this._groups = [];
        this._element.parentNode.removeChild(this._element);
        this._removeEventListeners();
        this._root.updatePanelAutoPosition();
    }

    static createFromObject(object){
        //validate in object
    }
}

