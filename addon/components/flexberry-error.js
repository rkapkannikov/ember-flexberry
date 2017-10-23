/**
  @module ember-flexberry
*/

import Ember from 'ember';

/**
  This component displaying errors.

  @example
    templates/my-form.hbs
    ```handlebars
    {{flexberry-error error=error}}
    ```

  @class FlexberryErrorComponent
  @extends Ember.Component
*/
export default Ember.Component.extend({
  /**
    Internal property to store the error.

    @property _error
    @type Error
    @private
  */
  _error: undefined,

  /**
    Define error display mode, in `{{modal-dailog}}` or `{{ui-message}}` component.

    @property modal
    @type Boolean
    @default true
  */
  modal: true,

  /**
    Error for displaying.

    @property error
    @type Error
  */
  error: Ember.computed('_error', {
    get() {
      return this.get('_error');
    },
    set(key, value) {
      return this.set('_error', value);
    },
  }),

  actions: {
    /**
      Cleans error after displaying.

      @method actions.close
    */
    close() {
      this.set('error', null);
    },
  },
});
