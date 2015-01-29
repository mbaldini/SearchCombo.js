(function ($) {
    "use strict";
    /// provides class-type functionality
    function Class(members) {
        var cls = function () {
            return this.ctor.apply(this, arguments);
        };
        if (members.ctor === undefined) {
            members.ctor = function () { };
        }
        cls.prototype = members;
        return cls;
    }

    /// returns the displayValue of the given item
    function getItemLabel(item) {
        if ($.type(item) === 'string') {
            return item;
        }
        return item.label;
    }

    // http://benalman.com/projects/jquery-misc-plugins/#scrollbarwidth
    var theScrollbarWidth = (function () {
        var width;
        return function () {
            var parent, child;
            if (width === undefined) {
                parent = $('<div style="width:50px;height:50px;overflow:auto"><div/></div>').appendTo('body');
                child = parent.children();
                width = child.innerWidth() - child.height(99).innerWidth();
                parent.remove();
            }
            return (width < 20) ? 20 : width;
        };
    }()),

        dropDown = new Class({

            /// Constructor for the control
            ctor: function (args) {
                // set the max number of items based on the arguments
                this.maxItems = Math.max(args.maxItems || 0, 0);

                // set the handleEvent variable
                this.handleEvent = args.handleEvent;

                // set the dom element and configure it for this control
                this.dom = args.element;
                // set the css classes for ui rendering
                // TODO: make the css class easily configurable
                this.dom.addClass('dropdown ui-widget-content ui-corner-all');
                // set the eventhandlers for mouseenter and mouseleave
                this.dom.on('mouseenter mouseleave', '.item',
                             function () {
                        var li = $(this);
                        li.siblings().removeClass('ui-state-hover');
                        li.toggleClass('ui-state-hover');
                    });
                // the list is rendered using the 'ui-menu' css class
                // TODO: make the css class easily configurable
                this.list = $('<ul class="ui-menu">').appendTo(this.dom);
                this.list.on('mousedown mouseup', 'li a', $.proxy(
                    function (e) {
                        if (e.type === 'mouseup') {
                            this.dom.triggerHandler('select', this.value());
                        }
                        this.handleEvent(e.originalEvent);
                    },
                    this
                ));

                // init the scrollBar and scrolltop variables
                this.scrollBar = null;
                this.scrollTop = 0;
            },

            /// Remove the entire control from the dom
            dispose: function () {
                // remove and destroy the dom element
                this.dom.remove();
                this.dom = null;
            },

            /// Scroll to and highlight the next item in the list
            goNext: function () {
                // TODO: make the css class easily configurable
                var current = this.list.find('li.ui-state-hover'),
                    maxScrollTop = this.getScrollTop(),
                    newScrollTop = this.scrollTop + this.itemHeight;
                if (current.length === 0) {
                    // no items are selected. Select the first one.
                    // TODO: make the css class easily configurable
                    this.list.find('li').first().addClass('ui-state-hover');
                } else {
                    // check to see if the current item is the last in the list
                    if (current.index() === this.list.find('li').length - 1) {
                        // we are on the last item.
                        // check to see if the visible list is at the end.
                        if (this.scrollTop < maxScrollTop) {
                            // we are not at the end of the visible list. Scroll it.
                            // if we are near the end, go all the way.
                            if (newScrollTop + this.itemHeight > maxScrollTop) {
                                newScrollTop = maxScrollTop;
                            }

                            // scroll to the item we want....
                            this.scroll(newScrollTop);
                            // and highlight it.
                            this.highlight(this.list.find('li').length - 1);
                        }

                    } else {
                        // we are not currently on the last item. So move by one.
                        this.highlight(current.index() + 1);
                    }
                }
            },

            /// Scroll up one full page of items in the dropdown list
            goNextPage: function () {

            },

            /// Scroll to and highlight the previous item in the list.
            goPrevious: function () {

                // TODO: make the css class easily configurable
                var current = this.list.find('li.ui-state-hover'),
                    newScrollTop = this.scrollTop - this.itemHeight;

                if (current.length > 0) {
                    // if the current item is the first on the list....
                    if (current.index() === 0) {
                        // and we are currently scrolled elsewhere....
                        if (this.scrollTop > 0) {
                            // if we are near the top, just go there.
                            if (newScrollTop - this.itemHeight < 0) {
                                newScrollTop = 0;
                            }

                            // scroll to the new position....
                            this.scroll(newScrollTop);
                            // and highlight the first item in the list
                            this.highlight(0);
                        }
                    } else {
                        this.highlight(current.index() - 1);
                    }
                }
            },

            /// Scroll down one full page of items in the dropdown list
            goPreviousPage: function () {

            },

            /// Get the value from the underlying datasource of the currently selected item
            value: function () {
                // TODO: make the css class easily configurable
                var current = this.list.find('li.ui-state-hover'),
                    index = current.index(),
                    bodyTop = this.scrollTop * (this.bodyHeight / this.scrollBodyHeight);

                if (current.length === 0) {
                    return null;
                } else {
                    if (this.needsScrollBar()) {
                        // the item at index 0 in the list may not always be the
                        // first item in the underlying data source. So we must
                        // calculate the real index, and proceed from there.
                        index += Math.floor(bodyTop / this.itemHeight);
                    }
                    return this.items[index];
                }
            },

            /// Set the currently selected item based off of its position in the data source
            setIndex: function (index) {
                var items = this.list.children();

                // TODO: make the css class easily configurable
                if (items[index] !== undefined && items[index] !== null && !$(items[index]).hasClass('ui-state-hover')) {
                    // TODO: make the css class easily configurable
                    $(items[index]).addClass('ui-state-hover');
                }
            },

            getIndex: function () {
                // TODO: make the css class easily configurable
                var current = this.list.find('li.ui-state-hover'),
                    index = 0,
                    bodyTop = this.scrollTop * (this.bodyHeight / this.scrollBodyHeight);
                if (current.length === 0) {
                    return -1;
                } else {
                    index = current.index();
                    if (this.needsScrollBar()) {
                        // the item at index 0 in the list may not always be the
                        // first item in the underlying data source. So we must
                        // calculate the real index, and proceed from there.
                        index += Math.floor(bodyTop / this.itemHeight);
                    }
                    return index;
                }
            },

            /// Set the provided items as the lists datasource and render them as needed
            setAndRender: function (items) {
                // set the underlying list
                this.items = items;
                // render the visible items
                this.renderItems(items.slice(0, this.maxItems > 0 ? this.maxItems : items.length));

                // Determine if a scroll bar is necessary....
                if (this.needsScrollBar()) {
                    // if so, create it
                    this.createScrollBar();
                } else {
                    // if not, destroy it
                    this.destroyScrollBar();
                }

            },

            /// Determines whether or not a scrollBar is required to display all of the items
            needsScrollBar: function () {
                return this.maxItems > 0 && this.maxItems < this.items.length;
            },

            /// Gets the topmost index of the visible area
            getScrollTop: function () {
                return this.items.needsScrollBar() ? this.scrollBodyHeight - this.scrollBar.height() : 0;
            },

            /// Renders a single item from the list
            renderItem: function (item) {
                // TODO: make the css class easily configurable
                var li = $('li class="item ui-menu-item><a class="ui-corner-all" tabindex="-1">' + getItemLabel(item) + '</a></li>');
                this.list.append(li);
                return li;
            },

            /// Renders all of the items that will be visible
            renderItems: function (items) {
                this.list.empty();
                var ret = [], i = 0;
                for (i = 0; i < items.length; i += 1) {
                    ret.push(this.renderItem(items[i]));
                }
                return ret;
            },

            /// creates a scrollbar for the list
            createScrollBar: function () {
                this.itemWidth = this.dom.width() - theScrollbarWidth();
                this.itemHeight = this.list.find('li').outerHeight(true);

                // set the width of the items
                this.list.find('li').css('width', this.itemWidth + 'px');

                this.scrollBar = $('<div class="scrollbar"><div></div></div>').width(theScrollbarWidth()).appendTo(this.dom);

                // set the bodyHeight to total height of all items in the datasource
                this.bodyHeight = this.itemHeight * this.items.length;

                // set the height of the scrollbar body to be the bodyHeight plus any padding from the list container
                this.scrollBodyHeight = (this.dom.outerHeight() - this.itemHeight * this.maxItems) + this.bodyHeight;
                this.scrollBar.find('div').width(1);
                this.scrollBar.find('div').height(this.scrollBodyHeight);

                this.scrollBar.on('scroll', $.proxy(this.onScroll, this));
                this.scrollBar.on('mousedown', $.proxy(
                    function (e) {
                        this.handleEvent(e.originalEvent);
                    },
                    this
                ));

                this.dom.on('mousewheel', $.proxy(
                    function (e) {
                        this.scrollBar.scrollTop(this.scrollbar.scrollTop() + e.deltaY * -100);
                    },
                    this
                ));

                this.dom.css({
                    'height': this.dom.outerHeight() + 'px',
                    'overflow': 'hidden'
                });

                this.list.css({
                    'position': 'absolute',
                    'top': '0px'
                });
            },

            /// destroys the scrollbar and removes it from the dom
            destroyScrollBar: function () {
                if (this.scrollbar !== null) {
                    this.scrollBar.remove();
                    this.scrollbar = null;
                    this.dom.css({
                        'height': 'auto'
                    });
                    this.list.css({
                        'position': 'relative'
                    });
                    this.dom.off('mousewheel');
                    this.list.find('li').css('width', '100%');
                }
            },

            /// eventHandler for the scroll of the list
            onScroll: function () {
                // find the top location of the first item
                var scrollTop = this.scrollBar.scrollTop(),
                    bodyTop = 0,
                    top = 0,
                    count = 0,
                    first = 0;

                // if it is different from the saved value....
                if (this.scrollTop !== scrollTop) {
                    this.scrollTop = scrollTop;

                    // find the height + padding of the body
                    bodyTop = scrollTop * (this.bodyHeight / this.scrollBodyHeight);

                    // get the top of the list in px
                    top = -(bodyTop % this.itemHeight);

                    // get the number of items displayed
                    count = Math.ceil((this.itemHeight * this.maxItems + -top) / this.itemHeight);

                    // find the index of the first item that is visible
                    first = Math.floor(bodyTop / this.itemHeight);

                    // render the items to be displayed
                    this.renderItems(this.items.slice(first, first + count));
                    // set the css width for the newly displayed items
                    this.list.find('li').css('width', this.itemWidth + 'px');
                    // and finally set the css top for the list
                    this.list.css('top', top);
                }
            },

            /// Scrolls the list by the given amount
            scroll: function (px) {
                this.scrollBar.scrollTop(px);
                this.onScroll();
            },

            /// Highlights (selects) the item at the given index.
            highlight: function (index) {
                // TODO: make the css class easily configurable
                this.list.find('li.ui-state-hover').removeClass('ui-state-hover');
                // TODO: make the css class easily configurable
                this.list.find('li').eq(index).addClass('ui-state-hover');
            }

        }),

        SearchCombo  = new Class({

            /// constructor
            ctor: function (element, config) {
                // set the dom variable to the parent element of this control
                this.dom = element;
                // set the class for this dom element
                this.dom.addClass('searchCombo');

                // append the autocomplete info to the element
                this.input = $('<input autocomplete=\'off\'>').appendTo(this.dom);
                // set the handler for keypress event
                this.input.on('keypress', $.proxy(this.onKeyPress, this));
                // set the handler for keydown event
                this.input.on('keydown', $.proxy(this.onKeyDown, this));
                // set the handler for the blur event
                this.input.on('blur', $.proxy(this.onBlur, this));

                // add a span for 'caret'
                // TODO: make the css class easily configurable
                this.arrow = $('<span class="caret">').appendTo(this.dom);
                // set the handler for the mousedown event
                this.arrow.on('mousedown', $.proxy(this.onArrowMouseDown, this));

                // set the configuration data
                this.config = config;
                // check to see if the source is a function
                if (!$.isFunction(this.config.source)) {
                    // if it isn't, convert it to a function that returns the original object
                    var source = this.config.source;
                    this.config.source = function () {
                        return source;
                    };
                }

                // declare the dropdown object
                this.dropdown = null;

                // declare the handled events
                this.handledEvents = [];

                // set the document's mousedown event
                $(document).on('mousedown', $.proxy(this.onDocumentMouseDown, this));

                // declare the selectedItem variable
                this.selectedItem = null;
            },

            /// Gets the selected value of the combo box
            value: function (item) {
                // check to see if the provided item is defined
                if (item === undefined) {
                    // if it is not, simply return the currently selected item
                    return this.selectedItem;
                } else {
                    // if it is, attempt to find it in the datasource
                    var source = this.config.source();
                    if ($.inArray(item, source) === -1) {
                        // attempt to find it in the datasource.
                        item = source.filter(function (x) { return x.value === item; })[0];
                        // if it is undefined (not in the datasource), set it to null
                        if (item === undefined) {
                            item = null;
                        }
                    }
                    // set it as the selected item
                    this.selectItem(item);
                }
            },

            /// disposes of the combo box
            dispose: function () {
                // remove it from the dom and set the dom to null
                this.dom.remove();
                this.dom = null;
            },

            /// sets the datasource for the items
            source: function (source) {
                // if there are no arguments, return the config source
                if (arguments.length === 0) {
                    return this.config.source();
                } else {
                    // otherwise, check to see if Source is a function
                    if ($.isFunction(source)) {
                        // if it is, return it
                        this.config.source = source;
                    } else {
                        // if it isn't, then convert it to a function
                        this.config.source = function () {
                            return source;
                        };
                    }
                }
            },

            /// initializes and displays the dropdown
            showDropDown: function () {
                // If the dropdown already exists, bail out.
                if (this.dropdown === null) {
                    // if not, then create it
                    // append the dom element to a new div
                    var element = $('<div>').appendTo(this.dom);
                    // create a new DropDown class
                    this.dropdown = new DropDown({
                        // set the element
                        element: element,
                        // set the number of max items
                        maxItems: this.config.maxItems,
                        // create a handler and add it to the list of handled events
                        handleEvent: $.proxy(function (e, item) {
                            this.handledEvents.push(e);
                        }, this)
                    });
                }
            },

            /// closes and destroys the dropdown
            hideDropDown: function () {
                // If the dropdown exists, then dispose of it
                if (this.dropdown !== null) {
                    this.dropdown.dispose();
                    this.dropdown = null;
                }
            },

            /// filters the underlying datasource based upon the vector passed in
            filter: function (filterText) {
                // filter the data source item array and return the results
                return this.config.source().filter(function (item) {
                    return getItemLabel(item).toLowerCase().indexOf(filterText.toLowerCase()) > -1;
                });
            },

            /// selects the provided item, sets it as current, and highlights it in the dropdown
            selectItem: function (item) {
                // set the value from the item
                this.input.val(item !== null ? getItemLabel(item) : '');

                // if the item is not already selected, select it
                if (this.selectedItem !== item) {
                    this.selectedItem = item;
                    this.dom.triggerHandler('change', item);
                }
            },

            /// custom handler for when backspace is pressed
            handleBackspace: function () {
                // only handle the event if the dropdown is instantiated
                if (this.dropdown !== null) {
                    // get the value of the input
                    var value = this.input.val();
                    // if there is text selected....
                    if (this.input[0].selectionStart !== this.input[0].selectionEnd) {
                        // delete the selected text
                        value = value.split('');
                        value.splice(this.input[0].selectionStart, this.input[0].selectionEnd - this.input[0].selectionStart);
                        value = value.join('');
                    } else {
                        // since there is no selection, simply remove the last character
                        value = value.substr(0, value.length - 1);
                    }
                    // refilter and reset the items and render them
                    this.dropdown.setAndRender(this.filter(value));
                }
            },

            /// eventHandler for when mouseDown is called on the combo arrow
            onArrowMouseDown: function (e) {
                // if the dropdown is null....
                if (this.dropdown === null) {
                    // display the dropdown and render the items
                    this.showDropDown();
                    this.dropdown.setAndRender(this.config.source());
                } else {
                    // otherwise, hide the dropdown
                    this.hideDropDown();
                }

                // either way, set focus to the input
                this.input.focus();
                // and push the event.
                this.handledEvents.push(e.originalEvent);
            },

            /// eventHandler for when the mouseDown is called on the parent document
            onDocumentMouseDown: function (e) {
                // get the index of the fired event
                var index = $.inArray(e.originalEvent, this.handledEvents);
                if (index > -1) {
                    // if the event has been fired, prevent the default from firing
                    this.handledEvents.splice(index, 1);
                    e.preventDefault();
                } else {
                    // if it hasn't been, then hide the dropdown
                    this.hideDropDown();
                }
            },

            /// eventHandler for the keyPress event
            onKeyPress: function (e) {
                // bail out on the enter/return key
                if (e.keyCode === 13) {
                    return;
                }

                // first, ensure the dropdown is shown
                this.showDropDown();
                // filter the data to the new filtered value
                var data = this.filter(this.input.val() + String.fromCharCode(e.charCode));
                // set the data and render the items
                this.dropdown.setAndRender(data);

                // if the data contains only a single item, select it.
                if (data !== undefined && data.length === 1) {
                    this.dropdown.setIndex(0);
                }
            },

            /// eventHandler for the keyDown event
            onKeyDown: function (e) {

                switch (e.keyCode) {
                case 8:  // backspace
                    // handle the backspace using the predefined method
                    this.handleBackspace();
                    break;

                case 9:  // tab
                    if (this.dropdown !== null) {
                        // attempt to select the item that most closely matches the search term
                        this.selectItem(this.dropdown.value());
                    }
                    break;

                case 13: // enter
                    if (this.dropdown !== null) {
                        // select the item that most closely matches the search term....
                        this.selectItem(this.dropdown.value());
                        // then hide the dropdown
                        this.hideDropDown();
                    } else {
                        // select nothing
                        this.selectItem(null);
                    }
                    break;

                case 27: // escape
                    // simply hide the dropdown
                    this.hideDropDown();
                    break;

                case 33: // pgUp
                    if (this.dropdown !== null) {
                        // navigate the dropdown down one entire visible page
                        this.dropdown.goPreviousPage();
                    }
                    break;
                case 34: // pgDn
                    if (this.dropdown !== null) {
                        // navigate the dropdown up one entire visible page
                        this.dropdown.goNextPage();
                    }
                    break;
                case 38: // up
                    if (this.dropdown !== null) {
                        // highlight the previous item in the list
                        this.dropdown.goPrevious();
                    }
                    break;

                case 40: // down
                    // if the dropdown is null....
                    if (this.dropdown === null) {
                        // show the dropdown....
                        this.showDropDown();
                        // then set and render the data
                        this.dropdown.setAndRender(this.filter(this.input.val()));
                    }
                    // and finally highlight the next item in the list
                    this.dropdown.goNext();
                    break;
                }
            },

            onBlur: function () {
                // attempt to obtain the currently focused element
                var focus = $(':focus');
                // if there are no focused items or the focused item is a scrollBar, bail out
                if (focus.length && focus.hasClass('scrollbar')) {
                    return;
                } else {
                    // otherwise, hide the dropdown and select the best matched item
                    this.hideDropDown();
                    if (this.selectedItem === null || this.input.val() !== getItemLabel(this.selectedItem)) {
                        this.selectItem(null);
                    }
                }
            }

        });

    $.fn.searchcombo = function (config) {
        var instance = this.data('searchCombo');
        if (instance) {
            return instance;
        }

        config = $.extend({
            maxItems: 5,
            source: []
        }, config || {});

        return this.each(function () {
            var elem = $(this);
            elem.data('searchCombo', new SearchCombo(elem, config));
        });
    };


}(jQuery));
