export function normalize(a,start,end){
    return (a - start) / (end - start);
}

export function map(a,inMin,inMax,outMin,outMax){
    return outMin + (outMax - outMin) * (a - inMin) / (inMax - inMin);
}

export function clamp(x,min,max){
    return Math.max(min,Math.min(x,max));
}