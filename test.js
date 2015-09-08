"use strict";

/*global module, require, setTimeout*/

var test = require("tape"),
    indexFactory = require("./index.js"),
    index = indexFactory(null, 'test', true),

    opsTestFactory = require("./test-ops.js"),
    snapshotTestFactory = require("./test-snapshots.js");

test('ElasticSearch exists', function(t) {
    t.plan(2);
    
    index.up(function(error, response) {
	t.error(error, 'Health request');
	t.equal(response, 'green', 'Health should be green');
    });
});

/*
 Run this before any tests which depend on the index.
 */
test('index delete then create', function(t) {
	t.plan(4);
    
    index.deleteMappings(function(error, result) {
	t.error(error, 'delete indexes');
	
	index.ensureMappingsCreated(function(error, result) {
	    t.error(error, 'create indexes');
	    t.true(result, 'Mappings should be created.');
	    
	    setTimeout(
		function() {
		    t.pass("Delay after index creation.");
		},
		100
	    );
	});
    });
});

opsTestFactory(index, test);
snapshotTestFactory(index, test);

/*
 Run this last.
 */
test('index create then delete', function(t) {
    t.plan(3);
    
    index.ensureMappingsCreated(function(error, result) {
	t.error(error, 'create indexes');

	index.deleteMappings(function(error, result) {
	    t.error(error, 'delete indexes');
	    t.ok(result, 'Mappings should be deleted');
	});
    });
});

