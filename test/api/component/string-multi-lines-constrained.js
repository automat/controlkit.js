import ControlKit from '../../../index';

window.addEventListener('load',()=>{
    const settings = {a : 'abc'};

    new ControlKit().addPanel()
        .addString(settings,'a',{multiline : true,lines : 8,maxHeight : 100})
});