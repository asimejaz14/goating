// eslint-config-next ships native flat configs from v16, so they are spread in
// directly — the FlatCompat shim chokes on the plugin object's circular refs.
import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

export default [
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // Every form in the portal lives inside a <Modal> and resets its fields
      // from props when `open` flips — that is a deliberate effect, not a bug.
      // The rule's two suggested alternatives both break the modal's 260ms exit
      // animation: mounting the body conditionally empties the panel mid-fade,
      // and re-keying it wipes the fields mid-fade. Adjusting state during
      // render is blocked by this plugin's `set-state-in-render` rule, so the
      // effect stays and the rule comes off.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
];
