import { useRouter } from 'next/router';
import React from 'react';
/**
 * Synchronise multiple query string arguments to React state in Next.js
 *
 * @param keys - An object describing the keys to synchronise and how to
 *               serialise and parse them.
 *               Use `queryTypes.(string|integer|float)` for quick shorthands.
 */
export function useQueryStates(keys, { history = 'replace' } = {}) {
    const router = useRouter();
    // Memoizing the update function has the advantage of making it
    // immutable as long as `history` stays the same.
    // It reduces the amount of reactivity needed to update the state.
    const updateUrl = React.useMemo(() => (history === 'push' ? router.push : router.replace), [history]);
    const getValues = React.useCallback(() => {
        if (typeof window === 'undefined') {
            // Not available in an SSR context, return all null (or default if available)
            return Object.keys(keys).reduce((obj, key) => {
                const { defaultValue } = keys[key];
                return Object.assign(Object.assign({}, obj), { [key]: defaultValue !== null && defaultValue !== void 0 ? defaultValue : null });
            }, {});
        }
        const query = new URLSearchParams(window.location.search);
        return Object.keys(keys).reduce((values, key) => {
            var _a, _b;
            const { parse, defaultValue } = keys[key];
            const value = query.get(key);
            const parsed = value !== null
                ? (_b = (_a = parse(value)) !== null && _a !== void 0 ? _a : defaultValue) !== null && _b !== void 0 ? _b : null
                : defaultValue !== null && defaultValue !== void 0 ? defaultValue : null;
            return Object.assign(Object.assign({}, values), { [key]: parsed });
        }, {});
    }, [keys]);
    // Update the state values only when the relevant keys change.
    // Because we're not calling getValues in the function argument
    // of React.useMemo, but instead using it as the function to call,
    // there is no need to pass it in the dependency array.
    const values = React.useMemo(getValues, Object.keys(keys).map(key => router.query[key]));
    const update = React.useCallback((stateUpdater, transitionOptions) => {
        const isUpdaterFunction = (input) => {
            return typeof input === 'function';
        };
        // Resolve the new values based on old values & updater
        const oldValues = getValues();
        const newValues = isUpdaterFunction(stateUpdater)
            ? stateUpdater(oldValues)
            : stateUpdater;
        // We can't rely on router.query here to avoid causing
        // unnecessary renders when other query parameters change.
        // URLSearchParams is already polyfilled by Next.js
        const query = new URLSearchParams(window.location.search);
        Object.keys(newValues).forEach(key => {
            const newValue = newValues[key];
            if (newValue === null) {
                query.delete(key);
            }
            else if (newValue !== undefined) {
                const { serialize = String } = keys[key];
                query.set(key, serialize(newValue));
            }
        });
        const search = query.toString();
        const hash = window.location.hash;
        return updateUrl === null || updateUrl === void 0 ? void 0 : updateUrl.call(router, {
            pathname: router.pathname,
            hash,
            search
        }, {
            pathname: window.location.pathname.replace(router.basePath, ""),
            hash,
            search
        }, transitionOptions);
    }, [keys, updateUrl]);
    return [values, update];
}
