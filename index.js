"use strict";

/*global module, require*/

var elasticSearch = require('elasticsearch'),
    apiVersion = "1.7",

    snapshotType = 'snapshot',
    opType = 'op';

module.exports = function(host, index) {
    index = index || 'livedb';

    var client = new elasticSearch.Client({
	host: host || 'http://localhost:9200',
	apiVersion: apiVersion,
	suggestCompression: true
    }),

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

	searchCallback = function(callback) {
	    return function(error, response) {
		if (error) {
		    callback(error, null);
		} else {
		    callback(
			null,
			response.hits.hits.map(function(hit) {
			    return hit._source;
			})
		    );
		}
	    };
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
			    callback(error, null);
			} else {
			    callback(
				null,
				{
				    type: response._source.type,
				    data: response._source.data
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
			body: {
			    collection: collection,
			    doc: doc,
			    type: snapshot.type,
			    data: snapshot.data
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
		var criteria = Object.keys(requests).map(function(coll) {
		    return {
			bool: {
			    must: [
				matchColl(coll),
				{
				    terms: {
					doc: requests[coll]
				    }
				}
			    ]
			}
		    };
		});
		
		client.search(
		    {
			index: index,
			type: snapshotType,
			body: {
			    query: {
				filtered: {
				    filter: {
					bool: {
					    should: criteria
					}
				    }
				}
			    }
			}
		    },
		    searchCallback(callback)
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
		    meta: op.meta
		};

		if (op.op) {
		    body.op = op.op;
		} else if (op.create) {
		    body.create = op.create;
		    
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
		client.count(
		    {
			index: index,
			type: opType,
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
			    callback(null, response.aggregations.version);
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
		    searchCallback(callback)
		);
	    }
	    
	};

    return m;
};
