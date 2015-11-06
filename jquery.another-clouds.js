// by Tomasz Glowka
// jquery-clouds 0.1.1

/**
 * @overview Tool for creating kind of popovers - clouds.
 */

/**
 * jQuery Framework
 * We use it and extend it by adding jQuery clouds interface.
 *
 * @external jQuery
 */

/**
 * DOM Element.
 * After creating Cloud wrap over Element instance, some attributes are set.
 *
 * @property {Cloud} cloudApi Reference to Cloud instance created for this element in side-effect manner.
 * @property {Cloud} data-cloud Data-style reference to Cloud instance created for this element in side-effect
 *
 * @external Element
 */


(function($){

var defaults = {
    skin: null,
    stickTo: null,  // By default stick to previous element
    positionTo: null,  // Position to offset parent of stickTo element
    orientation: 'top-center',  // bottom|top|auto-left|right|center|auto or auto==auto-center
    distance: [0, 0], // [x, y] - distance to stickTo element
    stickManually: false,
    containerStyle: {
        'z-index': 99999
    },
    containerExtraClass: '',
    cloudClick: function(element, api, event) {},
    bgClick: function(element, api, event) { api.close()}
};

var dataOptions = ['skin', 'orientation', 'stickTo', 'positionTo', 'containerExtraClass'];

var consts = {
    containerStyle: {
        display: 'block',
        position: 'absolute'
    },
    containerInnerStyle: {
        display: 'inline-block'
    }
};

var initial = {
    id: null,
    isOpen: false,
    openEvent: null,
    $openEvent: null,
    element: null,
    $element: null,
    elementParent: null,
    $elementParent: null,
    elementPrev: null,
    $elementPrev: null,
    options: {},
    container: null,
    $container: null,
    containerParent: null,
    $containerParent: null,
    containerInner: null,
    $containerInner: null,
    stickTo: null,
    $stickTo: null,
    positionTo: null,
    $positionTo: null
};

var dataKey = 'cloud',
    fieldKey = 'cloudApi',
    deletedCloudIds = [],
    cloudId = 1,
    clouds = {},
    openClouds = {},
    skins = {};

    /**
     * Create cloud wrapper around given node.
     * @constructs Cloud
     *
     * @param {Element|jQuery|Selector} element The wrapped node.
     * manner.
     * @param {Object} [options]
     * @param {String} [options.skin] Name of skin defined using {@link Cloud.skins.set}.
     * @param {String} [options.stickTo=`DOM previous node`]
     * @param {Element|jQuery|Selector} [options.positionTo=`DOM offset parent of options.stickTo`]
     * Cloud will be positioned to this element using it as offset parent.
     * @param {String} [options.orientation='top-center']
     * Possible values: bottom|top|auto-left|right|center|auto or auto==auto-center.
     * @param {Array} [options.distance=[0, 0]] Distance to stickTo element given as [x, y].
     * @param {Boolean} [options.stickManually=false] Stick manually means, cloud is left as it is.
     * Stick to stickTo element is abandon and no auto positioning takes place.
     * @param {Object} [options.containerStyle={'z-index': 99999}] Extra style to be set at cloud container.
     * @param {String} [options.containerExtraClass=''] Extra class to be appended to main cloud container.
     * @param {function} [options.cloudClick=function(element, api, event) {}]
     * Hook and default action for all clicks inside cloud.
     * @param {function} [options.bgClick=function(element, api, event) { api.close()}]
     * Hook and default action for all clicks at the backgruond (outside cloud).
     *
     * @returns {Cloud}
     */
var Cloud = function(element, options){
    // If Cloud object for this element already exists, simply return it
    if(element[fieldKey])
        return element[fieldKey];

    var me = {
        // Init & destroy
        init: function(element, options) {
            for(var f in initial) {if(initial.hasOwnProperty(f)) me[f] = initial[f]}

            me.id = deletedCloudIds.pop() || cloudId++;
            clouds[me.id] = me;
            me.$element = jQuery(element).first();
            me.element = me.$element.get(0);
            me.options = jQuery.extend(true, {}, defaults, me.optionsFromData(), options ? options : {});
            if(me.options.skin && typeof skins[me.options.skin] === 'object')
                me.options = jQuery.extend(true, {}, defaults, skins[me.options.skin],  me.optionsFromData(), options);

            me.$elementParent = me.$element.prev();
            me.elementParent = me.$elementParent.get(0);
            me.$elementPrev = me.$element.prev();
            me.elementPrev = me.$elementPrev.get(0);
            me.$stickTo = (!me.options.stickTo) ? me.$element.prev() : jQuery(me.options.stickTo).first();
            me.stickTo = me.$stickTo.get(0);
            me.$positionTo = (!me.options.positionTo) ?
                me.$stickTo.offsetParent() : jQuery(me.options.positionTo).first();
            me.positionTo = me.$positionTo.get(0);

            me.createContainer();
            me.close();
            me.element[fieldKey] = me.api;
            me.$element.data(dataKey, me.api);
            me.$element.show();

            if(!me.$stickTo.length)
                throw 'No mathing stickTo element'
        },
        createContainer: function() {
            // Create container
            me.$container = jQuery('<div class="cloud-container"></div>')
                            .addClass(me.options.containerExtraClass)
                            .css(me.options.containerStyle).css(consts.containerStyle);
            me.container = me.$container.get(0);
            me.$containerParent = me.$positionTo.append(me.$container);
            me.containerParent = me.$containerParent.get(0);
            me.$containerInner =jQuery('<div class="cloud-inner"></div>').css(consts.containerInnerStyle);
            me.containerInner = me.$containerInner.get(0);
            // API refs
            me.container[fieldKey] = me.api;
            me.$container.data(dataKey, me.api);
            // Place content
            me.$container.html(me.$containerInner.html(me.$element));
            // Events
            me.$container.on('click.cloud', me.cloudClick)
        },
        destroyContainer: function() {
            // Put element in original place
            if(me.$elementPrev.length && me.$elementPrev.parent().get(0) == me.elementParent)
                me.$elementPrev.after(me.$element);
            else
                me.$elementParent.append(me.$element);
            // Destroy events
            me.$container.off('.cloud');
            // Destroy container
            me.$container.remove();
        },
        destroy: function() {
            me.destroyContainer();
            // Clean all databases
            deletedCloudIds.push(me.id);
            delete clouds[me.id];
            delete openClouds[me.id];
            // Clean references
            me.$element.data(dataKey, null);
            me.element[fieldKey] = null;
            me = null;  // break reference == delete object
        },

        // Size & position
        autoSize: function() {
            // This need to be executed under simulateOpen
            me.$container.css('height', me.$containerInner.outerHeight());
            me.$container.css('width', me.$containerInner.outerWidth());
        },
        autoPosition: function () {
            // When sticking is manual, don't auto position element so that it sticks. Simply leave.
            if (me.options.stickManually)
                return;

            // Get necessary data
            var orientation = me.options.orientation,
                containerHeight = me.$container.outerHeight(),
                containerWidth = me.$container.outerWidth(),
                stickToHeight = me.$stickTo.outerHeight(),
                stickToWidth = me.$stickTo.outerWidth(),
                stickToOffset = me.$stickTo.offset(),
                // initial offset -  to be changed basing on orientation
                styles = { 'top': stickToOffset.top, 'left': stickToOffset.left };

            // Parse orientation
            if(!(/(auto|((top|bottom|auto)\-(left|center|right))|((left|right)\-(top|center|bottom)))/).test(orientation))
                orientation = 'auto';
            if(orientation == 'auto' || orientation == 'auto-auto')
                orientation = 'auto-center';
            var orientations = orientation.split('-'),
                or = orientations[0],
                subOr = orientations[1];

            // or == auto -> bottom v top
            if (or === 'auto') {
                var viewPortHeight = $(window).height(),
                    scrollTop = $(window).scrollTop(),
                    topOverflow = -scrollTop + stickToOffset.top - containerHeight,
                    bottomOverflow = scrollTop + viewPortHeight - (stickToOffset.top + stickToHeight + containerHeight);
                or = Math.max(topOverflow, bottomOverflow) === topOverflow ? 'top' : 'bottom';
            }

            // Orientation type  x-y
            if(or == 'top' || or == 'bottom'){
                // or == y-orientation
                styles.top += ((or === 'bottom') ? -containerHeight : stickToHeight) +
                              (or === 'bottom' ? -1 : 1) * me.options.distance[1];

                // subOr == x-orientation
                styles.left -= (
                    (subOr == 'center') ? (containerWidth - stickToWidth) / 2 :
                    (subOr == 'right') ? containerWidth - stickToWidth :
                    (subOr == 'left') ? 0 : 0
                - (subOr === 'right' ? -1 : 1) * me.options.distance[0]);
            // Orientation type  y-x
            } else {
                // or == x-orientation
                styles.left += ((or === 'right') ? -containerWidth : stickToWidth) +
                               (or === 'right' ? -1 : 1) * me.options.distance[1];
                // subOr == y-orientation
                styles.top -=  (
                    (subOr == 'center') ? (containerHeight - stickToHeight) / 2 :
                    (subOr == 'bottom') ? (containerHeight - stickToHeight) :
                    (subOr == 'top') ? 0 : 0
                - (subOr === 'bottom' ? -1 : 1) * me.options.distance[1]);
            }

            // User orientation to add container dedicated class
            me.$container.addClass([or, 'sub-'+subOr].join(' '));

            // If container is not positioned to body,
            // correct its position using offset parent offset
            if(me.containerParent !== document.body) {
                // This need to be executed under simulateOpen
                var parentOffsetDiff = me.$container.offsetParent().offset();
                styles.top -= parentOffsetDiff.top;
                styles.left -= parentOffsetDiff.left;
            }

            // Save
            me.$container.css(styles);
        },

        // Events
        cloudClick: function(event) {
            me.options.cloudClick.apply(this, [me.element, me.api, event]);
        },

        // Helpers
        simulateOpen: function(func) {
            if(me.isOpen)
                return func();
            var opacity = me.$container.css('opacity');
            me.$container.css('opacity', 0).show();
            var result = func();
            me.$container.css('opacity', opacity).hide();
            return result;
        },
        optionsFromData: function() {
            var options = {};
            for(var i = 0; i < dataOptions.length; i++) {
                var optionName = dataOptions[i],
                    val = me.$element.attr(['data', dataKey, helpers.camelCaseToDash(optionName)].join('-'));
                if(val)
                    options[optionName] = val;
            }
            return options;
        },

        // Actions
        open: function(event) {
            me.$openEvent = event instanceof jQuery.Event ? event : null;
            me.openEvent = event ? (event.originalEvent || event) : null;
            me.simulateOpen(function(){
                me.autoSize();
                me.autoPosition();
            });
            me.$container.show();
            me.isOpen = true;
            openClouds[me.id] = me;
        },
        close: function() {
            me.$container.hide();
            me.isOpen = false;
            delete openClouds[me.id];
        },

        // API
        api: {
            /**
             * Info whether cloud is open or closed.
             *
             * @memberOf Cloud
             * @instance
             * @returns {boolean} State of cloud, true if open
             */
            isOpen: function() {return me.isOpen},

            /**
             * Accessor of element wrapped by cloud.
             *
             * @memberOf Cloud
             * @instance
             * @returns {Element} Element being wrapped by cloud.
             */
            getElement: function(){ return me.element},

            /**
             * Opens cloud.
             *
             * @memberOf Cloud
             * @param {Event|jQuery.Event} [event] Event that triggered opening. It will be stored. Passing it may be
             * useful in some situations.
             */
            open: function(event) {me.open(event)},

            /**
             * Accessor of event passed (if any) when opening cloud. Used rarely.
             *
             * @memberOf Cloud
             * @instance
             * @returns {Event} Event passed when opening cloud.
             */
            getOpenEvent: function() {return me.openEvent},

            /**
             * Closes cloud.
             *
             * @memberOf Cloud
             * @instance
             */
            close: function() {me.close()},

            /**
             * Destroys cloud including created wrapper.
             *
             * @memberOf Cloud
             * @instance
             */
            destroy: function() {me.destroy()}
        }
    };

    me.init(element, options);
    return me.api;
};

    /**
     * @namespace Cloud.skins
     */
Cloud.skins = {
    /**
     * Set new or override skin.
     *
     * @function Cloud.skins.set
     * @param {String} name Name of the skin.
     * @param {Object} options Set of options this skin defines. All options as in {@link Cloud} are available,
     * except skin itself.
     */
    'set': function(name, options) {
        skins[name] = options;
        delete skins[name].skin;
    },

    /**
     * Get skin of given name.
     *
     * @function Cloud.skins.get
     * @param {String} name Name of the skin.
     * @returns {Object} Options object.
     */
    'get': function(name) {
        return skins[name];
    },

    /**
     * Get map of all skins.
     *
     * @function Cloud.skins.getAll
     * @returns {Object} Map name-options of all skins.
     */
    'getAll':function() {
        return skins
    }
};

var helpers = {
    camelCaseToDash: function(str) {
        return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }
};

var hooks = {
    bgClick: function(event) {
        var cloud;
        for(var id in openClouds) {
            if(openClouds.hasOwnProperty(id)) {
                cloud = openClouds[id];
                if(!jQuery(event.target).parents().filter(cloud.$container).length &&
                        cloud.openEvent != (event.originalEvent || event))  // prevent from closing by the same=opening event
                    cloud.options.bgClick.apply(this, [cloud.element, cloud.api, event]);
            }
        }
    }
};

var hookHooks = function() {
    jQuery(window).on('click', hooks.bgClick);
};

window.Cloud = Cloud;
jQuery(hookHooks);


jQuery.fn.extend({
    /**
     * @function cloud
     * @memberOf external:jQuery
     * @instance
     *
     * @param {'create'|'destroy'} cmd Create or destroy Cloud wraps for each of elements of jQuery.
     * @param {Object} [options] Options as for {@link Cloud}.
     * @returns {jQuery}
     */

    cloud: function(cmd, options) {
        options = typeof options !== 'undefined' ? options : {};
        var $this = this;
        if(!$this.length)
            return $this;

        var eachExecute;
        switch(cmd) {
            case 'create':
                eachExecute = function(index, element){
                    Cloud(element, options);
                };
                break;
            case 'destroy':
                eachExecute = function(index, element){
                    if(jQuery(element).data(dataKey)) {
                        jQuery(element).data(dataKey).destroy();
                    }
                };
                break;
            default:
                eachExecute = function(){};
                break;
        }

        $this.each(eachExecute);
        return $this;
    }
});

jQuery.extend({
    /**
     * @member cloud
     * @memberOf external:jQuery
     * @static
     *
     * @property {Object} cloud.skins Alias of {@link Cloud.skins}
     */
    cloud: {
        'skins': Cloud.skins
    }
});

})(jQuery);
