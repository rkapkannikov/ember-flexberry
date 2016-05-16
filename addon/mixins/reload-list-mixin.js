/**
 * @module ember-flexberry
 */

import Ember from 'ember';

import QueryBuilder from 'ember-flexberry-projections/query/builder';
import Condition from 'ember-flexberry-projections/query/condition';
import { StringPredicate, ComplexPredicate } from 'ember-flexberry-projections/query/predicate';

export default Ember.Mixin.create({
  reloadList: function(options) {
    let store = this.store;
    Ember.assert('Store for data loading is not defined.', store);

    let reloadOptions = Ember.merge({
      modelName: undefined,
      projectionName: undefined,
      projection: undefined,
      perPage: undefined,
      page: undefined,
      sorting: undefined,
      filter: undefined
    }, options);

    let modelName = reloadOptions.modelName;
    Ember.assert('Model name for data loading is not defined.', modelName);

    let projectionName = reloadOptions.projectionName;
    Ember.assert('Projection name for data loading is not defined.', projectionName);

    let projection = reloadOptions.projection;
    Ember.assert('Projection for data loading is not defined.', projection);

    let perPage = reloadOptions.perPage;
    let page = reloadOptions.page;
    let pageNumber = parseInt(page, 10);
    let perPageNumber = parseInt(perPage, 10);
    Ember.assert('page must be greater than zero.', pageNumber > 0);
    Ember.assert('perPage must be greater than zero.', perPageNumber > 0);

    let serializer = this.store.serializerFor(modelName);
    Ember.assert(`No serializer defined for model '${modelName}'.`, serializer);

    let sorting = reloadOptions.sorting;
    let filter = reloadOptions.filter;

    let builder = new QueryBuilder(store)
      .from(modelName)
      .selectByProjection(projectionName)
      .top(perPageNumber)
      .skip((pageNumber - 1) * perPageNumber)
      .count()
      .orderBy(
        sorting
          .map(i => `${serializer.keyForAttribute(i.propName)} ${i.direction}`)
          .join(',')
      );

    if (filter) {
      let predicate = this._getFilterPredicate(projection, { filter: filter });
      builder.where(predicate);
    }

    return store.query(modelName, builder.build());
  },

  /**
   * Returns the filter string for data loading.
   *
   * @method getFilterString
   * @param {String} modelProjection A projection used for data retrieving.
   * @param {Object} params The route URL parameters.
   */
  _getFilterPredicate: function(modelProjection, params) {
    let attrToFilterNames = [];
    let projAttrs = modelProjection.attributes;
    for (var attrName in projAttrs) {
      if (projAttrs[attrName].kind === 'attr') {
        attrToFilterNames.push(attrName);
      }
    }

    let finalString = params.lf;
    let filter = params.filter;

    if (typeof filter === 'string' && filter.length > 0) {
      finalString = this._combineFilterWithFilterByAnyMatch(this.store, finalString, filter, modelProjection.modelName, attrToFilterNames);
    }

    return finalString;
  },

  _combineFilterWithFilterByAnyMatch: function(store, currentFilter, matchPattern, modelName, modelFields) {
    let containsExpressions = modelFields.map(function(fieldName) {
      var backendFieldName = store.serializerFor(modelName).keyForAttribute(fieldName);
      return new StringPredicate(backendFieldName).contains(matchPattern);
    });

    let newExpression = containsExpressions.length > 1 ? new ComplexPredicate(Condition.Or, ...containsExpressions) : containsExpressions[0];

    // TODO: concat with currentFilter.
    return newExpression;
  }
});
