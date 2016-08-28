//sketch-context2d render
module.exports = function(canvas){
    var width = canvas.width;
    var height = canvas.height;
    var ctx = canvas.getContext('2d');

    var steps = 100;
    var stepWidth = width / (steps-1);

    var data = new Array(steps);
    for(var i = 0; i < data.length; ++i){
        data[i] = 0.2 + (0.5 + Math.sin(Math.PI * 0.5 + Math.PI * 1.5 * i / (data.length-1)) * 0.5) * 0.8;
    }

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(0,height - data[0] * height);
    for(var i = 1; i < data.length; ++i){
        ctx.lineTo(stepWidth * i, height - data[i] * height);
    }
    ctx.lineTo(width,height);
    ctx.lineTo(0,height);
    ctx.fill();

    console.log(width,height);
};