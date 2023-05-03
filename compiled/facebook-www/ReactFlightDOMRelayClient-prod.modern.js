/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @noflow
 * @nolint
 * @preventMunge
 * @preserve-invariant-messages
 */

"use strict";
var ReactFlightDOMRelayClientIntegration = require("ReactFlightDOMRelayClientIntegration"),
  ReactDOM = require("react-dom"),
  React = require("react");
function formatProdErrorMessage(code) {
  for (
    var url = "https://reactjs.org/docs/error-decoder.html?invariant=" + code,
      i = 1;
    i < arguments.length;
    i++
  )
    url += "&args[]=" + encodeURIComponent(arguments[i]);
  return (
    "Minified React error #" +
    code +
    "; visit " +
    url +
    " for the full message or use the non-minified dev environment for full errors and additional helpful warnings."
  );
}
var isArrayImpl = Array.isArray;
function parseModelRecursively(response, parentObj, key, value) {
  if ("string" === typeof value)
    return parseModelString(response, parentObj, key, value);
  if ("object" === typeof value && null !== value) {
    if (isArrayImpl(value)) {
      var parsedValue = [];
      for (parentObj = 0; parentObj < value.length; parentObj++)
        parsedValue[parentObj] = parseModelRecursively(
          response,
          value,
          "" + parentObj,
          value[parentObj]
        );
      response =
        parsedValue[0] === REACT_ELEMENT_TYPE
          ? {
              $$typeof: REACT_ELEMENT_TYPE,
              type: parsedValue[1],
              key: parsedValue[2],
              ref: null,
              props: parsedValue[3],
              _owner: null
            }
          : parsedValue;
      return response;
    }
    parentObj = {};
    for (parsedValue in value)
      parentObj[parsedValue] = parseModelRecursively(
        response,
        value,
        parsedValue,
        value[parsedValue]
      );
    return parentObj;
  }
  return value;
}
var dummy = {},
  ReactDOMCurrentDispatcher =
    ReactDOM.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.Dispatcher,
  REACT_ELEMENT_TYPE = Symbol.for("react.element"),
  REACT_LAZY_TYPE = Symbol.for("react.lazy"),
  REACT_SERVER_CONTEXT_DEFAULT_VALUE_NOT_LOADED = Symbol.for(
    "react.default_value"
  ),
  MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
function getIteratorFn(maybeIterable) {
  if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
  maybeIterable =
    (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
    maybeIterable["@@iterator"];
  return "function" === typeof maybeIterable ? maybeIterable : null;
}
var knownServerReferences = new WeakMap();
function serializeNumber(number) {
  return Number.isFinite(number)
    ? 0 === number && -Infinity === 1 / number
      ? "$-0"
      : number
    : Infinity === number
    ? "$Infinity"
    : -Infinity === number
    ? "$-Infinity"
    : "$NaN";
}
function processReply(root, formFieldPrefix, resolve, reject) {
  function resolveToJSON(key, value) {
    if (null === value) return null;
    if ("object" === typeof value) {
      if ("function" === typeof value.then) {
        null === formData && (formData = new FormData());
        pendingParts++;
        var promiseId = nextPartId++;
        value.then(
          function (partValue) {
            partValue = JSON.stringify(partValue, resolveToJSON);
            var data = formData;
            data.append(formFieldPrefix + promiseId, partValue);
            pendingParts--;
            0 === pendingParts && resolve(data);
          },
          function (reason) {
            reject(reason);
          }
        );
        return "$@" + promiseId.toString(16);
      }
      if (value instanceof FormData) {
        null === formData && (formData = new FormData());
        var data = formData;
        key = nextPartId++;
        var prefix = formFieldPrefix + key + "_";
        value.forEach(function (originalValue, originalKey) {
          data.append(prefix + originalKey, originalValue);
        });
        return "$K" + key.toString(16);
      }
      return !isArrayImpl(value) && getIteratorFn(value)
        ? Array.from(value)
        : value;
    }
    if ("string" === typeof value) {
      if ("Z" === value[value.length - 1] && this[key] instanceof Date)
        return "$D" + value;
      value = "$" === value[0] ? "$" + value : value;
      return value;
    }
    if ("boolean" === typeof value) return value;
    if ("number" === typeof value) return serializeNumber(value);
    if ("undefined" === typeof value) return "$undefined";
    if ("function" === typeof value) {
      value = knownServerReferences.get(value);
      if (void 0 !== value)
        return (
          (value = JSON.stringify(value, resolveToJSON)),
          null === formData && (formData = new FormData()),
          (key = nextPartId++),
          formData.set(formFieldPrefix + key, value),
          "$F" + key.toString(16)
        );
      throw Error(formatProdErrorMessage(469));
    }
    if ("symbol" === typeof value) {
      key = value.description;
      if (Symbol.for(key) !== value)
        throw Error(formatProdErrorMessage(470, value.description));
      return "$S" + key;
    }
    if ("bigint" === typeof value) return "$n" + value.toString(10);
    throw Error(formatProdErrorMessage(472, typeof value));
  }
  var nextPartId = 1,
    pendingParts = 0,
    formData = null;
  root = JSON.stringify(root, resolveToJSON);
  null === formData
    ? resolve(root)
    : (formData.set(formFieldPrefix + "0", root),
      0 === pendingParts && resolve(formData));
}
var boundCache = new WeakMap();
function encodeFormData(reference) {
  var resolve,
    reject,
    thenable = new Promise(function (res, rej) {
      resolve = res;
      reject = rej;
    });
  processReply(
    reference,
    "",
    function (body) {
      if ("string" === typeof body) {
        var data = new FormData();
        data.append("0", body);
        body = data;
      }
      thenable.status = "fulfilled";
      thenable.value = body;
      resolve(body);
    },
    function (e) {
      thenable.status = "rejected";
      thenable.reason = e;
      reject(e);
    }
  );
  return thenable;
}
function encodeFormAction(identifierPrefix) {
  var reference = knownServerReferences.get(this);
  if (!reference) throw Error(formatProdErrorMessage(481));
  var data = null;
  if (null !== reference.bound) {
    data = boundCache.get(reference);
    data ||
      ((data = encodeFormData(reference)), boundCache.set(reference, data));
    if ("rejected" === data.status) throw data.reason;
    if ("fulfilled" !== data.status) throw data;
    reference = data.value;
    var prefixedData = new FormData();
    reference.forEach(function (value, key) {
      prefixedData.append("$ACTION_" + identifierPrefix + ":" + key, value);
    });
    data = prefixedData;
    reference = "$ACTION_REF_" + identifierPrefix;
  } else reference = "$ACTION_ID_" + reference.id;
  return {
    name: reference,
    method: "POST",
    encType: "multipart/form-data",
    data: data
  };
}
var ContextRegistry =
  React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ContextRegistry;
function Chunk(status, value, reason, response) {
  this.status = status;
  this.value = value;
  this.reason = reason;
  this._response = response;
}
Chunk.prototype = Object.create(Promise.prototype);
Chunk.prototype.then = function (resolve, reject) {
  switch (this.status) {
    case "resolved_model":
      initializeModelChunk(this);
      break;
    case "resolved_module":
      initializeModuleChunk(this);
  }
  switch (this.status) {
    case "fulfilled":
      resolve(this.value);
      break;
    case "pending":
    case "blocked":
      resolve &&
        (null === this.value && (this.value = []), this.value.push(resolve));
      reject &&
        (null === this.reason && (this.reason = []), this.reason.push(reject));
      break;
    default:
      reject(this.reason);
  }
};
function readChunk(chunk) {
  switch (chunk.status) {
    case "resolved_model":
      initializeModelChunk(chunk);
      break;
    case "resolved_module":
      initializeModuleChunk(chunk);
  }
  switch (chunk.status) {
    case "fulfilled":
      return chunk.value;
    case "pending":
    case "blocked":
      throw chunk;
    default:
      throw chunk.reason;
  }
}
function wakeChunk(listeners, value) {
  for (var i = 0; i < listeners.length; i++) (0, listeners[i])(value);
}
function wakeChunkIfInitialized(chunk, resolveListeners, rejectListeners) {
  switch (chunk.status) {
    case "fulfilled":
      wakeChunk(resolveListeners, chunk.value);
      break;
    case "pending":
    case "blocked":
      chunk.value = resolveListeners;
      chunk.reason = rejectListeners;
      break;
    case "rejected":
      rejectListeners && wakeChunk(rejectListeners, chunk.reason);
  }
}
function triggerErrorOnChunk(chunk, error) {
  if ("pending" === chunk.status || "blocked" === chunk.status) {
    var listeners = chunk.reason;
    chunk.status = "rejected";
    chunk.reason = error;
    null !== listeners && wakeChunk(listeners, error);
  }
}
function resolveModuleChunk(chunk, value) {
  if ("pending" === chunk.status || "blocked" === chunk.status) {
    var resolveListeners = chunk.value,
      rejectListeners = chunk.reason;
    chunk.status = "resolved_module";
    chunk.value = value;
    null !== resolveListeners &&
      (initializeModuleChunk(chunk),
      wakeChunkIfInitialized(chunk, resolveListeners, rejectListeners));
  }
}
var initializingChunk = null,
  initializingChunkBlockedModel = null;
function initializeModelChunk(chunk) {
  var prevChunk = initializingChunk,
    prevBlocked = initializingChunkBlockedModel;
  initializingChunk = chunk;
  initializingChunkBlockedModel = null;
  try {
    var value = parseModelRecursively(chunk._response, dummy, "", chunk.value);
    null !== initializingChunkBlockedModel &&
    0 < initializingChunkBlockedModel.deps
      ? ((initializingChunkBlockedModel.value = value),
        (chunk.status = "blocked"),
        (chunk.value = null),
        (chunk.reason = null))
      : ((chunk.status = "fulfilled"), (chunk.value = value));
  } catch (error) {
    (chunk.status = "rejected"), (chunk.reason = error);
  } finally {
    (initializingChunk = prevChunk),
      (initializingChunkBlockedModel = prevBlocked);
  }
}
function initializeModuleChunk(chunk) {
  try {
    var value = ReactFlightDOMRelayClientIntegration.requireModule(chunk.value);
    chunk.status = "fulfilled";
    chunk.value = value;
  } catch (error) {
    (chunk.status = "rejected"), (chunk.reason = error);
  }
}
function reportGlobalError(response, error) {
  response._chunks.forEach(function (chunk) {
    "pending" === chunk.status && triggerErrorOnChunk(chunk, error);
  });
}
function getChunk(response, id) {
  var chunks = response._chunks,
    chunk = chunks.get(id);
  chunk ||
    ((chunk = new Chunk("pending", null, null, response)),
    chunks.set(id, chunk));
  return chunk;
}
function createModelResolver(chunk, parentObject, key) {
  if (initializingChunkBlockedModel) {
    var blocked = initializingChunkBlockedModel;
    blocked.deps++;
  } else blocked = initializingChunkBlockedModel = { deps: 1, value: null };
  return function (value) {
    parentObject[key] = value;
    blocked.deps--;
    0 === blocked.deps &&
      "blocked" === chunk.status &&
      ((value = chunk.value),
      (chunk.status = "fulfilled"),
      (chunk.value = blocked.value),
      null !== value && wakeChunk(value, blocked.value));
  };
}
function createModelReject(chunk) {
  return function (error) {
    return triggerErrorOnChunk(chunk, error);
  };
}
function createServerReferenceProxy(response, metaData) {
  function proxy() {
    var args = Array.prototype.slice.call(arguments),
      p = metaData.bound;
    return p
      ? "fulfilled" === p.status
        ? callServer(metaData.id, p.value.concat(args))
        : Promise.resolve(p).then(function (bound) {
            return callServer(metaData.id, bound.concat(args));
          })
      : callServer(metaData.id, args);
  }
  var callServer = response._callServer;
  proxy.$$FORM_ACTION = encodeFormAction;
  knownServerReferences.set(proxy, metaData);
  return proxy;
}
function parseModelString(response, parentObject, key, value) {
  if ("$" === value[0]) {
    if ("$" === value) return REACT_ELEMENT_TYPE;
    switch (value[1]) {
      case "$":
        return value.slice(1);
      case "L":
        return (
          (parentObject = parseInt(value.slice(2), 16)),
          (response = getChunk(response, parentObject)),
          { $$typeof: REACT_LAZY_TYPE, _payload: response, _init: readChunk }
        );
      case "@":
        return (
          (parentObject = parseInt(value.slice(2), 16)),
          getChunk(response, parentObject)
        );
      case "S":
        return Symbol.for(value.slice(2));
      case "P":
        return (
          (response = value.slice(2)),
          ContextRegistry[response] ||
            (ContextRegistry[response] = React.createServerContext(
              response,
              REACT_SERVER_CONTEXT_DEFAULT_VALUE_NOT_LOADED
            )),
          ContextRegistry[response].Provider
        );
      case "F":
        parentObject = parseInt(value.slice(2), 16);
        parentObject = getChunk(response, parentObject);
        switch (parentObject.status) {
          case "resolved_model":
            initializeModelChunk(parentObject);
        }
        switch (parentObject.status) {
          case "fulfilled":
            return createServerReferenceProxy(response, parentObject.value);
          default:
            throw parentObject.reason;
        }
      case "I":
        return Infinity;
      case "-":
        return "$-0" === value ? -0 : -Infinity;
      case "N":
        return NaN;
      case "u":
        return;
      case "D":
        return new Date(Date.parse(value.slice(2)));
      case "n":
        return BigInt(value.slice(2));
      default:
        value = parseInt(value.slice(1), 16);
        response = getChunk(response, value);
        switch (response.status) {
          case "resolved_model":
            initializeModelChunk(response);
            break;
          case "resolved_module":
            initializeModuleChunk(response);
        }
        switch (response.status) {
          case "fulfilled":
            return response.value;
          case "pending":
          case "blocked":
            return (
              (value = initializingChunk),
              response.then(
                createModelResolver(value, parentObject, key),
                createModelReject(value)
              ),
              null
            );
          default:
            throw response.reason;
        }
    }
  }
  return value;
}
function missingCall() {
  throw Error(formatProdErrorMessage(466));
}
function resolveModule(response, id, model) {
  var chunks = response._chunks,
    chunk = chunks.get(id);
  model = parseModelRecursively(response, dummy, "", model);
  var clientReference =
    ReactFlightDOMRelayClientIntegration.resolveClientReference(model);
  if (
    (model =
      ReactFlightDOMRelayClientIntegration.preloadModule(clientReference))
  ) {
    if (chunk) {
      var blockedChunk = chunk;
      blockedChunk.status = "blocked";
    } else
      (blockedChunk = new Chunk("blocked", null, null, response)),
        chunks.set(id, blockedChunk);
    model.then(
      function () {
        return resolveModuleChunk(blockedChunk, clientReference);
      },
      function (error) {
        return triggerErrorOnChunk(blockedChunk, error);
      }
    );
  } else
    chunk
      ? resolveModuleChunk(chunk, clientReference)
      : chunks.set(
          id,
          new Chunk("resolved_module", clientReference, null, response)
        );
}
exports.close = function (response) {
  reportGlobalError(response, Error(formatProdErrorMessage(412)));
};
exports.createResponse = function (bundlerConfig, callServer) {
  var chunks = new Map();
  return {
    _bundlerConfig: bundlerConfig,
    _callServer: void 0 !== callServer ? callServer : missingCall,
    _chunks: chunks
  };
};
exports.getRoot = function (response) {
  return getChunk(response, 0);
};
exports.resolveRow = function (response, chunk$jscomp$0) {
  if ("O" === chunk$jscomp$0[0]) {
    var id = chunk$jscomp$0[1],
      model = chunk$jscomp$0[2];
    chunk$jscomp$0 = response._chunks;
    var chunk = chunk$jscomp$0.get(id);
    chunk
      ? "pending" === chunk.status &&
        ((response = chunk.value),
        (chunk$jscomp$0 = chunk.reason),
        (chunk.status = "resolved_model"),
        (chunk.value = model),
        null !== response &&
          (initializeModelChunk(chunk),
          wakeChunkIfInitialized(chunk, response, chunk$jscomp$0)))
      : chunk$jscomp$0.set(
          id,
          new Chunk("resolved_model", model, null, response)
        );
  } else if ("I" === chunk$jscomp$0[0])
    resolveModule(response, chunk$jscomp$0[1], chunk$jscomp$0[2]);
  else if ("H" === chunk$jscomp$0[0]) {
    if (
      ((model = chunk$jscomp$0[1]),
      (response = parseModelRecursively(
        response,
        dummy,
        "",
        chunk$jscomp$0[2]
      )),
      (chunk$jscomp$0 = ReactDOMCurrentDispatcher.current))
    )
      switch (
        ("string" === typeof response
          ? (id = response)
          : ((id = response[0]), (chunk = response[1])),
        model)
      ) {
        case "D":
          chunk$jscomp$0.prefetchDNS(id, chunk);
          break;
        case "C":
          chunk$jscomp$0.preconnect(id, chunk);
          break;
        case "L":
          chunk$jscomp$0.preload(id, chunk);
          break;
        case "I":
          chunk$jscomp$0.preinit(id, chunk);
      }
  } else
    (model = chunk$jscomp$0[1]),
      (chunk$jscomp$0 = chunk$jscomp$0[2].digest),
      (chunk = Error(formatProdErrorMessage(441))),
      (chunk.stack = "Error: " + chunk.message),
      (chunk.digest = chunk$jscomp$0),
      (chunk$jscomp$0 = response._chunks),
      (id = chunk$jscomp$0.get(model))
        ? triggerErrorOnChunk(id, chunk)
        : chunk$jscomp$0.set(
            model,
            new Chunk("rejected", null, chunk, response)
          );
};
