import ControlKit from '../../index';

window.addEventListener('load',()=>{
    const settings = {a:0,b:1};
    const preset = [0.0001,1234567,9999999];

    new ControlKit().addPanel()
        .addNumber(settings,'a',{readonly : true,preset})
        .addNumber(settings,'a',{preset})
        .addNumber(settings,'a',{preset})
        .addNumber(settings,'a',{preset})
        .addNumber(settings,'a',{preset})
        .addNumber(settings,'b',{preset});
});