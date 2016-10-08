import createHtml from '../util/createHtml';

const template =
    `<div class="scroll-wrap">
        <div class="scroll-container"></div>
        <div class="scroll-bar">
            <div class="scroll-track">
                <div class="scroll-handle"></div>
            </div>
        </div>
    </div>`;

export default class ScrollContainer{
    constructor(target){
        this._state = {
            height : null,
            scrollY : 0,
            scrollYNorm : 0,
            dragging : false,
            handleHeight : 0,
            handleOffset : 0,
            handleDragging : false
        };

        this._target = target;
        this._parent = this._target.parentNode;
        this._element = createHtml(template);
        this._elementContainer = this._element.querySelector('.scroll-container');
        this._elementTrack = this._element.querySelector('.scroll-track');
        this._elementHandle = this._element.querySelector('.scroll-handle');

        const getDelta = (e)=>{
            return -((e.wheelDelta * 0.5) || (e.detail * -6.0));
        };

        //scroll within container
        const onContainerScroll = (e)=>{
            if(this._state.height === null){
                return;
            }
            const delta = getDelta(e);

            //update scroll container position
            const height = this._element.offsetHeight;
            const heightTarget = this._target.offsetHeight;
            const min = 0;
            const max = heightTarget - height;

            this._state.scrollY += delta;
            this._state.scrollY = Math.max(min,Math.min(this._state.scrollY,max));
            this._state.scrollYNorm = this._state.scrollY / max;
            this._target.style.marginTop = -this._state.scrollY + 'px';

            //update scroll handle position
            const heightHandle = this._elementHandle.offsetHeight;
            const heightTrack = this._elementTrack.offsetHeight;
            const ratio = heightHandle / heightTrack;

            this._elementHandle.style.marginTop = this._state.scrollYNorm * (1.0 - ratio) * heightTrack + 'px';

            e.preventDefault();
        };

        //scoll position relative to handle
        const setScrollFromHandle = (pageY,offset,rectTrack,rectHandle)=>{
            const min = 0;
            const max = rectTrack.height - rectHandle.height;
            const handle = Math.max(min,Math.min(pageY - rectTrack.top - offset,max));

            //update scroll container position
            this._state.scrollY = (handle / max) * (this._target.offsetHeight - this._element.offsetHeight);
            this._target.style.marginTop = -this._state.scrollY + 'px';

            //update scroll handle position
            this._elementHandle.style.marginTop = handle + 'px';
        };

        //handle track click
        const onTrackMouseDown = (e)=>{
            const rectTrack = this._elementTrack.getBoundingClientRect();
            const rectHandle = this._elementHandle.getBoundingClientRect();
            setScrollFromHandle(e.pageY,rectHandle.height * 0.5,rectTrack,rectHandle);
        };

        //handle drag
        let rectTrack = null;
        let rectHandle = null;
        let offsetHandle = -1;
        const onHandleMouseDown = (e)=>{
            rectTrack = this._elementTrack.getBoundingClientRect();
            rectHandle = this._elementHandle.getBoundingClientRect();
            offsetHandle = e.pageY - rectHandle.top;
            this._state.handleDragging = true;
        };
        const onHandleMouseMove = (e)=>{
            if(!this._state.handleDragging){
                return;
            }
            setScrollFromHandle(e.pageY,offsetHandle,rectTrack,rectHandle);
        };
        const onHandleMouseUp = ()=>{
            this._state.handleDragging = false;
        };

        this._elementContainer.addEventListener('mousewheel',onContainerScroll);
        this._elementContainer.addEventListener('DOMMouseScroll',onContainerScroll);
        this._elementTrack.addEventListener('mousewheel',onContainerScroll);
        this._elementTrack.addEventListener('DOMMouseScroll',onContainerScroll);

        this._elementTrack.addEventListener('mousedown',onTrackMouseDown);

        this._elementHandle.addEventListener('mousedown',onHandleMouseDown);
        document.addEventListener('mousemove',onHandleMouseMove);
        document.addEventListener('mouseup',onHandleMouseUp);

        //remove listeners on control-kit cleanup
        this._removeEventListeners = ()=>{
            document.removeEventListener('mousemove',onHandleMouseMove);
            document.removeEventListener('mouseup',onHandleMouseUp);
        }
    }

    _removeEventListeners(){}

    _resetScroll(){
        this._state.handleOffset = 0;
        this._state.scrollY = 0;
        this._target.style.marginTop = null;
        this._elementHandle.style.marginTop = null;
    }

    _updateHandleHeight(){
        const heightTrack = this._elementTrack.offsetHeight;
        const heightContent = this._target.offsetHeight;
        const ratio = heightTrack / heightContent;
        this._state.handleHeight = ratio * heightTrack;

        //reset position container + handle position
        this._elementHandle.style.height = this._state.handleHeight + 'px';
    }

    setHeight(value,reset){
        //not active
        if(value === null){
            //remove
            if(this._state.height !== null){
                this._parent.removeChild(this._element);
                this._parent.appendChild(this._target);
            }
            this._resetScroll();
            //active
        } else {
            //update
            if(this._state.height !== null){
                // if(this._target.offsetHeight - this._state.scrollY <= value){
                //     return;
                // }
                this._element.style.height = value + 'px';
                //add
            } else {
                this._elementContainer.appendChild(this._target);
                this._parent.appendChild(this._element);
                this._element.style.height = value + 'px';
                this._resetScroll();
            }
            this._updateHandleHeight();
        }
        this._state.height = value;
    }

    get height(){
        return this._state.height;
    }

    getContentBoundingClientRect(){
        const rectElement = this._element.getBoundingClientRect();
        const rectTarget  = this._target.getBoundingClientRect();

        return {
            top: rectElement.top,
            right : rectElement.right,
            bottom : rectElement.top + rectTarget.height,
            left : rectElement.left,
            width : rectElement.width,
            height : rectTarget.height
        };
    }

    clear(){
        this._removeEventListeners();
    }
}