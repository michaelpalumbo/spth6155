function enableHoverPopoverOn(elementSelector) {
    enableHoverPopupOn(
        elementSelector,
        function(selector) {
            selector.popover("show");
            return $(".popover").last();
        },
        function(selector) {
            selector.popover("hide");
        }
    );
}

function enableHoverDropdownOn(elementSelector) {
    enableHoverPopupOn(
        elementSelector,
        function(selector) {
            selector.parent().addClass("open");
            selector.trigger('show.bs.dropdown');
            return selector.next('[role="menu"]');
        },
        function(selector) {
            selector.parent().removeClass("open");
            selector.trigger('hide.bs.dropdown');
        }
    );
}

/**
 * Here "popup" means any element that is hidden and then displayed
 * (e.g popover or dropdown menu)
 */
function enableHoverPopupOn(selector, showPopup, hidePopup, settings) {
    if (settings === undefined) settings = {};
    if (settings.showDelay === undefined) settings.showDelay = 400;
    if (settings.hideDelay === undefined) settings.hideDelay = 200;

    var counter;
    var visiblePopup = null;
    var hoveredElement = null;

    function hidePopupFor(element) {
        if (visiblePopup === null) return;
        visiblePopup = null;
        hidePopup($(element));
    }
    function showPopupFor(element) {
        if (visiblePopup !== null) return;
        visiblePopup = showPopup($(element));
        visiblePopup.on("mouseenter", function() {
            hoveredElement = element;
        });
        visiblePopup.on("mouseleave", function() {
            hoveredElement = null;
            window.setTimeout(function() {
                if (hoveredElement !== element) hidePopupFor(element);
            }, settings.hideDelay);
        });
    }

    $(selector)
        .on("click", function() {
            event.preventDefault();
            showPopupFor(this);
        })
        .on("mouseenter", function() {
            var _this = this;
            hoveredElement = _this;

            hidePopup($(selector).not(_this));

            window.clearTimeout(counter);
            counter = window.setTimeout(function() {
                if (hoveredElement === _this) showPopupFor(_this);
            }, settings.showDelay);
        })
        .on("mouseleave", function() {
            var _this = this;
            hoveredElement = null;
            window.setTimeout(function() {
                if (hoveredElement !== _this) hidePopupFor(_this);
            }, settings.hideDelay);
        });
}
