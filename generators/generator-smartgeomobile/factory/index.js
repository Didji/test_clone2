'use strict';

var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var fs = require('fs');

module.exports = yeoman.generators.Base.extend({

    initializing: function() {
        this.pkg = require('../package.json');
    },

    prompting: function() {
        var done = this.async();

        this.log('Welcome to the best ' + chalk.red('Smartgeomobile') + ' generator!');

        var files = fs.readdirSync(this.destinationRoot() + '/app/javascripts/factories/');
        var factories = [] ;

        for (var i = 0, ii = files.length; i < ii; i++) {
            files[i] = files[i].split('.');
            if (files[i].indexOf('js') === -1) {
                continue;
            }
            if (files[i][files[i].length - 2]) {
                factories.push(files[i][files[i].length - 2]);
            }
        }
        var prompts = [{
            type: 'input',
            name: 'factoryName',
            message: 'Nom de la factory à créer'
            }, {
            type: 'checkbox',
            name: 'dependancies',
            message: 'Dependances',
            choices: factories
        }];

        this.prompt(prompts, function(props) {
            this.factoryName = props.factoryName;
            this.dependancies = props.dependancies;
            done();
        }.bind(this));
    },

    writing: {
        app: function() {
            this.mkdir(this.destinationRoot() + '/app/javascripts/factories/');
            this.template('_factory.js', this.destinationRoot() + '/app/javascripts/factories/factory.' + this.factoryName + '.js', {
                'factoryName': this.factoryName,
                'dependancies': this.dependancies,
                'quotedDependancies': '\'' + this.dependancies.join('\',\'') + '\'',
            });
            this.indexFile = this.readFileAsString(this.destinationRoot() + '/app/index.html');
            this.indexFile = this.engine(this.indexFile, this);
            this.indexFile = this.appendScripts(this.indexFile, 'javascripts/factories/factory.' + this.factoryName + '.js', ['javascripts/factories/factory.' + this.factoryName + '.js']);
            fs.writeFileSync(this.destinationRoot() + '/app/index.html', this.indexFile);
        }
    }
});
