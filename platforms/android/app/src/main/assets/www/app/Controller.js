var Tourist = Tourist || {};

Tourist.controller = (function ($, dataContext, document) {
    "use strict";

    var position = null;
    var mapDisplayed = false;
    var currentMapWidth = 0;
    var currentMapHeight = 0;
    var visitsListSelector = "#visits-list-content";
    var newVisitFormSelector = "#newVisitForm";
    var noVisitsCachedMsg = "<div>Your visit list is empty.</div>";
    var databaseNotInitialisedMsg = "<div>Your browser does not support local databases.</div>";

    var VISITS_LIST_PAGE_ID = "visits",
        ADD_VISIT_PAGE_ID = "log_visit",
        MAP_PAGE = "map";

    var pictureSource;   // picture source
    var destinationType; // sets the format of returned value 

    // This changes the behaviour of the anchor <a> link
    // so that when we click an anchor link we change page without
    // updating the browser's history stack (changeHash: false).
    // We also don't want the usual page transition effect but
    // rather to have no transition (i.e. tabbed behaviour)
    var initialisePage = function (event) {
        change_page_back_history();
        initiate_geolocation();
        /*pictureSource=navigator.camera.PictureSourceType;
        destinationType=navigator.camera.DestinationType;*/
    };

    var onPageChange = function (event, data) {
        // Find the id of the page
        var toPageId = data.toPage.attr("id");

        // If we're about to display the map tab (page) then
        // if not already displayed then display, else if
        // displayed and window dimensions changed then redisplay
        // with new dimensions
        switch (toPageId) {
            case ADD_VISIT_PAGE_ID:
                renderAddVisit();
                break;
            case VISITS_LIST_PAGE_ID:
                dataContext.processVisitsList(renderVisitsList);
                break;
            case MAP_PAGE:
                if (!mapDisplayed || (currentMapWidth != get_map_width() ||
                    currentMapHeight != get_map_height())) {
                    deal_with_geolocation();
                }
                break;
        }
    };

    var renderVisitsList = function (visitsList) {

        var view = $(visitsListSelector);

        view.empty();

        if (visitsList.length === 0) {

            $(noVisitsCachedMsg).appendTo(view);
        } else {

            var liArray = [],
                listItem,
                visitsCount = visitsList.length,
                visit,
                i;

            var filterForm = $("<form class=\"ui-filterable\">");
            var inputField = $("<input id=\"myFilter\" data-type=\"search\" placeholder=\"Search for visits...\">");
            inputField.appendTo(filterForm);
            filterForm.appendTo(view);
        
            var ul = $("<ul id=\"visit-list\" data-role=\"listview\" data-filter=\"true\" data-input=\"#myFilter\"></ul>").appendTo(view);

            for (i = 0; i < visitsCount; i += 1) {

                listItem = "<li>";
                visit = visitsList[i];

                listItem = listItem + "<a href=\"\">";

                liArray.push(listItem
                    + "<span class='visit-list-item'>"
                    + "<h3>" + visit.description + "</h3>"
                    + "<div>"
                    + "<h6>" + visit.datetime + "</h6>"
                    + "<h6>" + visit.photo_id + "</h6>"
                    + "</div>"
                    + "</span>"
                    + "</a>"
                    + "</li>");

            }

            var listItems = liArray.join("");
            $(listItems).appendTo(ul);


            ul.listview();
        }
    };

    var renderAddVisit = function () {
        var form = $(newVisitFormSelector);
        var phoneGapApp = (document.URL.indexOf('http://') === -1 && document.URL.indexOf('https://') === -1 );

        form.empty();
        
        //var imageInput = $("<input type=\"file\" name=\"uploader\" id=\"uploader\" accept=\"image/*\"/></br>");
        //imageInput.appendTo(view);

        $("<label>Short Desctription:</label>").appendTo(form);
        $("<input type=\"text\" name=\"description\"/></br>").appendTo(form);
        $("<label>Notes:</label>").appendTo(form);
        $("<textarea name=\"notes\">Write notes here...</textarea></br>").appendTo(form);
        $("<label>Image</label>").appendTo(form);

        if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/)) {
            if (phoneGapApp) {
                //Phone Gap Image Capture
                $("<button type=\"button\" id=\"take_pic_btn\">Capture Photo</button></br>").click(get_photo).appendTo(form);
            } else {
                $("<input type=\"file\" name=\"photo\" accept=\"image/*\" capture=\"camera\"></br>").appendTo(form);
                $("<img style=\"display:none;width:60px;height:60px;\" id=\"smallImage\" src=\"\" />").appendTo(form);
            }
        } else {
            $("<p>Warning! Can't use camera as you are on a desktop but you can upload an image file.</p>").appendTo(form);
            $("<input type=\"file\" name=\"photo\" accept=\"image/*\" capture=\"camera\"></br>").appendTo(form);
        }

        $("<label>Input Field for Image goes here !!!</label>").appendTo(form);
        $("<input type=\"submit\" value=\"Add Visit\" id=\"submit\"/>").appendTo(form);

        form.trigger('create');

    };

    var noDataDisplay = function (event, data) {
        var view = $(visitsListSelector);
        view.empty();
        $(databaseNotInitialisedMsg).appendTo(view);
    }

    var change_page_back_history = function () {
        $('a[data-role="tab"]').each(function () {
            var anchor = $(this);
            // anchor doesn't have a href element when you click on it.
            if (anchor.attr('href') !== undefined) {
              anchor.bind('click', function() {
                $.mobile.changePage(anchor.attr('href'), { // Go to the URL
                                    transition: 'none',
                                    changeHash: false});
                return false;
              });
            }
          });
    };

    var deal_with_geolocation = function () {
        var phoneGapApp = (document.URL.indexOf('http://') === -1 && document.URL.indexOf('https://') === -1 );
        if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/)) {
            // Running on a mobile. Will have to add to this list for other mobiles.
            // We need the above because the deviceready event is a phonegap event and
            // if we have access to PhoneGap we want to wait until it is ready before
            // initialising geolocation services
            if (phoneGapApp) {
                //alert('Running as PhoneGapp app');
                document.addEventListener("deviceready", initiate_geolocation, false);
            }
            else {
                initiate_geolocation(); // Directly from the mobile browser
            }
        } else {
            //alert('Running as desktop browser app');
            initiate_geolocation(); // Directly from the browser
        }
    };

    var initiate_geolocation = function () { //TODO:Mod

        // Do we have built-in support for geolocation (either native browser or phonegap)?
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(handle_geolocation_query, handle_errors);
        }
        else {
            // We don't so let's try a polyfill
            yqlgeo.get('visitor', normalize_yql_response);
        }
    };

    var handle_errors = function (error) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                alert("user did not share geolocation data");
                break;

            case error.POSITION_UNAVAILABLE:
                alert("could not detect current position");
                break;

            case error.TIMEOUT:
                alert("retrieving position timed out");
                break;

            default:
                alert("unknown error");
                break;
        }
    };

    var normalize_yql_response = function (response) {
        if (response.error) {
            var error = { code: 0 };
            handle_errors(error);
            return;
        }

        position = {
            coords: {
                latitude: response.place.centroid.latitude,
                longitude: response.place.centroid.longitude
            },
            address: {
                city: response.place.locality2.content,
                region: response.place.admin1.content,
                country: response.place.country.content
            }
        };

        handle_geolocation_query(position);
    };

    var get_map_height = function () {
        return $(window).height() - ($('#maptitle').height() + $('#mapfooter').height());
    }

    var get_map_width = function () {
        return $(window).width();
    }

    var handle_geolocation_query = function (pos) {
        position = pos;

        var the_height = get_map_height();
        var the_width = get_map_width();

        var image_url = 'https://maps.googleapis.com/maps/api/staticmap?center=' + position.coords.latitude + ',' +
                      position.coords.longitude + '&zoom=14&size=' +
                      the_width + 'x' + the_height + '&markers=color:blue|label:S|' +
                      position.coords.latitude + ',' + position.coords.longitude +
                      '&key=AIzaSyD1Hqfruc_5GqAcUktoorhf5KnxOTkn_Xk';
         
        $('#map-img').remove();

        jQuery('<img/>', {
            id: 'map-img',
            src: image_url,
            title: 'Google map of my location'
        }).appendTo('#mapPos');

        mapDisplayed = true;
    };

    var add_visit = function (values) {
        values["position"] = position; //TODO: no position info
        values["datetime"] = Date();

        console.log(values);
    }

    var get_photo = function () {
        console.log("Taking Picture");
        navigator.camera.getPicture(camera_success, camera_error, { quality: 20, allowEdit: true,
            destinationType: destinationType.DATA_URL });
    }

    var camera_success = function (img) {
        var smallImage = document.getElementById('smallImage');


        smallImage.style.display = 'block';

        smallImage.src = "data:image/jpeg;base64," + imageData;
    }

    var camera_error = function (error) {
        console.log("Error Taking Picture because: " + error);
    }

    var init = function () {
        // The pagechange event is fired every time we switch pages or display a page
        // for the first time.
        var d = $(document);
        var databaseInitialised = dataContext.init();
        if (!databaseInitialised) {
            d.on('pagechange', $(document), noDataDisplay);
        }
       
        // The pagechange event is fired every time we switch pages or display a page
        // for the first time.
        d.on('pagechange', $(document), onPageChange);
        // The pageinit event is fired when jQM loads a new page for the first time into the
        // Document Object Model (DOM). When this happens we want the initialisePage function
        // to be called.
        d.on('pageinit', $(document), initialisePage);
    };


    // Provides an object wrapper for the "public" functions that we return to external code so that they
    // know which functions they can call. In this case just init.
    var pub = {
        init: init,
        add_visit: add_visit,
        get_photo: get_photo
    };

    return pub;
}(jQuery, Tourist.dataContext, document));

// Called when jQuery Mobile is loaded and ready to use.
$(document).on('mobileinit', $(document), function () {
    Tourist.controller.init();

    
});

$(function() {
    $('#newVisitForm').on('submit', function(event) {
        event.preventDefault();
        
        console.log("newVisitForm Submitted");
        var $inputs = $('#newVisitForm :input');
    
        var values = {};
        $inputs.each(function() {
            values[this.name] = $(this).val();
        });
        console.log(values);
        Tourist.controller.add_visit(values);
    });
});