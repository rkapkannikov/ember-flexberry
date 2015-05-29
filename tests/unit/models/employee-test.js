import DS from 'ember-data';
import Ember from 'ember';
import { test, moduleForModel } from 'ember-qunit';

import startApp from '../../helpers/start-app';

var App;

moduleForModel('employee', {
  // Specify the other units that are required for this test.
    needs: [],
    setup: function(){
        App = startApp();
    },
    teardown: function(){
        Ember.run(App, 'destroy');
        Ember.$.mockjax.clear();
    }
});

test('it exists', function(assert) {
  var model = this.subject();
  assert.ok(!!model);
});

test('it returns fields', function(assert) {
  var model = this.subject({ firstName: "Ivanov", lastName: "Ivan" });
  var store = this.store();
  assert.ok(model);
  assert.ok(model instanceof DS.Model);
  assert.equal(model.get('firstName'), "Ivanov");
  assert.equal(model.get('lastName'), "Ivan");
  
  // set a relationship
  Ember.run(function() {
    model.set('reportsTo', store.createRecord('employee', { firstName: "Sidorov", lastName: "Sidor" }));
  });
  
  var reportsToEmployee = model.get('reportsTo');
  assert.ok(reportsToEmployee);
  assert.equal(reportsToEmployee.get('firstName'), "Sidorov");
  assert.equal(reportsToEmployee.get('lastName'), "Sidor");
});

test('it loads fields', function(assert) {
  var store = App.__container__.lookup('store:main');
  var model = null;
  var record = null;
  Ember.run(function(){

    Ember.$.mockjax({
       url: "*Employees(99)",
       responseText: {
         "@odata.context": "http://northwindodata.azurewebsites.net/odata/$metadata#Employees(EmployeeID,FirstName,LastName,BirthDate,ReportsTo)/$entity",
         "EmployeeID": 99,
         "FirstName": "Ivan",
         "LastName": "Ivanov",
         "BirthDate": "1933-10-30T00:00:00Z",
         "ReportsTo": 98
       }
     });

    model = store.find('employee', 99);
    store.find('employee', 99).then(function(record) {
      assert.ok(record);
      assert.ok(record instanceof DS.Model);
      assert.equal(record.get('firstName'), "Ivan"); 
      assert.equal(record.get('lastName'), "Ivanov"); 
    });

    andThen(function(){});
  });
});

