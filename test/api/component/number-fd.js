import ControlKit from '../../../index';

window.addEventListener('load',()=>{
    const settings = {a : 0,b : 0,c : 1.1,d : 1.11, e:1.111};

    new ControlKit().addPanel()
        .addNumber(settings,'a')
        .addNumber(settings,'b',{fd : 0})
        .addNumber(settings,'c',{fd : 1})
        .addNumber(settings,'d',{fd : 2})
        .addNumber(settings,'e',{fd : 3})
});