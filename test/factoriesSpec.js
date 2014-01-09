describe('Smartgeomobile factories', function() {

    beforeEach(module('smartgeomobile'));

    it('should contain a Smartgeo factory', inject(function(Smartgeo) {
        expect(Smartgeo).not.toBe(null);
    }));

    it('should contain a G3ME factory', inject(function(G3ME) {
        expect(G3ME).not.toBe(null);
    }));

    it('should contain a SQLite factory', inject(function(SQLite) {
        expect(SQLite).not.toBe(null);
    }));

    it('should contain a Installer factory', inject(function(Installer) {
        expect(Installer).not.toBe(null);
    }));

    it('should contain a GiReportBuilder factory', inject(function(GiReportBuilder) {
        expect(GiReportBuilder).not.toBe(null);
    }));

    describe('Smartgeo factory', function(){

        it('should store and save string properly', inject(function(Smartgeo) {
            var testString = 'graou';
            Smartgeo.set('test',testString);
            expect(Smartgeo.get('test')).toEqual(testString);
        }));

        it('should store and save object properly', inject(function(Smartgeo) {
            var testObject = {'test':'array'};
            Smartgeo.set('test',testObject);
            expect(Smartgeo.get('test')).toEqual(testObject);
        }));

        it('should store and save array properly', inject(function(Smartgeo) {
            var testArray = ['graou', 'is', 'mean'];
            Smartgeo.set('test',testArray);
            expect(Smartgeo.get('test')).toEqual(testArray);
        }));

        it('should store and save array of objects properly', inject(function(Smartgeo) {
            var testArray = [
                 {'I':'WANT'}, {'TO':'BREAK'}, {'FREE':'!!!'}
            ];
            Smartgeo.set('test',testArray);
            expect(Smartgeo.get('test')).toEqual(testArray);
        }));

    });

    describe('G3ME factory', function(){

        it('should do something', inject(function(G3ME) {
            expect(true).not.toBe(false);
        }));

    });

    describe('SQLite factory', function(){

        it('should do something', inject(function(SQLite) {
            expect(true).not.toBe(false);
        }));

    });

    describe('Installer factory', function(){

        it('should do something', inject(function(Installer) {
            expect(true).not.toBe(false);
        }));

    });

    describe('GiReportBuilder factory', function(){

        it('should do something', inject(function(GiReportBuilder) {
            expect(true).not.toBe(false);
        }));

    });

});
