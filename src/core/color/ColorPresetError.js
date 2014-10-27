function ColorPresetFormatHexError() {
	Error.apply(this);
	Error.captureStackTrace(this,ColorPresetFormatHexError);
	this.name = 'ColorPresetFormatHexError';
	this.message = 'Preset color format should be hex.';
}
ColorPresetFormatHexError.prototype = Object.create(Error.prototype);
ColorPresetFormatHexError.constructor = ColorPresetFormatHexError;

function ColorPresetFormatRGB_RGBFV_HSB_Error(){
	Error.apply(this);
	Error.captureStackTrace(this,ColorPresetFormatRGB_RGBFV_HSB_Error);
	this.name = 'ColorPresetFormatRGB_RGBFV_HSB_Error';
	this.message = 'Preset color format should be rgb, rgbfv or hsb.';
}
ColorPresetFormatRGB_RGBFV_HSB_Error.prototype = Object.create(Error.prototype);
ColorPresetFormatRGB_RGBFV_HSB_Error.constructor = ColorPresetFormatRGB_RGBFV_HSB_Error;

module.exports = {
	ColorPresetFormatHexError : ColorPresetFormatHexError,
	ColorPresetFormatRGB_RGBFV_HSB_Error : ColorPresetFormatRGB_RGBFV_HSB_Error
};