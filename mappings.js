"use strict";

/*global module, require*/

var stringType = "string",
    intType = "long",
    booleanType = "boolean",
    dataType = "string";

module.exports = function(elasticClient, index) {
    var stringType = {
	type: "string"
    },

	rawStringType = {
	    type: "string",
	    index: "not_analyzed"
	},

	intType = {
	    type: "long"
	},

	boolType = {
	    type: "boolean"
	},

	arbitraryObjType = {
	    type: "string",
	    index: "no"
	};

    return {
	delete: function(callback) {
	    elasticClient.indices.exists(
		{
		    index: index
		},
		function(error, response) {
		    if (error) {
			callback(error, response);
		    } else if (response) {
			elasticClient.indices.delete(
			    {
				index: index
			    },
			    callback
			);
		    } else {
			callback(null, false);
		    }
		}
	    );
	},

	ensureCreated: function(callback) {
	    elasticClient.indices.exists(
		{
		    index: index
		},
		function(error, response) {
		    if (error) {
			callback(error, response);
			
		    } else if (!response) {
			
			elasticClient.indices.create(
			    {
				index: index,
				body: {
				    settings: {},
				    mappings: {
					snapshot: {
					    "_timestamp": {
						"enabled": "true",
						"store": "yes"
					    },
					    
					    properties: {
						collection: rawStringType,
						doc: {
						    type: "string"
						},
						doc_raw: {
						    type: "string",
						    index: "not_analyzed",
						    field: 'doc'
						},						
						// This is the ot type, see [https://github.com/ottypes]
						type: stringType,
						data: arbitraryObjType,
						/*
						 Deleted would make more sense as a boolean, but it has to be a string so that the suggester can use it.
						 */
						deleted: stringType,
						suggest: {
						    type: 'completion',
						    context: {
							collection: {
							    type: 'category',
							    path: 'collection'
							},
							deleted: {
							    type: 'category',
							    path: 'deleted'
							}
						    }
						}
					    }
					},

					op: {
					    "_timestamp": {
						"enabled": "true",
						"store": "yes"
					    },
					    
					    properties: {
						collection: rawStringType,
						doc: stringType,
						v: intType,
						src: arbitraryObjType,
						seq: intType,
						meta: arbitraryObjType,
						op: arbitraryObjType,
						del: boolType,
						create: {
						    type: "object",
						    properties: {
							type: stringType,
							data: arbitraryObjType
						    }
						}
					    }
					}
				    }
				}
			    },
			    callback
			);
		    } else {
			callback(null, false);
		    }
		}
	    );
	}
    };
};
