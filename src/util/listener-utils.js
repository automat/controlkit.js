const noop = ()=>{};

/**
 * Attaches mouse listeners to an HTMLElement. Extends mouse drags events to the document level so they
 * can be registered while holding and dragging outside the element. Returns a function to remove the document attached listeners.
 * @param {HTMLElement} element
 * @param config
 * @return {Function}
 */
export function attachMouseListenersDocumentExtended(element,config){
    config = config || {};
    config.onMouseDown = config.onMouseDown || noop;
    config.onMouseMove = config.onMouseMove || noop;
    config.onMouseUp = config.onMouseUp || noop;
    config.onMouseDrag = config.onMouseDrag || noop;
    config.onMouseWheel = config.onMouseWheel || noop;
    config.args = config.args || [];

    let rect = null;
    let dragging = false;

    //extend event with local position
    const attach = (e)=>{
        const e_ = {};
        for(const key in e){
            e_[key] = e[key];
        }
        e_.x = e.pageX - rect.left;
        e_.y = e.pageY - rect.top;
        e_.rect = rect;
        return e_;
    };

    //mouse down
    element.addEventListener('mousedown',(e)=>{
        rect = element.getBoundingClientRect();
        config.onMouseDown.apply(null,[attach(e)].concat(config.args));
        dragging = true;
    });

    //mouse move
    element.addEventListener('mousemove',(e)=>{
        if(dragging){
            return;
        }
        rect = element.getBoundingClientRect();
        config.onMouseMove.apply(null,[attach(e)].concat(config.args));
    });

    //mouse move on drag
    const onDocumentMouseMove = (e)=>{
        if(!dragging){
            return;
        }
        config.onMouseDrag.apply(null,[attach(e)].concat(config.args));
    };

    //mouse up
    const onDocumentMouseUp = (e)=>{
        if(!dragging){
            return;
        }
        config.onMouseUp.apply(null,[attach(e)].concat(config.args));
        dragging = false;
    };

    //attach document
    document.addEventListener('mousemove',onDocumentMouseMove);
    document.addEventListener('mouseup',onDocumentMouseUp);

    element.addEventListener('mousewheel',config.onMouseWheel);
    element.addEventListener('DOMMouseScroll',config.onMouseWheel);

    //detach document
    return function(){
        document.removeEventListener('mousemove',onDocumentMouseMove);
        document.removeEventListener('mouseup',onDocumentMouseUp);
    }
}