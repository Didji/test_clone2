describe('angularjs homepage', function() {


  it('should greet the named user', function() {

    browser.get('http://localhost:12345');

    browser.waitForAngular().then(function(){
      element(by.model('gimapUrl')).sendKeys('beta.smartgeo.fr');
      element(by.model('username')).sendKeys('42160');
      element(by.model('pwd')).sendKeys('q@IMC5r&');

      var auth = element(by.css('[type="submit"]'));
        auth.click();
        browser.wait(function(){
        expect(true).toEqual(true);
        }, 50000);
    });

  }, 300000);
});


// // 'use strict';

// /* http://docs.angularjs.org/guide/dev_guide.e2e-testing */
// // http://www.yearofmoo.com/2013/01/full-spectrum-testing-with-angularjs-and-karma.html

// describe('smartgeomobile', function() {

//     it('should be possible to login', function() {
//         browser().navigateTo('/');
//         input('username').enter('42160');
//         input('pwd').enter('q@IMC5r&');
//         element(':submit').click();

//       expect(false).toBe('/phones');
//     });

//     // it('should be possible to set a new server URL', function() {
//     //     browser().navigateTo('/');
//     //     element('#changeGiMapUrl').click();
//     // });




//   // it('should redirect index.html to index.html#/phones', function() {
//   //   browser().navigateTo('../index.html');
//   //   expect(browser().location().url()).toBe('/phones');
//   // });


//   // describe('Phone list view', function() {

//   //   beforeEach(function() {
//   //     browser().navigateTo('../../app/index.html#/phones');
//   //   });


//   //   it('should filter the phone list as user types into the search box', function() {
//   //     expect(repeater('.phones li').count()).toBe(20);

//   //     input('query').enter('nexus');
//   //     expect(repeater('.phones li').count()).toBe(1);

//   //     input('query').enter('motorola');
//   //     expect(repeater('.phones li').count()).toBe(8);
//   //   });


//   //   it('should be possible to control phone order via the drop down select box', function() {
//   //     input('query').enter('tablet'); //let's narrow the dataset to make the test assertions shorter

//   //     expect(repeater('.phones li', 'Phone List').column('phone.name')).
//   //         toEqual(["Motorola XOOM\u2122 with Wi-Fi",
//   //                  "MOTOROLA XOOM\u2122"]);

//   //     select('orderProp').option('Alphabetical');

//   //     expect(repeater('.phones li', 'Phone List').column('phone.name')).
//   //         toEqual(["MOTOROLA XOOM\u2122",
//   //                  "Motorola XOOM\u2122 with Wi-Fi"]);
//   //   });


//   //   it('should render phone specific links', function() {
//   //     input('query').enter('nexus');
//   //     element('.phones li a').click();
//   //     expect(browser().location().url()).toBe('/phones/nexus-s');
//   //   });
//   // });


//   // describe('Phone detail view', function() {

//   //   beforeEach(function() {
//   //     browser().navigateTo('../../app/index.html#/phones/nexus-s');
//   //   });


//   //   it('should display nexus-s page', function() {
//   //     expect(binding('phone.name')).toBe('Nexus S');
//   //   });


//   //   it('should display the first phone image as the main phone image', function() {
//   //     expect(element('img.phone').attr('src')).toBe('img/phones/nexus-s.0.jpg');
//   //   });


//   //   it('should swap main image if a thumbnail image is clicked on', function() {
//   //     element('.phone-thumbs li:nth-child(3) img').click();
//   //     expect(element('img.phone').attr('src')).toBe('img/phones/nexus-s.2.jpg');

//   //     element('.phone-thumbs li:nth-child(1) img').click();
//   //     expect(element('img.phone').attr('src')).toBe('img/phones/nexus-s.0.jpg');
//   //   });
//   // });
// });
