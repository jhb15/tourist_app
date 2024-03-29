var Tourist = Tourist || {};

Tourist.dataContext = (function ($) {
    "use strict";

    var db = null;
    var processorFunc = null;
    var id;
    var DATABASE_NAME = 'tourist_db';
    // Use OLD_DATABASE_VERSION when upgrading databases. It indicates
    // the version we can upgrade from. Anything older and we tell the user
    // there's a problem
    var OLD_DATABASE_VERSION = "0";
    // The current database version supported by this script
    var DATABASE_VERSION = "1.0";

    var populateDB = function (tx) {

        // Creating a visit and photo db entity to store the information.
        tx.executeSql('CREATE TABLE visits (_id INTEGER PRIMARY KEY AUTOINCREMENT, description TEXT NOT NULL, datetime TEXT, location TEXT, photo TEXT NOT NULL)', [], createSuccess, errorDB);
        //tx.executeSql('CREATE TABLE photos (_id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL)', [], createSuccess, errorDB);
        
    }

    var insert_item = function (values) {
        //Adding Item to database
        i_desc = values["description"];
        i_datetime = values["datetime"]
        i_pos = values["position"];
        i_photo = values["photo"];
        db.transaction(function (tx) {
            tx.executeSql('INSERT INTO visits (description, datetime, location, photo_id) values (?, ?, ?, ?)', [], insertSuccess, errorDB);
        }, insertSuccess, errorDB);
    }

    var createSuccess = function (tx, results) {
        console.log("Created table");
    }

    var insertSuccess = function (tx, results) {
        console.log("Insert ID = " + results.insertId);
    }

    var successPopulate = function () {

    }

    var errorDB = function (err) {
        console.log("Error processing SQL: " + err.code);
    }

    var initialise_database = function () {
        // We open any existing database with this name and from the same origin.
        // Check first that openDatabase is supported.
        // Note that if not supported natively and we are running on a mobile
        // then PhoneGap will provide the support.
        if (typeof window.openDatabase === "undefined") {
            return false;
        }
        db = window.openDatabase(DATABASE_NAME, "", "I'm A Tourist App", 200000);

        // If the version is empty then we know it's the first create so set the version
        // and populate
        if (db.version.length == 0) {
            db.changeVersion("", DATABASE_VERSION);
            db.transaction(populateDB, errorDB, successPopulate);
        }
        else if (db.version == OLD_DATABASE_VERSION) {
            // We can upgrade but in this example we don't!
            alert("upgrading database");
        }
        else if (db.version != DATABASE_VERSION) {
            // Trouble. They have a version of the database we
            // cannot upgrade from
            alert("incompatible database version");
            return false;
        }

        return true;
    }

    var init = function () {
        return initialise_database();
    };

    var queryListVisits = function (tx, results) {
        var list = [];
        var len = results.rows.length;
        for (var i = 0; i < len; i++) {
            list[i] = results.rows.item(i);
        }

        processorFunc(list);
    }


    var queryVisits = function (tx) {
        tx.executeSql("SELECT * FROM visits ORDER BY visits.datetime ASC",
            [], queryListVisits, errorDB);
    }

    var processVisitsList = function (processor) {
        processorFunc = processor;
        if (db) {
            db.transaction(queryVisits, errorDB);
        }
    };

    var addVisit = function (visit) {
        //TODO Implement
    };

    var pub = {
        init:init,
        processVisitsList:processVisitsList,
        addVisit:addVisit
    };

    return pub;
}(jQuery));