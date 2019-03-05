var Tourist = Tourist || {};

Tourist.dataContext = (function ($) {
    "use strict";

    var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    var IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction || {READ_WRITE: "readwrite"};
    var IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

    const DB_NAME = "tourist_db";
    const DB_OBJ_NAME = "visits";
    var OLD_DB_VERSION = 0;
    var DB_VERSION = 1;
    var db = null;

    var init = function () {
        if (!indexedDB) {
            return false;
        }

        var request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = function(event) {
            console.log("Error Opening DB: " + event.target.errorCode);
        };
        request.onsuccess = function(event) {
            db = event.target.result;
        };
        request.onupgradeneeded = function(event) {
            db = event.target.result;

            var objStore = db.createObjectStore(DB_OBJ_NAME, { keyPath: 'id', autoIncrement: true });

            objStore.createIndex("description", "description", {unique: false});
            objStore.createIndex("notes", "notes", {unique: false});
        };
    };

    var getObjectStrore = function(store_name, mode) {
        var trans = db.transaction([store_name], mode);
        trans.oncomplete = function (event) {
            //TODO...
        };
        trans.onerror = function (event) {
            console.log("Transaction Error, CODE: " + event.target.errorCode);
        };
        return trans.objectStore(store_name);
    };

    var addVisit = function(visit, callabck) {
        var store = getObjectStrore(DB_OBJ_NAME, "readwrite");
        var request = store.add(visit);
        request.onsuccess = function (event) {
            console.log("Added Record to DB, ID: " + event.target.result);
            callabck();
        };
    };

    var allVisits = function(callabck) {
        var store = getObjectStrore(DB_OBJ_NAME, "readwrite");
        var request = store.getAll();
        request.onsuccess = function(event) {
            console.log("All Data: " + event.target.result);
            callabck(event.target.result)
        };
    };

    var deleteVisit = function(id, callabck) {
        var store = getObjectStrore(DB_OBJ_NAME, "readwrite");
        var request = store.delete(id);
        request.onsuccess = function(event) {

            callabck();
        };
    };

    var pub = {
        init:init,
        addVisit:addVisit,
        allVisits:allVisits,
        deleteVisit:deleteVisit
    };

    return pub;
}(jQuery));