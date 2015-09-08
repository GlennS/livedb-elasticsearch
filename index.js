"use strict";

/*global module, require*/

var elasticSearch = require('elasticsearch'),
    apiVersion = "1.7",

    snapshotType = 'snapshot',
    opType = 'op',

    mappingsFactory = require("./mappings.js");

module.exports = function(host, index, dontInitializeMappings) {
    index = index || 'livedb';

    var client = new elasticSearch.Client({
	host: host || 'http://localhost:9200',
	apiVersion: apiVersion,
	suggestCompression: true
    }),

	mappings = mappingsFactory(client, index),

	makeSnapshotId = function(collection, doc) {
	    return collection + "-" + doc + "-snapshot";
	},

	makeOpId = function(collection, doc, op) {
	    return collection + "-" + doc + "-op-v" + op.v;
	},

	matchColl = function(coll) {
	    return {
		term: {
		    collection: coll
		}
	    };
	},

	matchDoc = function(doc) {
	    return {
		term: {
		    doc: doc
		}
	    };
	},

	versionRange = function(start, end) {
	    var filter = {
		range: {
		    v: {
			gte: start || 0
		    }
		}
	    };

	    if (end !== null && end !== undefined) {
		filter.range.v.lt = end;
	    }

	    return filter;
	},

	m = {
	    closed: false,
	    close: function() {
		if (!m.closed) {
		    m.closed = true;
		    client.close();
		}
	    },

	    /*
	     Tells us the health of the cluster.

	     Returns error, red, yellow or green.
	     */
	    up: function(callback) {
		client.cat.health(
		    {},
		    function(error, response) {
			if (error) {
			    callback(error, response);
			} else {
			    var colour = response.split(' ')[3];
			    callback(null, colour);
			}
		    }
		);
		
	    },

	    /*
	     Get a single snapshot back from the database.
	     */
	    getSnapshot: function(collection, doc, callback) {
		client.get(
		    {
			index: index,
			type: snapshotType,
			id: makeSnapshotId(collection, doc)
		    },
		    function(error, response) {
			if (error) {
			    if (error.status === '404') {
				callback(null, null);
			    } else {
				callback(error, null);
			    }
			} else {
			    callback(
				null,
				{
				    type: response._source.type,
				    v: response._version,
				    data: JSON.parse(response._source.data)
				}
			    );
			}
		    }
		);
	    },

	    /*
	     Write a snapshot to the database.
	     */
	    writeSnapshot: function(collection, doc, snapshot, callback) {
		client.index(
		    {
			index: index,
			type: snapshotType,
			id: makeSnapshotId(collection, doc),
			version: snapshot.v,
			versionType: 'external',
			body: {
			    collection: collection,
			    doc: doc,
			    type: snapshot.type,
			    data: JSON.stringify(snapshot.data)
			}
		    },
		    callback
		);
	    },

	    /*
	     Get multiple snapshots at once by collection and document name.

	     requests is a map of collection => [document names]
	     */
	    bulkGetSnapshot: function(requests, callback) {
		var docs = Object.keys(requests).map(function(coll) {
		    return {
			"_id": makeSnapshotId(coll, requests[coll])
		    };
		});
		
		client.mget(
		    {
			index: index,
			type: snapshotType,
			body: {
			    docs: docs
			}
		    },
		    function(error, results) {
			if (error) {
			    callback(error, results);
			} else {
			    var resultsDict = {};
			    Object.keys(requests).forEach(function(coll) {
				resultsDict[coll] = {};
			    });

			    results.docs.forEach(function(doc) {
				if (doc.found) {

				    resultsDict[doc._source.collection][doc._source.doc] = {
					type: doc._source.type,
					v: doc._version,
					data: JSON.parse(doc._source.data)
				    };
				}
			    });
			    
			    callback(
				null,
				resultsDict
			    );
			}
		    }
		);
	    },

	    /*
	     Create an operation for the specified document.
	     */
	    writeOp: function(collection, doc, op, callback) {
		var body = {
		    collection: collection,
		    doc: doc,
		    v: op.v,
		    src: op.src,
		    seq: op.seq,
		    meta: JSON.stringify(op.meta)
		};

		if (op.op) {
		    body.op = JSON.stringify(op.op);
		} else if (op.create) {
		    body.create = {
			type: op.create.type,
			data: JSON.stringify(op.create.data)
		    };
		    
		} else if (op.del) {
		    body.del = op.del;
		    
		} else {
		    callback("Unknown op type. Should have a property op|create|del. " + JSON.stringify(op), null);
		}
		
		client.create(
		    {
			index: index,
			type: opType,
			/*
			 We specify the id in this case to prevent writing the same operation twice.
			 */
			id: makeOpId(collection, doc, op),
			body: body
		    },
		    callback
		);
	    },

	    /*
	     The version of a document is its most recent op + 1.
	     */
	    getVersion: function(collection, doc, callback) {
		client.search(
		    {
			index: index,
			type: opType,
			size: 0,
			body: {
			    query: {
				filtered: {
				    filter: {
					bool: {
					    must: [
						matchColl(collection),
						matchDoc(doc),
					    ]
					}
				    }
				}
			    },
			    
			    aggs: {
				version: {
				    max: {
					field: 'v'
				    }
				}
			    }
			}
		    },
		    function(error, response) {
			if (error) {
			    callback(error, null);
			} else {
			    if (response.hits.total === 0) {
				callback(null, 0);
			    } else {
				callback(null, response.aggregations.version.value + 1);
			    }
			}
		    }
		);
	    },

	    /*
	     Returns ops for a document from start (inclusive) to end (exclusive), sorted by version.
	     */
	    getOps: function(collection, doc, start, end, callback) {
		client.search(
		    {
			index: index,
			type: opType,
			body: {
			    sort: {
			    	v: {
			    	    order: 'asc'
			    	}
			    },
			    fields: ["_timestamp", "_source"],
			    query: {
			    	filtered: {
			    	    filter: {
			    		bool: {
			    		    must: [
			    			matchColl(collection),
			    			matchDoc(doc),
			    			versionRange(start, end)
			    		    ]
			    		}
			    	    }
			    	}
			    }
			}
		    },
		    function(error, response) {
			if (error) {
			    callback(error, response);
			} else {
			    callback(
				null,
				response.hits.hits.map(function(hit) {
				    var op = hit._source;
				    
				    var result = {
					v: op.v,
					src: op.src,
					seq: op.seq,
					timestamp: hit.fields._timestamp
				    };

				    if (op.meta) {
					result.meta = JSON.parse(op.meta);
				    }

				    if (op.op) {
					result.op = JSON.parse(op.op);
				    }

				    if (op.create) {
					result.create = {
					    type: op.create.type,
					    data: JSON.parse(op.create.data)
					};
				    }

				    if (op.del) {
					result.del = op.del;
				    }

				    return result;
				})
			    );
			}
		    }
		);
	    },

	    /*
	     Not part of the liveDB API.

	     Search for a document with a title matching our query.
	     */
	    titleSearch: function(collection, searchTerm, callback) {
		client.suggest(
		    {
			index: index,
			type: snapshotType,
			body: {
			    titleSuggest: {
				text: searchTerm,
				term: {
				    field: 'doc'
				}
			    }
			}
		    },
		    function(error, response) {
			if (error) {
			    callback(error, null);
			} else {
			    if (response.titleSuggest && response.titleSuggest.length) {
				callback(
				    null,
				    response.titleSuggest[0].options.map(function(option) {
					return option.text;
				    })
				);
			    } else {
				callback(null, []);
			    }
			}
		    }
		);
	    },

	    ensureMappingsCreated: mappings.ensureCreated,
	    deleteMappings: mappings.delete
	};

    if (!dontInitializeMappings) {
	mappings.ensureCreated(function(error, response) {
	    if (error) {
		throw new Error(error);
	    }
	});
    }

    return m;
};
