function GoogleGi() {};

GoogleGi.prototype.pickAccounts = function (title, success, error) {
  cordova.exec(success, error, "GoogleGi", "pick", [title]);
};

GoogleGi.install = function () {
  window.GoogleGi = new GoogleGi();
  return window.GoogleGi;
};

cordova.addConstructor(GoogleGi.install);