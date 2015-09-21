"use strict";

/*global module, require, setTimeout*/

var test = require("tape"),
    indexFactory = require("./index.js"),
    indexName = 'test',
    index = indexFactory(null, indexName),

    opsTestFactory = require("./test-ops.js"),
    snapshotTestFactory = require("./test-snapshots.js"),
    extraMappingsTestFactory = require('./test-extra-mappings.js');

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
    t.plan(2);
    
    index.deleteThenCreateMappings(function(error, result) {
	t.error(error, 'delete then create indexes');
	t.true(result, 'Mappings should be created.');
    });
});

opsTestFactory(index, test);
snapshotTestFactory(index, test);

/*
 Run this after the ops and snapshot tests - cleans up after them.
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

/*
 This test is entirely standalone since it needs to make its own mappings.
*/
extraMappingsTestFactory(indexFactory, indexName, test);
