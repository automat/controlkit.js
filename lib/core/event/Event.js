function Event_(sender,type,data) {
    this.sender = sender;
    this.type   = type;
    this.data   = data;
}

Event.prototype.clone = function() {
    return new Event_(this.sender,this.type,this.data);
};

module.exports = Event_;