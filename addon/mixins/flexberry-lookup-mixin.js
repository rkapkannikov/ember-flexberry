/**
 * @module ember-flexberry
 */

import Ember from 'ember';

import QueryBuilder from 'ember-flexberry-projections/query/builder';
import { StringPredicate } from 'ember-flexberry-projections/query/predicate';

import ReloadListMixin from '../mixins/reload-list-mixin';

/**
 * Mixin for {{#crossLink "DS.Controller"}}Controller{{/crossLink}} to support work with modal windows at lookups.
 *
 * @class FlexberryLookupMixin
 * @extends Ember.Mixin
 * @uses ReloadListMixin
 * @public
 */
export default Ember.Mixin.create(ReloadListMixin, {
  /**
   * Lookup settings for modal window.
   * It has to be overriden on controller where this mixin is used.
   *
   * @property lookupSettings
   * @type Object
   */
  lookupSettings: {
    /**
     * Name of controller that handles modal window.
     * Controller with the same name has to be injected to property `lookupController`.
     *
     * @property controllerName
     * @type String
     * @default undefined
     */
    controllerName: undefined,

    /**
     * Name of template for modal window itself (not content of modal window).
     *
     * @property template
     * @type String
     * @default undefined
     */
    template: undefined,

    /**
     * Name of template for content of modal window.
     *
     * @property contentTemplate
     * @type String
     * @default undefined
     */
    contentTemplate: undefined,

    /**
     * Name of template for content of loading modal window.
     *
     * @property loaderTemplate
     * @type String
     * @default undefined
     */
    loaderTemplate: undefined
  },

  /**
   * Controller to show lookup modal window.
   *
   * @property lookupController
   * @type Ember.InjectedProperty
   * @default undefined
   */
  lookupController: undefined,

  /**
   * Service for auth matters.
   * FlexberryAuthService is injected here by default.
   *
   * @property currentAuthService
   * @type Service
   */
  currentAuthService: Ember.inject.service('flexberry-auth-service'),

  actions: {
    /**
     * Handles action from lookup choose action.
       It opens modal window where availible values are shown.

       In order to customize content of all lookup modal window there is such a way:
       1) create template with necessary content and set unique name for it (for example 'customlookupform.hbs');
       2) override lookup setting `lookupSettings.contentTemplate` on controller level (for example 'customlookupform');
       3) if there has to be specific logic or properties on controller for template,
          current lookup controller can be overriden (it is 'lookup-dialog' for edit forms),
          new name can be set on lookup setting `lookupSettings.controllerName`
          and new controller can be injected as `lookupController`
          (if the controller was extended and not reopened).

     * @method showLookupDialog
     * @param {Object} chooseData Lookup parameters (projection name, relation name, etc).
     */
    showLookupDialog: function(chooseData) {
      let options = Ember.$.extend(true, {
        projection: undefined,
        relationName: undefined,
        title: undefined,
        limitFunction: undefined,
        predicate: undefined,
        modelToLookup: undefined,
        sizeClass: undefined,
        lookupWindowCustomPropertiesData: undefined
      }, chooseData);

      // TODO: remove later
      let limitFunction = options.limitFunction;
      Ember.assert(`Parameter 'limitFunction' has been removed. Use 'predicate' to specify limits.`, !limitFunction);

      let projectionName = options.projection;
      Ember.assert('ProjectionName is undefined.', projectionName);

      let relationName = options.relationName;
      let title = options.title;
      let modelToLookup = options.modelToLookup;
      let lookupWindowCustomPropertiesData = options.lookupWindowCustomPropertiesData;
      let sizeClass = options.sizeClass;

      let model = modelToLookup ? modelToLookup : this.get('model');

      // Get ember static function to get relation by name.
      var relationshipsByName = Ember.get(model.constructor, 'relationshipsByName');

      // Get relation property from model.
      var relation = relationshipsByName.get(relationName);
      if (!relation) {
        throw new Error(`No relation with '${relationName}' name defined in '${model.constructor.modelName}' model.`);
      }

      // Get property type name.
      var relatedToType = relation.type;

      // Get property type constructor by type name.
      var relatedTypeConstructor = this.store.modelFor(relatedToType);

      // Get a projection from related type model.
      var projection = Ember.get(relatedTypeConstructor, 'projections')[projectionName];
      if (!projection) {
        throw new Error(`No projection with '${projectionName}' name defined in '${relatedToType}' model. `);
      }

      // Lookup
      var lookupSettings = this.get('lookupSettings');
      Ember.assert('Lookup settings are undefined.', lookupSettings);
      Ember.assert('Lookup template is undefined.', lookupSettings.template);

      this.send('showModalDialog', lookupSettings.template);

      let reloadData = {
        relatedToType: relatedToType,
        projectionName: projectionName,
        projection: projection,

        perPage: 10, // TODO: get default values.
        page: 1,
        sorting: [],
        filter: undefined,

        title: title,
        sizeClass: sizeClass,
        saveTo: {
          model: model,
          propName: relationName
        },
        currentLookupRow: model.get(relationName),
        customPropertiesData: lookupWindowCustomPropertiesData
      };

      this._reloadModalData(this, reloadData);
    },

    /**
     * Handles correcponding route's willTransition action.
     * It sends message about transition to showing lookup modal window controller.
     *
     * @method routeWillTransition
     */
    routeWillTransition: function() {
      this.get('lookupController').send('routeWillTransition');
    },

    /**
     * Handles action from lookup remove action.
     *
     * @method removeLookupValue
     * @param {Object} removeData Lookup parameters (projection name, etc).
     */
    removeLookupValue: function(removeData) {
      let options = Ember.$.extend(true, {
        relationName: undefined,
        modelToLookup: undefined
      }, removeData);
      let relationName = options.relationName;
      let modelToLookup = options.modelToLookup;

      let model = modelToLookup ? modelToLookup : this.get('model');
      model.set(relationName, undefined);

      // Manually make record dirty, because ember-data does not do it when relationship changes.
      model.makeDirty();
    },

    /**
     * Update relation value at model.
     *
     * @method updateLookupValue
     * @param {Object} updateData Lookup parameters to update data at model (projection name, etc).
     */
    updateLookupValue: function(updateData) {
      let options = Ember.$.extend(true, {
        relationName: undefined,
        newRelationValue: undefined,
        modelToLookup: undefined
      }, updateData);
      let relationName = options.relationName;
      let newRelationValue = options.newRelationValue;
      let modelToLookup = options.modelToLookup;
      let model = modelToLookup ? modelToLookup : this.get('model');
      let relationType = this._getRelationType(model, relationName);
      var payload = {};
      payload[relationType + 's'] = [newRelationValue];
      this.store.pushPayload(relationType, payload);
      let realRelationValue = this.store.peekRecord(relationType, newRelationValue[this.store.serializerFor(relationType).get('primaryKey')]);

      model.set(relationName, realRelationValue);

      // Manually make record dirty, because ember-data does not do it when relationship changes.
      model.makeDirty();
    },

    /**
     * Forms url to get all availible entities of certain relation.
     *
     * @method getLookupAutocompleteUrl
     * @param {String} relationName Elements for this relation will be searched.
     * @return {Object} Formed url.
     */
    getLookupAutocompleteUrl(relationName) {
      var relatedToType = this._getRelationType(this.get('model'), relationName);
      return this.urlForFindAll(relatedToType);
    },

    /**
     * Forms query by lookup autocomplete parameters.
     *
     * @method getAutocompleteLookupQueryOptions
     * @param {Object} lookupParameters Lookup autocomplete parameters (current limit function, etc).
     * @return {Object} Formed query.
     */
    getAutocompleteLookupQueryOptions(lookupParameters) {
      let options = Ember.$.extend(true, {
        relationName: undefined
      }, lookupParameters);

      let relationName = options.relationName;
      let relationType = this._getRelationType(this.get('model'), relationName);

      // TODO: Projections?
      let builder = new QueryBuilder(this.store)
        .from(relationType)
        .where(new StringPredicate(options.limitField).contains(options.limitValue))
        .top(options.top);

      return builder.build();
    },

    /**
     * It updates autocomplete lookup xhr before send in order to add necessary auth information.
     *
     * @method updateAutocompleteLookupXhr
     * @param {Object} [options] Lookup autocomplete parameters.
     * @param {Object} options.xhr Autocomplete lookup xhr to send.
     * @param {Object} options.element Current autocomplete lookup.
     * @return {Object} Updated method parameters.
     */
    updateAutocompleteLookupXhr: function(options) {
      this.get('currentAuthService').authCustomRequest(options);
      return options;
    }
  },

  /**
   * This method refreshes displayed data on lookup modal window.

     It reloads current lookup modal window in order to show loading image.
     Then proper request to load data is formed (it considers current page, filter, etc).
     After the data loading data are displayed on lookup modal window.

     This method is called during the first data loading
     and after each change of request parameters (current page, filter, etc) on lookup modal window controller
     (it is implemented by sending handler on this method to lookup modal window controller).

   * @method _reloadModalData
   * @private
   *
   * @param {String} currentContext Current execution context of this method.
   * @param {Object} options Parameters to load proper data and to tune modal lookup window outlook.
   * @param {String} [options.id] ID of a record.
   */
  _reloadModalData: function(currentContext, options) {
    var lookupSettings = currentContext.get('lookupSettings');
    Ember.assert('Lookup settings are undefined.', lookupSettings);
    Ember.assert('Lookup template is undefined.', lookupSettings.template);
    Ember.assert('Lookup content template is undefined.', lookupSettings.contentTemplate);
    Ember.assert('Lookup loader template is undefined.', lookupSettings.loaderTemplate);

    let reloadData = Ember.merge({
      relatedToType: undefined,
      projectionName: undefined,
      projection: undefined,

      perPage: undefined,
      page: undefined,
      sorting: undefined,
      filter: undefined,

      title: undefined,
      sizeClass: undefined,
      saveTo: undefined,
      currentLookupRow: undefined,
      customPropertiesData: undefined
    }, options);

    Ember.assert('Reload data are not defined fully.',
      reloadData.relatedToType ||
      reloadData.projectionName ||
      reloadData.projection ||
      reloadData.saveTo);

    var loadingParams = {
      view: lookupSettings.template,
      outlet: 'modal-content'
    };
    currentContext.send('showModalDialog', lookupSettings.loaderTemplate, null, loadingParams);

    let queryParameters = {
      modelName: reloadData.relatedToType,
      projectionName: reloadData.projectionName,
      projection: reloadData.projection,
      perPage: reloadData.perPage ? reloadData.perPage : 10, // TODO: get default values.
      page: reloadData.page ? reloadData.page : 1, // TODO: get default values.
      sorting: [], // TODO: get current value.
      filter: reloadData.filter // TODO: get current value.
    };

    currentContext.reloadList(queryParameters).then(data => {
      currentContext.send('removeModalDialog', loadingParams);

      let controller = currentContext.get('lookupController');
      controller.clear();
      controller.setProperties({
        modelProjection: reloadData.projection,
        title: reloadData.title,
        sizeClass: reloadData.sizeClass,
        saveTo: reloadData.saveTo,
        currentLookupRow: reloadData.currentLookupRow,
        customPropertiesData: reloadData.customPropertiesData,
        reloadDataHandler: currentContext._reloadModalData,

        perPage: queryParameters.perPage,
        page: queryParameters.page,
        sort: undefined, // TODO: set data.
        filter: reloadData.filter,

        modelType: reloadData.relatedToType,
        projectionName: reloadData.projectionName,
        projection: reloadData.projection,
        reloadContext: currentContext
      });

      controller.set('reloadObserverIsActive', true);

      currentContext.send('showModalDialog', lookupSettings.contentTemplate, {
        controller: controller,
        model: data
      }, loadingParams);
    });
  },

  /**
   * Gets related object type by relation name from specified model.
   *
   * @method _getRelationType
   * @param {String} model Specified model to get relation from.
   * @param {String} relationName Relation name.
   * @return {String} Related object type.
   * @throws {Error} Throws error if relation was not found at model.
   */
  _getRelationType: function(model, relationName) {
    // Get ember static function to get relation by name.
    var relationshipsByName = Ember.get(model.constructor, 'relationshipsByName');

    // Get relation property from model.
    var relation = relationshipsByName.get(relationName);
    if (!relation) {
      throw new Error(`No relation with '${relationName}' name defined in '${model.constructor.modelName}' model.`);
    }

    let relationType = relation.type;
    return relationType;
  }
});
