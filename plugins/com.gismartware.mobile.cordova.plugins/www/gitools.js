module.exports = {
	navigate: function(dest, start) {
		var args = [dest];
		if (start) {
			args.push(start);
		}
	    cordova.exec(null, null, 'gitools', 'navigate', args);
	}
};
