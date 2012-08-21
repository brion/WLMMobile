define([ 'jquery', 'monument' ], function( $, Monument ) {
	function MonumentsApi( url, mwApi ) {
		this.url = url;
		this.mwApi = mwApi;
	}

	MonumentsApi.prototype.request = function( params ) {
		var that = this;

		// Force JSON
		params.format = 'json';
		return $.ajax({
			url: this.url,
			data: params,
			dataType: 'text',
			type: 'GET',
			dataFilter: function( text ) {
				// Pick up only the last line of the response
				// This ignores all the PHP errors and warnings spouted by the API
				// FIXME: Fix the errors and warnings in the server of the API
				var split = text.split("\n");
				var data = JSON.parse(split[split.length -1]);
				var monuments = [];
				$.each(data.monuments || [], function(i, monument) {
					var m = new Monument( monument, that.mwApi );
					// if a monument is associated with a country ( WARNING: country actually means campaign )
					// that is not listed in CAMPAIGNS it suggests out of date campaigns-data.js
					if ( CAMPAIGNS[ m.country ] ) {
						monuments.push( m );
					} else {
						console.log( 'the campaign ' + m.country + ' is not currently supported by app so throwing away ' + m.name );
					}
				});
				return monuments;
			}
		});
	};

	MonumentsApi.prototype.getForCountry = function( country ) {
		var d = $.Deferred();
		return this.request({
			action: 'search',
			limit: WLMConfig.MONUMENT_SEARCH_LIMIT,
			srcountry: country
		});
	};

	MonumentsApi.prototype.getForAdminLevel = function( tree, str ) {
		var d = $.Deferred(), i,
			data = {
				action: 'search',
				limit: WLMConfig.MONUMENT_SEARCH_LIMIT
			};
		for( i = 0; i < tree.length; i++ ) {
			data[ 'sradm' + i ] = tree[ i ];
		}
		if( str ) {
			data.srname = '~' + str + '*';
		}
		return this.request( data );
	};
	

	MonumentsApi.prototype.filterByNameForCountry = function( country, str ) {
		var d = $.Deferred();
		return this.request( {
			action: 'search',
			limit: WLMConfig.MONUMENT_SEARCH_LIMIT,
			srcountry: country,
			srname: '~' + str + '*'
		} );
	};

	var MAX_BOUNDING_BOX_DEGREES = 0.2
	MonumentsApi.prototype.trimBoundingBox = function( minLon, minLat, maxLon, maxLat ) {
		var deltaLat = maxLat - minLat,
			deltaLon = maxLon - minLon,
			centerLat = ( deltaLat / 2 ) + minLat,
			centerLon = ( deltaLon / 2 ) + minLon,
			bbCap = MAX_BOUNDING_BOX_DEGREES / 2;

		if( deltaLat > MAX_BOUNDING_BOX_DEGREES ) {
			minLat = centerLat - bbCap;
			maxLat = centerLat + bbCap;
		}
		if( deltaLon > MAX_BOUNDING_BOX_DEGREES ) {
			minLon = centerLon - bbCap;
			maxLon = centerLon + bbCap;
		}
		return [ minLon, minLat, maxLon, maxLat ];
	};

	MonumentsApi.prototype.getInBoundingBox = function( minLon, minLat, maxLon, maxLat, str ) {
		var bb = this.trimBoundingBox( minLon, minLat, maxLon, maxLat ),
			bboxString = bb.join( ',' ),
			data = {
				action: 'search',
				bbox: bboxString,
				limit: WLMConfig.MONUMENT_SEARCH_LIMIT
			};
		if( str ) {
			data.srname = '~' + str + '*';
		}
		return this.request( data );
		
	};

	return MonumentsApi;
});
