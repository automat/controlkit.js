/*
 *
 * math.js
 *
 * Created by henryk Wollik on 05.11.12.
 *
 */


var PI         = Math.PI,
    HALF_PI    = Math.PI * 0.5,
    QUARTER_PI = Math.PI*0.25;
TWO_PI     = Math.PI * 2;

var EPSILON = 0.0001;

function lerp(a,b,v)
{
    return (a*v)+(b*(1-v));
}

function stepSmooth(n)
{
    return n*n*(3-2*n);
}

function stepSmoothSquared(n)
{
    return stepSmooth(n)*stepSmooth(n);
}

function stepSmoothInvSquared(n)
{
    return 1-(1-stepSmooth(n))*(1-stepSmooth(n));
}

function stepSmoothCubed(n)
{
    return stepSmooth(n)*stepSmooth(n)*stepSmooth(n)*stepSmooth(n);
}

function stepSmoothInvCubed(n)
{
    return 1-(1-stepSmooth(n))*(1-stepSmooth(n))*(1-stepSmooth(n))*(1-stepSmooth(n));
}

function stepSquared(n)
{
    return n*n;
}

function stepInvSquared(n)
{
    return 1-(1-n)*(1-n);
}

function stepCubed(n)
{
    return n*n*n*n;
}

function stepInvCubed(n)
{
    return 1-(1-n)*(1-n)*(1-n)*(1-n);
}

function catmullrom(v,p0,p1,p2,p3)
{
    return 0.5 * ((2 * p1) + (-p0 + p2) * v + (2 * p0 - 5 * p1 + 4 * p2 - p3) * v * v + (-p0 + 3 * p1 - 3 * p2 + p3) * v * v *v);
}

function randomFloat()
{
    var r;

    switch (arguments.length)
    {
        case 0:
            r = Math.random();
            break;
        case 1:
            r = Math.random() * arguments[0];
            break;
        case 2:
            r = arguments[0] + (arguments[1]-arguments[0]) * Math.random();
            break;
    }

    return r;
}

function randomInteger()
{
    var r;

    switch (arguments.length)
    {
        case 0:
            r =  0.5 + Math.random();
            break;
        case 1:
            r = 0.5 + Math.random()*arguments[0];
            break;
        case 2:
            r = arguments[0] + ( 1 + arguments[1] - arguments[0]) * Math.random();
            break;

    }

    return Math.floor(r);
}

function constrain()
{
    var r;

    switch (arguments.length)
    {
        case 2:
            arguments[0] = (arguments[0] > arguments[1]) ? arguments[1] : arguments[0];
            break;
        case 3:
            arguments[0] = (arguments[0] > arguments[2]) ? arguments[2] :
                (arguments[0] < arguments[1]) ? arguments[1] :
                    arguments[0];
            break;
    }

    return arguments[0];
}

function normalize(value,start,end)
{
    return (value - start) / (end - start);
}

function map(value,inStart,inEnd,outStart,outEnd)
{
    return outStart + (outEnd - outStart) * normalize(value,inStart,inEnd);
}

function sin(value)
{
    return Math.sin(value);
}

function cos(value)
{
    return Math.cos(value);
}

function saw(value)
{

    return 2 * (value  - Math.floor(0.5 + value ));
}

function tri(value)
{
    return 1-4*abs(0.5-frac(0.5*value+0.25));
}

//FIX
function rect(value)
{
    var a = abs(value);
    return (a > 0.5) ? 0 : (a == 0.5) ? 0.5 : (a < 0.5) ? 1 : -1;
}


function frac(value)
{
    return value - Math.floor(value);
}

function sgn(value)
{
    return value / abs(value);
}


function abs(x)
{
    return Math.abs(x);
}

function min(x)
{
    return Math.min(x);
}

function max(x)
{
    return Math.max(x);
}

function atan(x)
{
    return Math.atan(x);
}

function atan2(y,x)
{
    return Math.atan2(y,x);
}

function round(x)
{
    return Math.round(x);
}

function floor(x)
{
    return Math.floor(x);
}

function tan(x)
{
    return Math.tan(x);
}

function rad2deg(radians)
{
    return radians * (180 / PI);
}

function deg2rad(degree)
{
    return degree * (PI / 180);
}

function sqrt(x)
{
    return Math.sqrt(x);
}

function GreatestCommonDivisor(a,b)
{
    return (b == 0) ? a : GreatestCommonDivisor(b, a % b)
}

function isFloatEqual(a,b)
{
    return (Math.abs(a-b) < EPSILON);
}

function isPowerOfTwo(a)
{
    return (a&(a-1))==0;
}

function swap(a,b)
{
    var t = a;a = b;b = a;
}

function pow(x,y)
{
    return Math.pow(x,y);
}



