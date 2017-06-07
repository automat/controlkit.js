import ControlKit from '../../../index';

window.addEventListener('load',()=>{
    const settings = {a:0,b:1,c:1.001,d:1.0001};

    new ControlKit().addPanel()
        .addNumber(settings,'a',{readonly : true})
        .addNumber(settings,'a',{fd:1,onChange:function(){console.log(this.value);}})
        .addNumber(settings,'b',{fd:1,onChange:function(){console.log(this.value);}})
        .addNumber(settings,'c',{fd:0,stepShiftMult:10,step:1})
        // .addNumber(settings,'d')
});