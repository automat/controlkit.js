import ControlKit from '../../index';

window.addEventListener('load',()=>{
    const settings = {a:0};

    new ControlKit().addPanel()
        .addNumber(settings,'a',{label:null})
        .addNumber(settings,'a',{label:'some name'})
        .addNumber(settings,'a',{label:'none'})
});