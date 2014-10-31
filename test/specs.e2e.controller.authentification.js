describe('controller.authentication', function () {
    var gimapServer = element(by.model('authController.gimapServer')),
        username =  element(by.model('authController.user.username')),
        password =  element(by.model('authController.user.password')),
        parameters =  element(by.name('parameters-button')),
        loginButton = element(by.name('login-button')),
        loginURL;

    it('should accept a valid username and password', function () {
        browser.get('http://localhost:12345');
        loginURL = browser.getCurrentUrl();
        gimapServer.sendKeys('beta.smartgeo.fr');
        username.sendKeys('RESP_NORD');
        password.sendKeys('sig');
        loginButton.click();
        expect(browser.getCurrentUrl()).not.toEqual(loginURL);
    });

    it('should refuse a invalid usernam and password', function () {
        browser.get('http://localhost:12345');
        loginURL = browser.getCurrentUrl();
        username.sendKeys('RESP_NORDDDD');
        password.sendKeys('sig');
        loginButton.click();
        expect(browser.getCurrentUrl()).toEqual(loginURL);
    });
});
