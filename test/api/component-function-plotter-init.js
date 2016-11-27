import ControlKit from '../../index';

window.addEventListener('load',()=>{
    const settings = {
        func0:(x)=>{return (0.5 + Math.sin(Math.PI * 0.5 + x * Math.PI * 4) * 0.5);},
        func1:(x)=>{return x;}
    };

    new ControlKit().addPanel()
        .addFunctionPlotter(settings,'func0',{useFill:false,scaleX:true,dragX:true,dragY:true})
        .addFunctionPlotter(settings,'func1',{stroke:'#fff',strokeWidth:3,useFill:false,scaleX:true});
});