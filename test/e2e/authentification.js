describe('Home Pages', function() {

    var ptor = protractor.getInstance();

    it('should load the homepage', function() {
        ptor.get('/#');
        expect(true).toBe(true);
    }, 30000);

});
