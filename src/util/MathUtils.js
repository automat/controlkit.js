export function normalize(a,start,end){
    return (a - start) / (end - start);
}

export function clamp(x,min,max){
    return Math.max(min,Math.min(x,max));
}