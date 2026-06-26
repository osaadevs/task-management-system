// FE-5: turn the backend's errors:[{ field, message }] (carried on the thrown
// Error as err.fieldErrors) into a { field: message } map for input-level display.
// Falls back to an empty map; callers still show err.message as the top-level alert.
export function fieldErrorMap(err) {
  const map = {};
  const list = err && err.fieldErrors;
  if (Array.isArray(list)) {
    for (const e of list) {
      if (e && e.field && !map[e.field]) map[e.field] = e.message;
    }
  }
  return map;
}
