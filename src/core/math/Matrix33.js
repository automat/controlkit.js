export function create(){
    return [
        1,0,0,
        0,1,0,
        0,0,1
    ];
}

export function  copy(a){
    return a.slice(0);
}

export function  set(a,b){
    a[0] = b[0];
    a[1] = b[1];
    a[2] = b[2];
    a[3] = b[3];
    a[4] = b[4];
    a[5] = b[5];
    a[6] = b[6];
    a[7] = b[7];
    a[8] = b[8];

    return this;
}

export function  identity(a){
    a[0] = a[4] = a[8] = 1;
    a[1] = a[2] = a[3] = a[5] = a[6] = a[7] = 0;
    return a;
}

export function  mult(a,b){
    var a00 = a[0], a01 = a[1], a02 = a[2];
    var a10 = a[3], a11 = a[4], a12 = a[5];
    var a20 = a[6], a21 = a[7], a22 = a[8];

    var b00 = b[0], b01 = b[1], b02 = b[2];
    var b10 = b[3], b11 = b[4], b12 = b[5];
    var b20 = b[6], b21 = b[7], b22 = b[8];

    a[0] = b00 * a00 + b01 * a10 + b02 * a20;
    a[1] = b00 * a01 + b01 * a11 + b02 * a21;
    a[2] = b00 * a02 + b01 * a12 + b02 * a22;

    a[3] = b10 * a00 + b11 * a10 + b12 * a20;
    a[4] = b10 * a01 + b11 * a11 + b12 * a21;
    a[5] = b10 * a02 + b11 * a12 + b12 * a22;

    a[6] = b20 * a00 + b21 * a10 + b22 * a20;
    a[7] = b20 * a01 + b21 * a11 + b22 * a21;
    a[8] = b20 * a02 + b21 * a12 + b22 * a22;

    return a;
}

export function  multVec2(a,v){

}

export function  setTranslation(a,v){
    a[6] = v[0];
    a[7] = v[1];
    return a;
}

export function  translate(a,v){
    var x = v[0];
    var y = v[1];

    var a0 = a[0];
    var a1 = a[1];
    var a2 = a[2];
    var a3 = a[3];
    var a4 = a[4];
    var a5 = a[5];

    a[6] = x * a0 + y * a3 + a[6];
    a[7] = x * a1 + y * a4 + a[7];
    a[8] = x * a2 + y * a5 + a[8];

    return a;
}

export function  invert(a){
    var a00, a01, a02, a10, a11, a12, a20, a21, a22,
        a01_, a11_, a21_, det;

    a00 = a[0]; a01 = a[1]; a02 = a[2];
    a10 = a[3]; a11 = a[4]; a12 = a[5];
    a20 = a[6]; a21 = a[7]; a22 = a[8];


    a01_ =  a22 * a11 - a12 * a21;
    a11_ = -a22 * a10 + a12 * a20;
    a21_ =  a21 * a10 - a11 * a20;

    det = 1.0 / (a00 * a01_ + a01 * a11_ + a02 * a21_);

    a[0] = a01_ * det;
    a[1] = (-a22 * a01 + a02 * a21) * det;
    a[2] = (a12 * a01 - a02 * a11) * det;
    a[3] = a11_ * det;
    a[4] = (a22 * a00 - a02 * a20) * det;
    a[5] = (-a12 * a00 + a02 * a10) * det;
    a[6] = a21_ * det;
    a[7] = (-a21 * a00 + a01 * a20) * det;
    a[8] = (a11 * a00 - a01 * a10) * det;
}

export function inverted(a){
    return invert(copy(a));
}