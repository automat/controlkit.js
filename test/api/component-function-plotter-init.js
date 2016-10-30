import ControlKit from '../../index';

window.addEventListener('load',()=>{
    const settings = {func:(x)=>{return (0.5 + Math.sin(Math.PI * 0.5 + x * Math.PI * 4) * 0.5);}};

    new ControlKit().addPanel()
        .addFunctionPlotter(settings,'func')
        .addFunctionPlotter(settings,'func',{stroke:'#ff0'});
});