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
            name: 'controllerName',
            message: 'Nom du controlleur à créer'
            }, {
            type: 'checkbox',
            name: 'dependancies',
            message: 'Dependances',
            choices: factories
            }, {
            type: 'confirm',
            name: 'templateB',
            message: 'Créer un template ?'
        }];

        this.prompt(prompts, function(props) {
            this.controllerName = props.controllerName;
            this.dependancies = props.dependancies;
            this.templateB = props.templateB;
            done();
        }.bind(this));
    },

    writing: {
        app: function() {
            this.mkdir(this.destinationRoot() + '/app/javascripts/controllers/');
            this.template('_controller.js', this.destinationRoot() + '/app/javascripts/controllers/controller.' + this.controllerName + '.js', {
                'controllerName': this.controllerName,
                'dependancies': this.dependancies,
                'quotedDependancies': '\'' + this.dependancies.join('\',\'') + '\'',
            });
            if (this.templateB) {
                this.template('_controller.html', this.destinationRoot() + '/app/partials/' + this.controllerName + '.html', {
                    'controllerName': this.controllerName,
                    'controllerNameDecapitalized': this.controllerName[0].toLowerCase() + this.controllerName.slice(1),
                });
            }
            this.indexFile = this.readFileAsString(this.destinationRoot() + '/app/index.html');
            this.indexFile = this.engine(this.indexFile, this);
            this.indexFile = this.appendScripts(this.indexFile, 'javascripts/controllers/controller.' + this.controllerName + '.js', ['javascripts/controllers/controller.' + this.controllerName + '.js']);
            fs.writeFileSync(this.destinationRoot() + '/app/index.html', this.indexFile);
        }
    }
});
