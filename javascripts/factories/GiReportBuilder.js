angular.module('smartgeomobile').factory('GiReportBuilder', function($templateCache) {
      return {
          _buildField: function(i, j, field) {
              var str, myField = 'report.activity.tabs['+i+'].fields['+j+']';
              if(field.readonly) {
                  str = '<p ng-show="'+myField+'.visible !== false"><b class="ro-label">'+field.label+'</b>';
                  str += '<span class="ro-value">{{report.roFields['+field.id+']}}</span></p>';
                  return str;
              }
              str = '<p ng-form="validatorForm" \
                         ng-show="'+myField+'.visible !== false" \
                         class="'+(field.visible === false ? 'isconsequence':'')+'">';


              str += '<label class="control-label'+(field.type=='O' ? ' prettycheckbox' : '')+'" ';
              if(field.type == 'O') {
                  str += ' ng-class="{checked: report.fields['+field.id+'] == \'Y\'}"';
              }
              str += '>';
              str += field.label;
              str += '<span class="required-marker icon-asterisk" ng-show="'+myField+'.required"></span>';
              var model = (field['default'] && field['default'].pkey) ? 'report.overrides['+field.id+']' : 'report.fields['+field.id+']',
                  placeholder = (field['default'] && field['default'].pkey) ? '{{report.roFields['+field.id+']}}' : '';
              switch(field.type) {
                  case 'D':
                      str += '<input class="form-control" \
                                         ng-required="'+myField+'.required" \
                                         type="date" \
                                         name="f" \
                                         placeholder="'+placeholder+'" \
                                         ng-model = "'+model+'"></input>';
                      break;
                  case 'T':
                      str += '<input  class="form-control" \
                                         ng-required="'+myField+'.required" \
                                         type="time" \
                                         name="f"     \
                                         placeholder="'+placeholder+'" \
                                         ng-model = "'+model+'"></input>';
                      break;
                  case 'N':
                      str += '<input class="form-control" \
                                         ng-required="'+myField+'.required" \
                                         ng-pattern="numberPattern"\
                                         type="number" \
                                         step="any" \
                                         name="f" \
                                         placeholder="'+placeholder+'" \
                                         ng-model = "'+model+'"></input>\
                                  <small class="helper-text" ng-show="validatorForm.f.$error.number">\
                                      Cette valeur doit être un nombre.\
                                  </small>';
                      break;
                  case 'L':
                      str += '<select class="form-control" \
                                          name="f" \
                                          ng-required="'+myField+'.required" \
                                          ng-model = "report.fields['+field.id+']">';
                      str += '<option></option>';
                      for(k in field.options) {
                          str += '<option value="'+field.options[k].value+'">'+field.options[k].label+'</option>';
                      }
                      str += '</select>';
                      break;
                  case 'O':
                      str += '<span><span class="icon-check pull-left yes" ></span><span class="icon-check-empty pull-left no" ></span>';
                      str += '<input type="checkbox" \
                                     class="form-control" \
                                     ng-model="report.fields['+field.id+']" \
                                     ng-click="applyConsequences('+field.id+')" \
                                     ng-true-value="Y" \
                                     ng-false-value="N"></input>';
                      str += '</span>';
                      break;
                  default:
                      str += '<input  ng-click="bidouille($event)"  ng-required="'+myField+'.required" \
                                     class="form-control" \
                                     type="text" \
                                     name="f" \
                                     placeholder="'+placeholder+'" \
                                     ng-model = "'+model+'"></input>';
                      break;
              }

              str += '</label>';
              str += '</p>';
              return str;
          },
          _buildTab: function(i, tab) {
              var str = '<div class="panel panel-default report">';
              str += '<div class="panel-heading"><h4 class="panel-title">';
              str += '        <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#report-collapse-'+i+'"';
              str += '           ng-click="toggleCollapse($event)">';
              str += tab.label;
              str += '</a></h4></div>';
              str += '<div id="report-collapse-'+i+'" class="panel-collapse'+(''+i !== '0' ? ' collapse':'')+'">';
              str += '<div class="panel-body">';
              for(var j in tab.fields) {
                  str += this._buildField(i, j, tab.fields[j]);
              }
              str += '</div></div></div>';
              return str;
          },

          buildTemplate: function(activity) {
              var str = '';
              for(var i in activity.tabs) {
                  str += this._buildTab(i, activity.tabs[i]);
              }
              return str;
          },

          alreadyBuilt: false,

          buildAllTemplates: function(acts) {
              if(this.alreadyBuilt) {
                  return;
              }
              var activity;
              for(var i in acts) {
                  activity = acts[i];
                  $templateCache.put('report-'+activity.id+'.html', this.buildTemplate(activity));
              }
          }
      };
  });
