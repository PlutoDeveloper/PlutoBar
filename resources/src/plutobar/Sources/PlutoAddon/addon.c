// Node-API surface of PlutoBar. Everything runs on Electron's main thread,
// which is also the AppKit main thread, so calls go straight through to Swift
// (Runtime.swift). The other way, the bar's actions (a query, Return on a
// result, ask, approve…) reach JS through a thread-safe function as JSON.
#include <stdbool.h>
#include <stdlib.h>
#include <string.h>
#include "node_api.h"

extern void plutobar_start(void);
extern void plutobar_show(const char *json);
extern void plutobar_hide(void);
extern bool plutobar_is_visible(void);
extern void plutobar_results(const char *json);
extern void plutobar_agent_event(const char *json);
extern void plutobar_state(const char *json);

static napi_threadsafe_function action_fn = NULL;

static void call_action(napi_env env, napi_value js_cb, void *context, void *data) {
  char *json = data;
  if (env && js_cb) {
    napi_value undefined, arg;
    napi_get_undefined(env, &undefined);
    napi_create_string_utf8(env, json, NAPI_AUTO_LENGTH, &arg);
    napi_call_function(env, undefined, js_cb, 1, &arg, NULL);
  }
  free(json);
}

// Called from Swift: hands one action (JSON) to the JS callback.
void plutobar_emit_action(const char *json) {
  if (!action_fn || !json) return;
  char *copy = strdup(json);
  if (napi_call_threadsafe_function(action_fn, copy, napi_tsfn_nonblocking) != napi_ok) free(copy);
}

static char *string_arg(napi_env env, napi_callback_info info) {
  size_t argc = 1, len = 0;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  if (argc < 1 || napi_get_value_string_utf8(env, argv[0], NULL, 0, &len) != napi_ok) return NULL;
  char *s = malloc(len + 1);
  napi_get_value_string_utf8(env, argv[0], s, len + 1, &len);
  return s;
}

#define VOID_FN(name, fn)                                         \
  static napi_value name(napi_env env, napi_callback_info info) { \
    fn();                                                         \
    return NULL;                                                  \
  }
VOID_FN(Start, plutobar_start)
VOID_FN(Hide, plutobar_hide)

#define JSON_FN(name, fn)                                         \
  static napi_value name(napi_env env, napi_callback_info info) { \
    char *json = string_arg(env, info);                           \
    fn(json ? json : "{}");                                       \
    free(json);                                                   \
    return NULL;                                                  \
  }
JSON_FN(Show, plutobar_show)
JSON_FN(Results, plutobar_results)
JSON_FN(AgentEvent, plutobar_agent_event)
JSON_FN(State, plutobar_state)

static napi_value IsVisible(napi_env env, napi_callback_info info) {
  napi_value result;
  napi_get_boolean(env, plutobar_is_visible(), &result);
  return result;
}

// onAction(callback(json)): where the bar's input goes.
static napi_value OnAction(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1], name;
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  if (argc < 1) return NULL;
  if (action_fn) {
    napi_release_threadsafe_function(action_fn, napi_tsfn_abort);
    action_fn = NULL;
  }
  napi_create_string_utf8(env, "plutobar-action", NAPI_AUTO_LENGTH, &name);
  napi_create_threadsafe_function(env, argv[0], NULL, name, 0, 1, NULL, NULL, NULL, call_action, &action_fn);
  napi_unref_threadsafe_function(env, action_fn);
  return NULL;
}

NAPI_MODULE_INIT() {
  napi_property_descriptor props[] = {
    {"start", NULL, Start, NULL, NULL, NULL, napi_default, NULL},
    {"show", NULL, Show, NULL, NULL, NULL, napi_default, NULL},
    {"hide", NULL, Hide, NULL, NULL, NULL, napi_default, NULL},
    {"isVisible", NULL, IsVisible, NULL, NULL, NULL, napi_default, NULL},
    {"results", NULL, Results, NULL, NULL, NULL, napi_default, NULL},
    {"agentEvent", NULL, AgentEvent, NULL, NULL, NULL, napi_default, NULL},
    {"state", NULL, State, NULL, NULL, NULL, napi_default, NULL},
    {"onAction", NULL, OnAction, NULL, NULL, NULL, napi_default, NULL},
  };
  napi_define_properties(env, exports, sizeof(props) / sizeof(props[0]), props);
  return exports;
}
