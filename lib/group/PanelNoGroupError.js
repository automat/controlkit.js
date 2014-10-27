function PanelNoGroupError() {
	Error.apply(this);
	Error.captureStackTrace(this,PanelNoGroupError);
	this.name = 'PanelNoGroupError';
	this.message = 'Panel has no Group.';
}
PanelNoGroupError.prototype = Object.create(Error.prototype);
PanelNoGroupError.constructor = PanelNoGroupError;

module.exports = PanelNoGroupError;