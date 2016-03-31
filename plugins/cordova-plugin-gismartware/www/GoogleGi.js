function GoogleGi() {};

GoogleGi.prototype.pickAccounts = function (title, domain, success, error) {
  cordova.exec(success, error, "GoogleGi", "pick", [title, domain]);
};

GoogleGi.prototype.isConnected = function (params, success, error) {
  cordova.exec(success, error, "GoogleGi", "isConnected", [params]);
};

GoogleGi.install = function () {
  window.GoogleGi = new GoogleGi();
  return window.GoogleGi;
};

cordova.addConstructor(GoogleGi.install);
