import ControlKit from '../../index';

window.addEventListener('load',()=>{
    const settings = {a:'abc'};

    new ControlKit().addPanel()
        .addString(settings,'a',{multiline:true,maxHeight:100})
});