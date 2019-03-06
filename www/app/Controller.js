var Tourist = Tourist || {};

Tourist.controller = (function ($, dataContext, document) {
    "use strict";

    var isCordovaApp = !!window.cordova;
    var position = null;
    var mapDisplayed = false;
    var showMap = false;
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

    var gVisitList = null;

    // This changes the behaviour of the anchor <a> link
    // so that when we click an anchor link we change page without
    // updating the browser's history stack (changeHash: false).
    // We also don't want the usual page transition effect but
    // rather to have no transition (i.e. tabbed behaviour)
    var initialisePage = function (event) {
        change_page_back_history();
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
                showMap = false;
                deal_with_geolocation();
                break;
            case VISITS_LIST_PAGE_ID:
                dataContext.allVisits(renderVisitsList);
                break;
            case MAP_PAGE:
                dataContext.allVisits(function(visits) {
                    gVisitList = visits;
                }); //TODO plot visits!
                if (!mapDisplayed || (currentMapWidth != get_map_width() ||
                    currentMapHeight != get_map_height())) {
                    showMap = true;
                    deal_with_geolocation();
                }
                break;
        }
    };

    /**
     * Function for redering a list of visits to the screen when on the list page of the application. This is a modified version of the renderSessions
     * finction privided by Chris Loftus in the Confrence App example.
     * @param visitsList This is an list of all the visits stored in the local IndexedDB instance.
     */
    var renderVisitsList = function(visitsList) {
        var view = $(visitsListSelector);
        var visitCount = visitsList.length;

        view.empty();

        if (visitCount === 0) {
            $(noVisitsCachedMsg).appendTo(view);
        } else {
            var filterForm = $("<form class=\"ui-filterable\">");
            var inputField = $("<input id=\"myFilter\" data-type=\"search\" placeholder=\"Search for visits...\">");
            inputField.appendTo(filterForm);
            filterForm.appendTo(view);

            var ul = $("<ul id=\"visit-list\" data-role=\"listview\" data-filter=\"true\" data-input=\"#myFilter\"></ul>").appendTo(view);

            for(var i = 0; i < visitCount; i += 1) {
                var visit = visitsList[i];
                var id = visit.id;
                var date = new Date(visit.datetime);

                var listItem = $("<li>")
                var a_tag = $("<a href=\"\">").appendTo(listItem);
                a_tag.click({id}, toggleMoreDetail);
                var span = $("<span class=\"visit-list-item\">").appendTo(a_tag);
                $("<img src=\"" + visit.photo_data + "\">"). appendTo(span);
                var div = $("<div>").appendTo(span);
                $("<h3>" + visit.id + ". " + visit.description + "</h3>").appendTo(div);
                $("<h6>Date: " + date.getDate() + "/" + date.getMonth() + "/" + date.getFullYear() + "</h6>").appendTo(div);
                $("<h6>Time: " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "</h6>").appendTo(div);
                $("<br>").appendTo(span);
                var mDDiv = $("<div id=\"more-detail-" + visit.id + "\" class=\"more-detail\">").appendTo(span);
                $("<h6>Lat: " + visit.latitude + " Lon:" + visit.longitude + "</h6>").appendTo(mDDiv);
                $("<h6>Notes: </h6>").appendTo(mDDiv);
                $("<p>" + visit.notes + "</p>").appendTo(mDDiv);
                
                //$("<button>Edit</button>").appendTo(mDDiv); //For Future Use
                //$("<button>Delete</button>").appendTo(mDDiv);

                listItem.appendTo(ul);
            }
            ul = ul.appendTo(view);

            ul.listview();
        }
    };

    /*var renderVisitsList = function (visitsList) {

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
                var date = new Date(visit.datetime);

                listItem = listItem + "<a onclick=\"toggleMoreDetail(" + visit.id + ");\" href=\"\">";  //TODO make this show the notes from the visit.

                liArray.push(listItemid
                    + "<span class='visit-list-item'>"
                    + "<img src=\"" + visit.photo_data + "\"></img>"
                    + "<div>"
                    + "<h3>" + visit.id + ". " + visit.description + "</h3>"
                    + "<h6>Date: " + date.getDate() + "/" + date.getMonth() + "/" + date.getFullYear() + "</h6>"
                    + "<h6>Time: " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "</h6>"
                    + "</div>"
                    + "<div id=\"more-detail-" + visit.id + "\" class=\"more-detail\">"
                    + "<h6>Lat: " + visit.latitude + " Lon:" + visit.longitude + "</h6>" //Properly Format
                    + "<h6>Notes: </h6>" //Properly Format
                    + "<p>" + visit.notes + "</p>" //Properly Format
                    + "</div>"
                    + "</span>"
                    + "</a>"
                    + "</li>");
            }
            var listItems = liArray.join("");
            $(listItems).appendTo(ul);


            ul.listview();
        }
    };*/

    /**
     * Function for showing the more detail for a selected visit on the list page.
     * @param input object containing data to be passed to this function.
     */
    var toggleMoreDetail = function(input) {
        var mDID = "more-detail-" + input.data.id;
        var moreDetailElement = document.getElementById(mDID);
        if (moreDetailElement != null) {
            var currentVal = moreDetailElement.style.display;
            if (currentVal === 'none') {
                moreDetailElement.style.display = 'block';
            } else {
                moreDetailElement.style.display = 'none';
            }
        } else {
            console.log(id);
            console.log("Error Toggleing MoreDetail, Visit ID:" + input.data.id);
        }
    };

    var renderAddVisit = function () {
        var form = $(newVisitFormSelector);

        form.empty();

        $("<label>Short Desctription:</label>").appendTo(form);
        $("<input type=\"text\" name=\"description\"/></br>").appendTo(form);
        $("<label>Notes:</label>").appendTo(form);
        $("<textarea name=\"notes\">Write notes here...</textarea></br>").appendTo(form);
        $("<label>Image</label>").appendTo(form);

        if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/)) {
            if (isCordovaApp) {
                //Phone Gap Image Capture
                $("<button type=\"button\" id=\"take_pic_btn\">Capture Photo</button></br>").click(get_photo).appendTo(form);
                $("<img style=\"display:none;width:40%;height:auto;\" name=\"photo\" id=\"input_img\" src=\"\" />").appendTo(form);
            } else {
                $("<input id=\"input_img\" type=\"file\" name=\"photo\" accept=\"image/*\" capture=\"camera\"></br>").appendTo(form);
            }
        } else {
            $("<p>Warning! Can't use camera as you are on a desktop but you can upload an image file.</p>").appendTo(form);
            $("<input id=\"input_img\" type=\"file\" name=\"photo\" accept=\"image/*\" capture=\"camera\"></br>").appendTo(form);
        }
        $("<textarea style=\"display:none;\" name=\"b64_photo_data\" id=\"b64\"></textarea>").appendTo(form);

        $("<input type=\"submit\" value=\"Add Visit\" id=\"submit\"/>").appendTo(form);

        form.trigger('create');

        document.getElementById("input_img").addEventListener("change", read_file);

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
        //var phoneGapApp = (document.URL.indexOf('http://') === -1 && document.URL.indexOf('https://') === -1 );
        if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/)) {
            // Running on a mobile. Will have to add to this list for other mobiles.
            // We need the above because the deviceready event is a phonegap event and
            // if we have access to PhoneGap we want to wait until it is ready before
            // initialising geolocation services
            if (isCordovaApp) {
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

        // Do we have built-in support for geolocation (either native browser or phonegap)?]
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(handle_geolocation_query, handle_errors, {timeout: 10000, enableHighAccuracy: false});
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

    var build_markers_string = function() {

        var markers_string = "";

        if (gVisitList != null) {
            var count = gVisitList.length;
            for(var i = 0; i < count; i += 1) {
                var visit = gVisitList[i];
                markers_string += "&markers=color:red%7Clabel:" + visit.id + "%7C" + visit.latitude + "," + visit.longitude;
            }
        }
    
        return markers_string;
    }

    /**
     * Sets position Tourist instance variable and then either renders the map or add visit form based on showMap variable
     * which is set in the onPageChange function.
     * @param pos current position
     */
    var handle_geolocation_query = function(pos) {
        position = pos;

        if (showMap) {
            showStaticMap();
        } else {
            renderAddVisit();
        }
    }

    /**
     * example code https://wrightshq.com/playground/placing-multiple-markers-on-a-google-map-using-api-3/
     */
    var showEmbeddedMap = function() {
        var map;
        var bounds = new google.maps.LatLngBounds();
        var uluru = {lat: position.coords.latitude, lng: position.coords.longitude};
        var mapOptions = {
            mapTypeId: 'roadmap',
            center: uluru,
            zoom: 4
        };

        jQuery('<div/>', {
            id: 'map-div',
            title: 'Google map of my location'
        }).appendTo('#mapPos');

        map =  new google.maps.Map(document.getElementById("map-div"), mapOptions);
        map.setTilt(45);

        var visits = gVisitList;

        for(var i = 0; i < visits.length; i++) {
            var markerPos = new google.maps.LatLng(parseFloat(visits[i].latitude), parseFloat(visits[i].longitude));
            bounds.extend(markerPos);
            var marker = new google.maps.Marker({
                position: markerPos,
                map: map,
                title: visits[i].description
            });
            console.log("IM HERE");

            //TODO, maybe add info page

            map.fitBounds(bounds);
        }

        var boundsListener = google.maps.event.addListener((map), 'bounds_changed', function(event) {
            this.setZoom(14);
            google.maps.event.removeListener(boundsListener);
        });

        mapDisplayed = true;
    }

    var showStaticMap = function () {

        var the_height = get_map_height();
        var the_width = get_map_width();

        var markers = build_markers_string();

        var image_url = 'https://maps.googleapis.com/maps/api/staticmap?center=' + position.coords.latitude + ',' +
                      position.coords.longitude + '&zoom=14&size=' +
                      the_width + 'x' + the_height + '&markers=color:blue|label:S|' +
                      position.coords.latitude + ',' + position.coords.longitude + markers +
                      '&key=AIzaSyD1Hqfruc_5GqAcUktoorhf5KnxOTkn_Xk';
         
        $('#map-img').remove();

        jQuery('<img/>', {
            id: 'map-img',
            src: image_url,
            title: 'Google map of my location'
        }).appendTo('#mapPos');

        mapDisplayed = true;
    };

    /**
     * Clears the table once a Visit has been successfully added. Also notifys the user of this action.
     * Callback for DataContext.addVisit() function.
     */
    var visitAdded = function(id) {
        renderAddVisit();
        alert("New Visit Added, ID: " + id);
    }

    /**
     * This function is called once a Submit event had been triggered on the new visit from.
     * @param values values submitted by form
     */
    var add_visit = function (values) {

        var visit = {
            description: values["description"],
            notes: values["notes"],
            longitude: position.coords.longitude,
            latitude: position.coords.latitude,
            datetime: Date(),
            photo_data: values["b64_photo_data"]
        };

        console.log(visit);

        dataContext.addVisit(visit, visitAdded);
    }

    var read_file = function () {
        if (this.files && this.files[0]) {
            var reader = new FileReader();

            reader.addEventListener("load", function(e) {
                //document.getElementById("").src = e.target.result;
                document.getElementById("b64").innerHTML = e.target.result;
            });

            reader.readAsDataURL(this.files[0]);
        }
    }

    var get_photo = function () {
        console.log("Taking Picture");
        navigator.camera.getPicture(camera_success, camera_error, { quality: 20, allowEdit: true,
            destinationType: navigator.camera.DestinationType.DATA_URL });
    }

    var camera_success = function (img) {
        var smallImage = document.getElementById('input_img');
        smallImage.style.display = 'block';
        smallImage.src = "data:image/jpeg;base64," + img;
        document.getElementById("b64").innerHTML = "data:image/jpeg;base64," + img;
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

    var script = document.createElement('script');
    script.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyD1Hqfruc_5GqAcUktoorhf5KnxOTkn_Xk";
    document.body.appendChild(script);

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