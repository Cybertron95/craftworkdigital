/* eslint-disable */

/*
TO USE
  <script type="text/javascript" src="./navigation.js"></script>

  <div id="navigation-container-nav-top"></div>
  <div id="navigation-container-nav-ftr"></div>

  <script>

    var options = {
      baseURL: '//kamala-dev2.marvel.com/'
    };

    Manifold.navigationWidget.load( options );
  </script>

 */

var Manifold = Manifold || {};

Manifold.navigationWidget = (function() {
  'use strict';

  var api = {};
  var endpoint = '/api/tallus';
  var _opts = {
    baseURL: '//marvel.com',
    includeNavFtr: true,
    includeNavTop: true,

    shouldLoadJS: true,
    shouldLoadCSS: true,

    selectors: {
      navTop: '#navigation-container-nav-top',
      navFtr: '#navigation-container-nav-ftr'
    },

    settings: null // used to populate _qs
  };
  var _qs = {
    nav_top_include_search: true,
    nav_ftr_include_search: true,

    /**
     ** No Default
      home_url: null,
      nav_ftr_custom_terms: null,

      sign_in_url: null,
      use_oauth_host: null,
      state: null,
      client_id: null,
      **/

    // Populated from _opts
    include_nav_ftr: null,
    include_nav_top: null
  };

  api.settings = _qs;

  var url;
  var numAssets = 0;
  var navigationResponse;

  var cssURL;
  var jsURL;
  var styleCSS;

  var userMenu;

  var topContainer;
  var ftrContainer;

  /**
   * Makes the API GET request to the endpoint to retrieve the Nav and/or footer with the supplies
   * options
   * @param  {Object} options Configurable options allowed by 3rd party vendors
   */
  var load = api.load = function( options ) {
    if( options && options.baseURL ) {
      for( var key in options ) {
        _opts[ key ] = options[ key ];
      }

      if( _opts.includeNavFtr || _opts.includeNavTop ) {
        _qs.include_nav_ftr = _opts.includeNavFtr;
        _qs.include_nav_top = _opts.includeNavTop;

        if( _opts.settings ) {
          for( var setting in _opts.settings ) {
            _qs[ setting ] = _opts.settings[ setting ];
          }
        }

        url = _opts.baseURL + endpoint;
        url = _appendQueryStrings( url, _qs );
        _loadEndpoint( url, _onEndPointLoad );
      }
    }
  };

  /**
   * Makes the API request after appending a JSONP callback function
   * @param  {string} url The request Url
   * @param  {Function} callback onSuccess callback
   */
  function _loadEndpoint( url, callback ) {
    var name = 'mvl_nav_ter_widget';
    if( url.match( /\?/ ) ) {
      url += '&callback=' + name;
    } else {
      url += '?callback=' + name;
    }

    //Use JSONP to make the API request
    var script = document.createElement( 'script' );
    script.type = 'text/javascript';
    script.src = url;

    window[ name ] = function( data ){
      callback.call( window, data );
      //Once data is retrieved by the API Request remove the script tag and JSONP callback to hide the call.
      document.getElementsByTagName( 'head' )[ 0 ].removeChild( script );
      script = null;
      delete window[ name ];
    };

    document.getElementsByTagName( 'head' )[ 0 ].appendChild( script );
  }

  /**
   * Take the styles from the API and add them to the page
   */
  function _loadCSS() {
    if( _opts.shouldLoadCSS ) {
      //Adding styles directly to the page.
      var css = document.createElement('style');
      css.type = 'text/css';
      if (css.styleSheet) {
        css.styleSheet.cssText = styleCSS;
      } else {
        css.appendChild(document.createTextNode(styleCSS));
      }
      document.getElementsByTagName( 'head' )[ 0 ].appendChild( css );
      _onCSSLoad();
    } else {
      _onCSSLoad();
    }
  }

  /**
   * Take the JS file retuned from the API request and load it into the page.
   */
  function _loadJS() {
    if( _opts.shouldLoadJS ) {
      var asset = document.createElement( 'script' );
      asset.type = 'text/javascript';
      asset.src = _opts.baseURL + jsURL;
      asset.addEventListener( 'load', _onJSLoad );
      document.getElementsByTagName( 'head' )[ 0 ].appendChild( asset );
    }
  }

  /**
   * Look for a special css selector to determine if the CSS has loaded.
   */
  function _checkIfStyleheetIsLoaded() {
    var el  = document.createElement( 'nav' );
    el.classList.add( 'mvl_manifold' );
    document.getElementsByTagName( 'body' )[ 0 ].appendChild( el );
    var checks = 0;
    var check = window.setInterval(
      function() {
        if(
            // content string has quotes included in it for some reason. catching in case
            // that isn't true on other browsers
            getComputedStyle( el, ':before' ).content === '"gateway"' ||
            getComputedStyle( el, ':before' ).content === 'gateway' ||
            checks > 60
          ) {
          window.clearInterval( check );
          _onCSSLoad();
          document.getElementsByTagName( 'body' )[ 0 ].removeChild( el );
        }
        checks++;
      },
      10
    );
  }

  /**
   * Take the Nav and/or Fotter HTML from the API Response and append it to the
   * _opts.selectors.navTop (Nav) or _opts.selectors.navFtr (Footer) HTML elements
   * @return {[type]} [description]
   */
  function _appendNavigation() {
    if( navigationResponse ) {
      if( navigationResponse.nav ) {
        topContainer = document.querySelector( _opts.selectors.navTop );
        topContainer.style.opacity = 0;
        topContainer.style.height = '92px';
        topContainer.style.overflow = 'hidden';
        _setElHTML( topContainer, navigationResponse.nav );
      }
      if( navigationResponse.footer ) {
        ftrContainer = document.querySelector( _opts.selectors.navFtr );
        if(ftrContainer){
          ftrContainer.style.opacity = 0;
          _setElHTML( ftrContainer, navigationResponse.footer );
        }
      }
    }
  }

  /**
   * Append the supplied options to the request url
   * @param  {string} url The api request url
   * @param  {object} qsObj The options to add to the query string
   * @return {string} the Full API request Url
   */
  function _appendQueryStrings( url, qsObj ) {
    url += '?';
    var first = true;
    for( var key in qsObj ) {
      key = _fixedEncodeURIComponent( key );
      var value = _fixedEncodeURIComponent( qsObj[ key ] );
      if( !first ) {
        url += '&';
      }
      url += key + '=' + value;
      first = false;
    }
    return url;
  }

  /**
   * Encode url value
   * @param  {string|object} value The option to encode
   * @return {string} encoded option
   */
  function _fixedEncodeURIComponent( value ) {
    var type = typeof value;
    if( type === 'function' || type === 'object' ) {
      value = JSON.stringify( value );
    }
    return encodeURIComponent( value ).replace(
      /[!'()*]/g,
      function( c ) {
        return '%' + c.charCodeAt( 0 ).toString( 16 );
      }
    );
  }

  /**
   * Add the HTML to the passed element.
   * @param {HTMLElement} el Target element
   * @param {String} html The HTML to inject into the el
   */
  function _setElHTML( el, html ) {
    if( el && html ) {
      el.innerHTML = html;
    }
  };

  /**
   * onSuccess Callback for the API request. Kicks off the appending and loading of all needed files
   * and HTML.
   * @param  {Object} response API Response
   */
  function _onEndPointLoad(response) {
    navigationResponse = response;
    jsURL = response.js_script;
    cssURL = response.css_link;
    styleCSS = response.styles;
    userMenu = response.user_menu;
    _appendNavigation();
    _loadCSS();
    _loadJS();
  }

  /**
   * onSuccess Callback for when the CSS is loaded. The nav and footer come in invisible to prevent
   * any race condition based glitches between the HTML rendering and the CSS loading. Once the CSS
   * is loaded the Nav/Footer is revealed fully styled.
   * @return {[type]} [description]
   */
  function _onCSSLoad() {
    if (topContainer) {
      topContainer.style.transition = 'opacity 0.2s linear';
      topContainer.style.opacity = 1;
      topContainer.style.overflow = 'visible';
      topContainer.style.height = 'auto';
    }

    if (ftrContainer) {
      ftrContainer.style.transition = 'opacity 0.2s linear';
      ftrContainer.style.opacity = 1;
    }
  }

  /**
   * onLoad callback for the extra JS file.  This JS file contains all the scripts that will make the
   * Nav/Footer work. That script is initialized.
   */
  function _onJSLoad() {
    if (EdenFesi) {
      EdenFesi.init(userMenu);
    }
  }

  if (window.onMarvelNavigationWidget) {
    window.onMarvelNavigationWidget(api);
  }
  return api;
})();
