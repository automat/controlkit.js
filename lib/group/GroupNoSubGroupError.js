function GroupNoSubGroupError() {
	Error.apply(this);
	Error.captureStackTrace(this,GroupNoSubGroupError);
	this.name = 'PanelNoGroupError';
	this.message = 'Group has no SubGroup.';
}
GroupNoSubGroupError.prototype = Object.create(Error.prototype);
GroupNoSubGroupError.constructor = GroupNoSubGroupError;

module.exports = GroupNoSubGroupError;