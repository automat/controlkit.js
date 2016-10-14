import ControlKit from '../../index';

window.addEventListener('load',()=>{
    const settings = {number:0};

    const controlKit = new ControlKit();
    controlKit.add([
        {type:'number',object:settings,key:'number'},
        {type:'number',object:settings,key:'number'}
    ]);
});