// by Tomasz Glowka
// jquery-clouds 0.1

(function($){

jQuery.fn.extend({
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
    cloud: function(cmd, params){
        params = typeof params !== 'undefined' ? params : null;

        if(typeof cmd === 'string') {
            switch (cmd) {
                case 'skins':
                    return Cloud.skins;
                default:
                    break;
            }
        }
        return this;
    }
});

var defaults = {
    skin: null,
    stickTo: null,  // by default stick to previous element
    positionTo: null,  // position to offset parent of stickTo element
    orientation: 'top-center',  // bottom|top|auto-left|right|center|auto or auto==auto-center
    distance: [0, 0], // [x, y] //distance to stickTo element
    positionManually: false,
    containerStyle: {
        'z-index': 99999
    },
    containerExtraClass: '',
    cloudClick: function(element, api, event) { event.stopPropagation(); },
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

var Cloud = function(element, options){
    // If Cloud object for this element already exists, simply return it
    if(element[fieldKey])
        return element[fieldKey];

    var me = {
        // init & destroy
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
            me.$positionTo = (!me.options.positionTo) ? me.$stickTo.offsetParent() : jQuery(me.options.positionTo).first();
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
            // create container
            me.$container = jQuery('<div class="cloud-container"></div>')
                            .addClass(me.options.containerExtraClass)
                            .css(me.options.containerStyle).css(consts.containerStyle);
            me.container = me.$container.get(0);
            me.$containerParent = me.$positionTo.append(me.$container);
            me.containerParent = me.$containerParent.get(0);
            me.$containerInner =jQuery('<div class="cloud-inner"></div>').css(consts.containerInnerStyle);
            me.containerInner = me.$containerInner.get(0);
            // api refs
            me.container[fieldKey] = me.api;
            me.$container.data(dataKey, me.api);
            // place content
            me.$container.html(me.$containerInner.html(me.$element));
            // events
            me.$container.on('click.cloud', me.cloudClick)
        },
        destroyContainer: function() {
            // put element in original place
            if(me.$elementPrev.length && me.$elementPrev.parent().get(0) == me.elementParent)
                me.$elementPrev.after(me.$element);
            else
                me.$elementParent.append(me.$element);
            // destroy events
            me.$container.off('.cloud');
            // destroy container
            me.$container.remove();
        },
        destroy: function() {
            me.destroyContainer();
            // clean all databases
            deletedCloudIds.push(me.id);
            delete clouds[me.id];
            delete openClouds[me.id];
            // clean references
            me.$element.data(dataKey, null);
            me.element[fieldKey] = null;
            me = null;  // break reference == delete object
        },

        // size & position
        autoSize: function() {
            // This need to be executed under simulateOpen
            me.$container.css('height', me.$containerInner.outerHeight());
            me.$container.css('width', me.$containerInner.outerWidth());
        },
        autoPosition: function () {
            // when positioning is manual, leave
            if (me.options.positionManually)
                return;

            // get necessary data
            var orientation = me.options.orientation,
                containerHeight = me.$container.outerHeight(),
                containerWidth = me.$container.outerWidth(),
                stickToHeight = me.$stickTo.outerHeight(),
                stickToWidth = me.$stickTo.outerWidth(),
                stickToOffset = me.$stickTo.offset(),
                // initial offset -  to be changed basing on orientation
                styles = { 'top': stickToOffset.top, 'left': stickToOffset.left };

            // parse orientation
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

            // user orientation to add container dedicated class
            me.$container.addClass([or, 'sub-'+subOr].join(' '));

            // If container is not positioned to body,
            // correct its position using offset parent offset
            if(me.containerParent !== document.body) {
                // This need to be executed under simulateOpen
                var parentOffsetDiff = me.$container.offsetParent().offset();
                styles.top -= parentOffsetDiff.top;
                styles.left -= parentOffsetDiff.left;
            }

            // save
            me.$container.css(styles);
        },

        // events
        cloudClick: function(event) {
            me.options.cloudClick.apply(this, [me.element, me.api, event]);
        },

        // helpers
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

        // actions
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

        // api
        api: {
            isOpen: function() {return me.isOpen},
            getElement: function(){ return me.element},
            open: function(event) {me.open(event)},
            close: function() {me.close()},
            destroy: function() {me.destroy()}
        }
    };

    me.init(element, options);
    return me.api;
};

Cloud.skins = {
    'set': function(name, options) {
        skins[name] = options;
        delete skins[name].skin;
    },
    'get': function(name) {
        return skins[name];
    },
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

})(jQuery);
