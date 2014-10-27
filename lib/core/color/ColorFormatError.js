function ColorFormatHexError() {
	Error.apply(this);
	Error.captureStackTrace(this,ColorFormatHexError);
	this.name = 'ColorFormatHexError';
	this.message = 'Color format should be hex. Set colorMode to rgb, rgbfv or hsb.';
}
ColorFormatHexError.prototype = Object.create(Error.prototype);
ColorFormatHexError.constructor = ColorFormatHexError;

function ColorFormatRGB_RGBFV_HSB_Error(){
	Error.apply(this);
	Error.captureStackTrace(this,ColorFormatRGB_RGBFV_HSB_Error);
	this.name = 'ColorFormatRGB_RGBFV_HSB_Error';
	this.message = 'Color format should be rgb, rgbfv or hsb. Set colorMode to hex.';
}

ColorFormatRGB_RGBFV_HSB_Error.prototype = Object.create(Error.prototype);
ColorFormatRGB_RGBFV_HSB_Error.constructor = ColorFormatRGB_RGBFV_HSB_Error;

module.exports = {
	ColorFormatHexError : ColorFormatHexError,
	ColorFormatRGB_RGBFV_HSB_Error : ColorFormatRGB_RGBFV_HSB_Error
};