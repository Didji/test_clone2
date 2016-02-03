function GoogleGi() {};

GoogleGi.prototype.pickAccounts = function (callback) {
  cordova.exec(callback, null, "GoogleGi", "pick", []);
};

GoogleGi.install = function () {
  window.GoogleGi = new GoogleGi();
  return window.GoogleGi;
};

cordova.addConstructor(GoogleGi.install);