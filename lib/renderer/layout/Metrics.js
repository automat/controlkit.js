function isPercentage(value){
    return /[0-9]*\.?[0-9]+%/.test(value);
}

function percentageToNumber(value){
    return parseFloat(value) / 100.0;
}

module.exports = {
    isPercentage : isPercentage,
    percentageToNumber : percentageToNumber
};